#!/usr/bin/env python3
"""
Тест поиска товаров для вечеринок
"""

import asyncio
import sys
import os

# Добавляем путь к модулям
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

async def test_party_search():
    """Тестирует поиск товаров для вечеринок"""
    
    print("🧪 Тестирование поиска товаров для вечеринок...")
    
    try:
        from app.agents.style_agent import StyleAgent
        from app.api.v1.endpoints.profile.schemas import ProfileOut
        
        # Создаем экземпляр StyleAgent
        style_agent = StyleAgent()
        print("✅ StyleAgent создан")
        
        # Тестируем парсинг запросов для вечеринок
        test_messages = [
            "что можно одеть на вечеринку",
            "нужна одежда для праздника",
            "что надеть на торжество",
            "вечеринке",
            "праздничный наряд"
        ]
        
        print("\n📝 Тестирование парсинга запросов для вечеринок:")
        for message in test_messages:
            parsed = style_agent._parse_user_request(message)
            is_party = parsed.get('party_request', False)
            category = parsed.get('category')
            price_range = parsed.get('price_range')
            
            print(f"  '{message}' -> party_request: {is_party}, category: {category}, price: {price_range}")
        
        # Тестируем распознавание запросов товаров
        print("\n🔍 Тестирование распознавания запросов товаров:")
        for message in test_messages:
            is_product = style_agent._is_product_request(message)
            print(f"  '{message}' -> запрос товаров: {is_product}")
        
        print("\n✅ Тестирование завершено успешно!")
        
    except Exception as e:
        print(f"❌ Ошибка тестирования: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_party_search()) 