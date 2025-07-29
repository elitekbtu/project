#!/usr/bin/env python3
"""
Тестовый скрипт для проверки работы ConversationManager
"""

import asyncio
import sys
import os

# Добавляем путь к модулям
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.agents.conversation_manager import ConversationManager

async def test_conversation_manager():
    """Тестирует основные функции ConversationManager"""
    
    print("🚀 Запуск тестирования ConversationManager...")
    
    # Создаем экземпляр менеджера
    manager = ConversationManager()
    
    # Тест 1: Обработка приветствия
    print("\n📝 Тест 1: Обработка приветствия")
    response1 = await manager.process_message("Привет! Как дела?", user_id=1)
    print(f"Ответ: {response1['reply']}")
    print(f"Намерение: {response1['intent']}")
    print(f"Уверенность: {response1['confidence']:.2f}")
    
    # Тест 2: Запрос товаров
    print("\n📝 Тест 2: Запрос товаров")
    response2 = await manager.process_message("Покажи мне футболки", user_id=1)
    print(f"Ответ: {response2['reply']}")
    print(f"Намерение: {response2['intent']}")
    print(f"Товары найдено: {len(response2['items'])}")
    
    # Тест 3: Получение статистики
    print("\n📊 Тест 3: Статистика системы")
    stats = manager.get_system_stats()
    print(f"Всего разговоров: {stats['total_conversations']}")
    print(f"Успешных: {stats['successful_conversations']}")
    print(f"Активных контекстов: {stats['active_contexts']}")
    
    # Тест 4: Сводка разговора
    print("\n📋 Тест 4: Сводка разговора")
    summary = manager.get_conversation_summary(1)
    print(f"Количество взаимодействий: {summary['interaction_count']}")
    print(f"Текущее состояние: {summary['current_state']}")
    print(f"Поток разговора: {summary['conversation_flow']}")
    
    # Тест 5: Метрики производительности
    print("\n⚡ Тест 5: Метрики производительности")
    metrics = manager.get_performance_metrics()
    print(f"Общий успех: {metrics['overall_success_rate']:.2%}")
    print(f"Среднее время ответа: {metrics['average_response_time']:.2f}с")
    print(f"Состояние системы: {metrics['system_health']['uptime_metric']}")
    
    # Тест 6: Экспорт данных
    print("\n💾 Тест 6: Экспорт данных")
    export_data = manager.export_conversation_data(1)
    print(f"Тип экспорта: {export_data['export_type']}")
    print(f"Временная метка: {export_data['export_timestamp']}")
    
    print("\n✅ Тестирование завершено успешно!")

async def test_error_handling():
    """Тестирует обработку ошибок"""
    
    print("\n🔧 Тестирование обработки ошибок...")
    
    manager = ConversationManager()
    
    # Тест с пустым сообщением
    print("\n📝 Тест с пустым сообщением")
    response = await manager.process_message("", user_id=2)
    print(f"Успех: {response['success']}")
    print(f"Ответ: {response['reply'][:50]}...")
    
    # Тест с очень длинным сообщением
    print("\n📝 Тест с длинным сообщением")
    long_message = "Это очень длинное сообщение " * 100
    response = await manager.process_message(long_message, user_id=2)
    print(f"Успех: {response['success']}")
    
    print("\n✅ Тестирование обработки ошибок завершено!")

async def test_multiple_users():
    """Тестирует работу с несколькими пользователями"""
    
    print("\n👥 Тестирование работы с несколькими пользователями...")
    
    manager = ConversationManager()
    
    # Создаем несколько пользователей
    users = [10, 20, 30]
    messages = [
        "Привет!",
        "Покажи футболки",
        "До свидания!"
    ]
    
    for user_id in users:
        print(f"\n👤 Пользователь {user_id}:")
        for message in messages:
            response = await manager.process_message(message, user_id=user_id)
            print(f"  '{message}' -> {response['intent']}")
    
    # Проверяем статистику
    stats = manager.get_system_stats()
    print(f"\n📊 Активных контекстов: {stats['active_contexts']}")
    
    # Очищаем контексты
    manager.reset_user_context()
    stats_after = manager.get_system_stats()
    print(f"📊 После очистки: {stats_after['active_contexts']}")
    
    print("\n✅ Тестирование множественных пользователей завершено!")

async def main():
    """Основная функция тестирования"""
    
    print("🧪 Начинаем комплексное тестирование ConversationManager")
    print("=" * 60)
    
    try:
        await test_conversation_manager()
        await test_error_handling()
        await test_multiple_users()
        
        print("\n" + "=" * 60)
        print("🎉 Все тесты прошли успешно!")
        
    except Exception as e:
        print(f"\n❌ Ошибка во время тестирования: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main()) 