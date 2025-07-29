#!/usr/bin/env python3
"""
Тест интеграции StyleAgent с ConversationManager
"""

import asyncio
import sys
import os
from unittest.mock import Mock, AsyncMock

# Добавляем путь к модулям
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

async def test_style_agent_integration():
    """Тестирует интеграцию StyleAgent с архитектурой агентов"""
    
    print("🧪 Тестирование интеграции StyleAgent...")
    
    try:
        # Импортируем необходимые классы
        from app.agents.style_agent import StyleAgent
        from app.agents.base_agent import AgentResult, ConversationContext, UserContext
        
        print("✅ Импорт модулей успешен")
        
        # Создаем экземпляр StyleAgent
        style_agent = StyleAgent()
        print("✅ StyleAgent создан успешно")
        
        # Проверяем наследование от BaseAgent
        from app.agents.base_agent import BaseAgent
        assert isinstance(style_agent, BaseAgent), "StyleAgent должен наследовать от BaseAgent"
        print("✅ Наследование от BaseAgent корректно")
        
        # Проверяем наличие необходимых методов
        assert hasattr(style_agent, 'process'), "StyleAgent должен иметь метод process()"
        assert hasattr(style_agent, 'handle_style_request'), "StyleAgent должен иметь метод handle_style_request()"
        assert hasattr(style_agent, 'get_stats'), "StyleAgent должен иметь метод get_stats()"
        print("✅ Все необходимые методы присутствуют")
        
        # Создаем мок данные для тестирования
        mock_input_data = {
            'message': 'Покажи футболки',
            'user_id': 1,
            'user_profile': None,
            'db': None  # Будет мок
        }
        
        mock_context = ConversationContext(
            user_context=UserContext(user_id=1),
            current_state='product_search'
        )
        
        print("✅ Мок данные созданы")
        
        # Тестируем метод process() с мок базой данных
        mock_db = Mock()
        mock_input_data['db'] = mock_db
        
        # Мокаем результат поиска
        mock_items = [
            Mock(id=1, name="Футболка Nike", price=5000, brand="Nike", color="Черный"),
            Mock(id=2, name="Футболка Adidas", price=4500, brand="Adidas", color="Белый")
        ]
        
        # Мокаем метод _handle_style_request
        style_agent._handle_style_request = AsyncMock(return_value={
            'items': mock_items,
            'reply': 'Вот что нашла для вас!'
        })
        
        # Вызываем метод process()
        result = await style_agent.process(mock_input_data, mock_context)
        
        # Проверяем результат
        assert isinstance(result, AgentResult), "Результат должен быть AgentResult"
        assert result.success, "Результат должен быть успешным"
        assert 'items' in result.data, "В данных должны быть товары"
        assert 'response' in result.data, "В данных должен быть ответ"
        
        print("✅ Метод process() работает корректно")
        
        # Тестируем метод get_stats()
        stats = style_agent.get_stats()
        assert isinstance(stats, dict), "Статистика должна быть словарем"
        assert 'requests_processed' in stats, "В статистике должно быть количество запросов"
        
        print("✅ Метод get_stats() работает корректно")
        
        # Тестируем публичный метод handle_style_request()
        result = await style_agent.handle_style_request(mock_db, "Покажи джинсы")
        assert isinstance(result, dict), "Результат должен быть словарем"
        assert 'items' in result, "В результате должны быть товары"
        
        print("✅ Метод handle_style_request() работает корректно")
        
        print("\n🎉 Все тесты интеграции StyleAgent прошли успешно!")
        
    except ImportError as e:
        print(f"❌ Ошибка импорта: {e}")
        print("Убедитесь, что все зависимости установлены")
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
        import traceback
        traceback.print_exc()

async def test_conversation_manager_integration():
    """Тестирует интеграцию с ConversationManager"""
    
    print("\n🧪 Тестирование интеграции с ConversationManager...")
    
    try:
        from app.agents.conversation_manager import ConversationManager
        
        # Создаем менеджер
        manager = ConversationManager()
        print("✅ ConversationManager создан")
        
        # Проверяем, что StyleAgent инициализирован
        assert hasattr(manager, 'style_agent'), "ConversationManager должен иметь style_agent"
        assert manager.style_agent is not None, "StyleAgent должен быть инициализирован"
        
        print("✅ StyleAgent интегрирован в ConversationManager")
        
        # Проверяем статистику системы
        stats = manager.get_system_stats()
        assert 'agent_stats' in stats, "В статистике должны быть данные агентов"
        assert 'style_agent' in stats['agent_stats'], "Должна быть статистика StyleAgent"
        
        print("✅ Статистика StyleAgent доступна")
        
        print("\n🎉 Интеграция с ConversationManager работает корректно!")
        
    except Exception as e:
        print(f"❌ Ошибка тестирования ConversationManager: {e}")
        import traceback
        traceback.print_exc()

async def main():
    """Основная функция тестирования"""
    
    print("🚀 Начинаем тестирование интеграции StyleAgent")
    print("=" * 60)
    
    await test_style_agent_integration()
    await test_conversation_manager_integration()
    
    print("\n" + "=" * 60)
    print("🎉 Все тесты интеграции завершены успешно!")

if __name__ == "__main__":
    asyncio.run(main()) 