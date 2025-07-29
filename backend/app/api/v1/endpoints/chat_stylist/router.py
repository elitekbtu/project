from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from .service import (
    get_stylist_reply, 
    reset_stylist_conversation, 
    get_conversation_stats,
    get_conversation_summary,
    get_performance_metrics,
    cleanup_old_contexts
)
from app.core.security import get_current_user
from app.db.models.user import User

router = APIRouter(prefix="/chat-stylist", tags=["chat-stylist"])

# Модели запросов
class ChatRequest(BaseModel):
    message: str

class ResetRequest(BaseModel):
    user_id: Optional[int] = None

class CleanupRequest(BaseModel):
    max_age_hours: int = 24

# Модели ответов
class ChatResponse(BaseModel):
    reply: str
    items: List[Dict[str, Any]]
    intent_type: Optional[str] = None
    confidence: Optional[float] = None
    processing_time: Optional[float] = None

class ResetResponse(BaseModel):
    message: str
    user_id: Optional[int] = None

class StatsResponse(BaseModel):
    stats: Dict[str, Any]

class SummaryResponse(BaseModel):
    summary: Dict[str, Any]

class PerformanceResponse(BaseModel):
    metrics: Dict[str, Any]

class CleanupResponse(BaseModel):
    message: str
    cleaned_count: Optional[int] = None

@router.post("/", response_model=ChatResponse)
async def chat_stylist(request: ChatRequest, user: User = Depends(get_current_user)):
    """
    Основной эндпоинт для общения с ИИ-стилистом через цепочку агентов
    
    Обрабатывает сообщение пользователя через полную цепочку ИИ агентов:
    1. IntentRecognitionAgent - анализирует намерения
    2. ContextAnalysisAgent - анализирует контекст
    3. UserBehaviorAgent - анализирует поведение
    4. ResponseGenerationAgent - генерирует ответы
    5. StyleAgent - работает с товарами
    """
    try:
        reply, items = await get_stylist_reply(request.message, user)
        
        # Получаем дополнительную информацию о контексте
        stats = get_conversation_stats(user.id)
        
        return ChatResponse(
            reply=reply,
            items=items,
            intent_type=stats.get('current_state'),
            confidence=stats.get('confidence', 1.0),
            processing_time=stats.get('processing_time')
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка обработки запроса: {str(e)}")

@router.post("/reset", response_model=ResetResponse)
async def reset_conversation(
    request: ResetRequest = ResetRequest(), 
    user: User = Depends(get_current_user)
):
    """
    Сбрасывает состояние диалога для пользователя
    
    Args:
        request: Запрос с опциональным user_id (если не указан, сбрасывает для текущего пользователя)
    """
    try:
        user_id = request.user_id or user.id
        reset_stylist_conversation(user_id)
        return ResetResponse(
            message="Диалог успешно сброшен. Начните новый разговор!",
            user_id=user_id
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка сброса диалога: {str(e)}")

@router.get("/stats", response_model=StatsResponse)
async def get_stats(
    user_id: Optional[int] = Query(None, description="ID пользователя (если не указан, возвращает общую статистику системы"),
    user: User = Depends(get_current_user)
):
    """
    Получает статистику разговора
    
    Args:
        user_id: ID пользователя (если не указан, возвращает общую статистику системы)
    """
    try:
        # Если user_id не указан, используем ID текущего пользователя
        target_user_id = user_id or user.id
        stats = get_conversation_stats(target_user_id)
        return StatsResponse(stats=stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения статистики: {str(e)}")

@router.get("/summary/{user_id}", response_model=SummaryResponse)
async def get_summary(
    user_id: int,
    user: User = Depends(get_current_user)
):
    """
    Получает сводку разговора для указанного пользователя
    
    Args:
        user_id: ID пользователя для получения сводки
    """
    try:
        # Проверяем права доступа (можно добавить проверку на админа)
        if user.id != user_id and not user.is_superuser:
            raise HTTPException(status_code=403, detail="Нет прав для просмотра сводки другого пользователя")
        
        summary = get_conversation_summary(user_id)
        return SummaryResponse(summary=summary)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения сводки: {str(e)}")

@router.get("/performance", response_model=PerformanceResponse)
async def get_performance(user: User = Depends(get_current_user)):
    """
    Получает метрики производительности системы
    
    Требует права администратора
    """
    try:
        # Проверяем права администратора
        if not user.is_superuser:
            raise HTTPException(status_code=403, detail="Требуются права администратора")
        
        metrics = get_performance_metrics()
        return PerformanceResponse(metrics=metrics)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка получения метрик: {str(e)}")

@router.post("/cleanup", response_model=CleanupResponse)
async def cleanup_contexts(
    request: CleanupRequest = CleanupRequest(),
    user: User = Depends(get_current_user)
):
    """
    Очищает старые контексты разговоров
    
    Args:
        request: Запрос с максимальным возрастом контекста в часах
    
    Требует права администратора
    """
    try:
        # Проверяем права администратора
        if not user.is_superuser:
            raise HTTPException(status_code=403, detail="Требуются права администратора")
        
        cleanup_old_contexts(request.max_age_hours)
        return CleanupResponse(
            message=f"Контексты старше {request.max_age_hours} часов очищены",
            cleaned_count=None  # Можно добавить подсчет очищенных контекстов
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка очистки контекстов: {str(e)}")

@router.get("/health")
async def health_check():
    """
    Проверка здоровья системы агентов
    """
    try:
        # Получаем базовую статистику системы
        stats = get_conversation_stats()
        
        # Проверяем, что система работает
        if 'error' in stats:
            raise HTTPException(status_code=503, detail="Система агентов недоступна")
        
        return {
            "status": "healthy",
            "system_stats": stats,
            "message": "Цепочка ИИ агентов работает корректно"
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Система агентов недоступна: {str(e)}")

# Легаси эндпоинт для обратной совместимости
@router.post("/legacy", response_model=ChatResponse)
async def chat_stylist_legacy(request: ChatRequest, user: User = Depends(get_current_user)):
    """
    Легаси эндпоинт для обратной совместимости
    
    Использует старую логику обработки
    """
    try:
        reply, items = await get_stylist_reply(request.message, user)
        return ChatResponse(
            reply=reply,
            items=items,
            intent_type="legacy",
            confidence=1.0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка обработки запроса: {str(e)}") 