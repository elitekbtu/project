#!/usr/bin/env python3
"""
Тестовый скрипт для проверки логики диалога StyleAgent
"""

import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

from app.agents.style_agent import StyleAgent

def test_dialogue_flow():
    """Тестирует поток диалога"""
    
    print("🤖 Тестирование логики диалога StyleAgent")
    print("=" * 50)
    
    # Создаем агента
    agent = StyleAgent()
    
    # Тест 1: Приветствие
    print("\n📝 Тест 1: Приветствие")
    print("Пользователь: привет")
    
    # Симулируем вызов chat() с None для БД
    result = agent._is_greeting("привет")
    print(f"is_greeting('привет') = {result}")
    
    result = agent.is_small_talk("привет")
    print(f"is_small_talk('привет') = {result}")
    
    # Тест 2: Положительный ответ
    print("\n📝 Тест 2: Положительный ответ")
    print("Пользователь: да, помоги")
    
    result = agent._is_positive_response("да, помоги")
    print(f"is_positive_response('да, помоги') = {result}")
    
    result = agent._is_product_request("да, помоги")
    print(f"is_product_request('да, помоги') = {result}")
    
    # Тест 3: Запрос товаров
    print("\n📝 Тест 3: Запрос товаров")
    print("Пользователь: покажи футболки")
    
    result = agent._is_product_request("покажи футболки")
    print(f"is_product_request('покажи футболки') = {result}")
    
    result = agent._is_greeting("покажи футболки")
    print(f"is_greeting('покажи футболки') = {result}")
    
    # Тест 4: Различные варианты приветствий
    print("\n📝 Тест 4: Различные варианты приветствий")
    
    greetings = ["привет", "здравствуйте", "добрый день", "hello", "hi"]
    for greeting in greetings:
        result = agent._is_greeting(greeting)
        print(f"is_greeting('{greeting}') = {result}")
    
    # Тест 5: Различные положительные ответы
    print("\n📝 Тест 5: Различные положительные ответы")
    
    positive_responses = ["да", "конечно", "хочу", "интересно", "помоги", "давай", "хорошо"]
    for response in positive_responses:
        result = agent._is_positive_response(response)
        print(f"is_positive_response('{response}') = {result}")
    
    # Тест 6: Различные запросы товаров
    print("\n📝 Тест 6: Различные запросы товаров")
    
    product_requests = ["футболки", "рубашки", "джинсы", "покажи", "найди", "ищу", "нужны"]
    for request in product_requests:
        result = agent._is_product_request(request)
        print(f"is_product_request('{request}') = {result}")
    
    print("\n✅ Тестирование завершено!")

if __name__ == "__main__":
    test_dialogue_flow() 