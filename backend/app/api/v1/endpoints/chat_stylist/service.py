import asyncio
import logging
from typing import Dict, Any, List, Optional, Tuple
from app.agents.conversation_manager import ConversationManager
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from fastapi import Depends
from app.api.v1.endpoints.profile.schemas import ProfileOut
from app.db.models.item import Item

logger = logging.getLogger(__name__)

# Глобальный экземпляр ConversationManager
conversation_manager = ConversationManager()

async def get_stylist_reply(message: str, user, db: Session = None) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Получает ответ от цепочки ИИ агентов
    
    Args:
        message: Сообщение пользователя
        user: Объект пользователя
        db: Сессия базы данных
        
    Returns:
        Tuple[str, List[Dict]]: (ответ, список товаров)
    """
    if db is None:
        # Получить сессию вручную (sync для совместимости)
        from app.core.database import SessionLocal
        db = SessionLocal()
        close_db = True
    else:
        close_db = False
    
    try:
        logger.info(f"Обрабатываем сообщение пользователя {user.id}: '{message[:50]}...'")
        
        # Подготавливаем профиль пользователя
        profile = ProfileOut.from_orm(user) if user else None
        
        # Обрабатываем сообщение через цепочку агентов
        result = await conversation_manager.process_message(
            user_message=message,
            user_id=user.id if user else None,
            user_profile=profile,
            db=db
        )
        
        # Проверяем, что результат не None
        if result is None:
            logger.error("ConversationManager вернул None результат")
            return "Извините, произошла ошибка при обработке запроса. Попробуйте еще раз!", []
        
        # Извлекаем ответ и товары
        reply = result.get('reply', 'Извините, произошла ошибка при обработке запроса.')
        items_data = result.get('items', [])
        
        # Проверяем, что items_data это список
        if not isinstance(items_data, list):
            logger.warning(f"items_data не является списком: {type(items_data)}")
            items_data = []
        
        # Конвертируем товары в нужный формат
        items = []
        if items_data:
            items = []
            for item in items_data:
                # Проверяем, является ли item объектом базы данных или словарем
                if hasattr(item, 'id'):  # Объект базы данных
                    item_dict = {
                        "id": item.id,
                        "name": item.name,
                        "image_url": item.image_url,
                        "brand": item.brand,
                        "price": item.price,
                        "category": item.category,
                        "color": item.color,
                        "size": item.size,
                        "description": item.description
                    }
                elif isinstance(item, dict):  # Словарь
                    item_dict = {
                        "id": item.get('id'),
                        "name": item.get('name'),
                        "image_url": item.get('image_url'),
                        "brand": item.get('brand'),
                        "price": item.get('price'),
                        "category": item.get('category'),
                        "color": item.get('color'),
                        "size": item.get('size'),
                        "description": item.get('description')
                    }
                else:
                    logger.warning(f"Неизвестный тип товара: {type(item)}")
                    continue
                
                # Проверяем, что у товара есть обязательные поля
                if item_dict["id"] is not None and item_dict["name"]:
                    items.append(item_dict)
                else:
                    logger.warning(f"Товар пропущен из-за отсутствия обязательных полей: {item_dict}")
        
        # Логируем результат для отладки
        logger.info(f"Найдено {len(items)} товаров")
        logger.info(f"Ответ: {reply[:100]}...")
        
        # Добавляем дополнительную информацию в ответ
        if result.get('intent_type'):
            logger.info(f"Определено намерение: {result['intent_type']}")
        
        confidence = result.get('confidence')
        if confidence is not None:
            try:
                confidence_float = float(confidence)
                logger.info(f"Уверенность: {confidence_float:.2f}")
            except (ValueError, TypeError):
                logger.warning(f"Некорректное значение уверенности: {confidence}")
                confidence_float = 0.1
        else:
            confidence_float = 0.1
        
        return reply, items
        
    except Exception as e:
        logger.error(f"Ошибка в get_stylist_reply: {e}")
        error_reply = "Извините, произошла ошибка при обработке вашего запроса. Попробуйте еще раз или обратитесь к поддержке."
        return error_reply, []
    finally:
        if close_db:
            db.close()

def reset_stylist_conversation(user_id: Optional[int] = None):
    """
    Сбрасывает состояние диалога для пользователя
    
    Args:
        user_id: ID пользователя (если None, сбрасывает для всех)
    """
    try:
        conversation_manager.reset_user_context(user_id)
        logger.info(f"Состояние диалога сброшено для пользователя {user_id}")
    except Exception as e:
        logger.error(f"Ошибка при сбросе диалога: {e}")

def get_conversation_stats(user_id: Optional[int] = None) -> Dict[str, Any]:
    """
    Получает статистику разговора
    
    Args:
        user_id: ID пользователя
        
    Returns:
        Dict с статистикой
    """
    try:
        if user_id:
            context = conversation_manager.get_user_context(user_id)
            if context:
                return {
                    'user_id': user_id,
                    'interaction_count': context.user_context.interaction_count,
                    'current_state': context.current_state,
                    'conversation_duration': conversation_manager._calculate_conversation_duration(context),
                    'last_interaction': context.user_context.last_interaction.isoformat() if context.user_context.last_interaction else None
                }
            else:
                return {'user_id': user_id, 'error': 'Контекст не найден'}
        else:
            return conversation_manager.get_system_stats()
    except Exception as e:
        logger.error(f"Ошибка при получении статистики: {e}")
        return {'error': str(e)}

def get_conversation_summary(user_id: int) -> Dict[str, Any]:
    """
    Получает сводку разговора для пользователя
    
    Args:
        user_id: ID пользователя
        
    Returns:
        Dict со сводкой разговора
    """
    try:
        return conversation_manager.get_conversation_summary(user_id)
    except Exception as e:
        logger.error(f"Ошибка при получении сводки разговора: {e}")
        return {'error': str(e)}

def get_performance_metrics() -> Dict[str, Any]:
    """
    Получает метрики производительности системы
    
    Returns:
        Dict с метриками
    """
    try:
        return conversation_manager.get_performance_metrics()
    except Exception as e:
        logger.error(f"Ошибка при получении метрик производительности: {e}")
        return {'error': str(e)}

def cleanup_old_contexts(max_age_hours: int = 24):
    """
    Очищает старые контексты разговоров
    
    Args:
        max_age_hours: Максимальный возраст контекста в часах
    """
    try:
        conversation_manager.cleanup_old_contexts(max_age_hours)
        logger.info(f"Очищены контексты старше {max_age_hours} часов")
    except Exception as e:
        logger.error(f"Ошибка при очистке контекстов: {e}")

# Функция для обратной совместимости
async def get_stylist_reply_legacy(message: str, user, db: Session = None):
    """
    Легаси функция для обратной совместимости
    """
    return await get_stylist_reply(message, user, db) 