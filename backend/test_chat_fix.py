#!/usr/bin/env python3
"""
Тест исправлений в чате
"""

import asyncio
import sys
import os

# Добавляем путь к модулям
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

async def test_chat_fixes():
    """Тестирует исправления в чате"""
    
    print("🧪 Тестирование исправлений в чате...")
    
    try:
        from app.agents.style_agent import StyleAgent
        from app.api.v1.endpoints.profile.schemas import ProfileOut
        
        # Создаем экземпляр StyleAgent
        style_agent = StyleAgent()
        print("✅ StyleAgent создан")
        
        # Тестируем распознавание запросов товаров
        test_messages = [
            "привет",
            "что можно одеть на вечеринку",
            "покажи платья",
            "нужны джинсы",
            "как дела"
        ]
        
        print("\n📝 Тестирование распознавания запросов:")
        for message in test_messages:
            is_product = style_agent._is_product_request(message)
            print(f"  '{message}' -> запрос товаров: {is_product}")
        
        # Тестируем парсинг запросов
        print("\n🔍 Тестирование парсинга запросов:")
        party_request = style_agent._parse_user_request("что можно одеть на вечеринку")
        print(f"  Запрос вечеринки: {party_request}")
        
        dress_request = style_agent._parse_user_request("покажи платья")
        print(f"  Запрос платьев: {dress_request}")
        
        print("\n✅ Тестирование завершено успешно!")
        
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_chat_fixes()) 