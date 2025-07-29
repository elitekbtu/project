#!/usr/bin/env python3
"""
Упрощенный тест логики диалога без зависимостей
"""

import re

def is_greeting(user_message: str) -> bool:
    """Определяет приветственные сообщения"""
    greeting_patterns = [
        r"привет", r"здравствуй", r"добрый день", r"доброе утро", r"добрый вечер",
        r"hello", r"hi", r"hey", r"доброго времени суток"
    ]
    
    msg = user_message.lower()
    return any(re.search(p, msg) for p in greeting_patterns)

def is_positive_response(user_message: str) -> bool:
    """Определяет положительные ответы"""
    positive_patterns = [
        r"да", r"конечно", r"хочу", r"интересно", r"помоги", r"давай", r"хорошо",
        r"yes", r"sure", r"ok", r"okay", r"хотел бы", r"хотела бы", r"помогите"
    ]
    
    msg = user_message.lower()
    return any(re.search(p, msg) for p in positive_patterns)

def is_product_request(user_message: str) -> bool:
    """Определяет запросы на товары"""
    product_patterns = [
        r"футболк", r"рубашк", r"джинс", r"плать", r"куртк", r"костюм", r"брюк",
        r"покажи", r"найди", r"ищу", r"нужн", r"хочу", r"дай", r"дайте",
        r"цена", r"стоимость", r"диапазон", r"от", r"до", r"тысяч", r"тенге",
        r"цвет", r"размер", r"бренд", r"стиль", r"мода", r"одежд"
    ]
    
    msg = user_message.lower()
    return any(re.search(p, msg) for p in product_patterns)

def test_dialogue_logic():
    """Тестирует логику диалога"""
    
    print("🤖 Тестирование логики диалога")
    print("=" * 50)
    
    # Тест 1: Приветствие
    print("\n📝 Тест 1: Приветствие")
    print("Пользователь: привет")
    
    result = is_greeting("привет")
    print(f"is_greeting('привет') = {result}")
    
    # Тест 2: Положительный ответ
    print("\n📝 Тест 2: Положительный ответ")
    print("Пользователь: да, помоги")
    
    result = is_positive_response("да, помоги")
    print(f"is_positive_response('да, помоги') = {result}")
    
    result = is_product_request("да, помоги")
    print(f"is_product_request('да, помоги') = {result}")
    
    # Тест 3: Запрос товаров
    print("\n📝 Тест 3: Запрос товаров")
    print("Пользователь: покажи футболки")
    
    result = is_product_request("покажи футболки")
    print(f"is_product_request('покажи футболки') = {result}")
    
    result = is_greeting("покажи футболки")
    print(f"is_greeting('покажи футболки') = {result}")
    
    # Тест 4: Различные варианты приветствий
    print("\n📝 Тест 4: Различные варианты приветствий")
    
    greetings = ["привет", "здравствуйте", "добрый день", "hello", "hi", "как дела"]
    for greeting in greetings:
        result = is_greeting(greeting)
        print(f"is_greeting('{greeting}') = {result}")
    
    # Тест 5: Различные положительные ответы
    print("\n📝 Тест 5: Различные положительные ответы")
    
    positive_responses = ["да", "конечно", "хочу", "интересно", "помоги", "давай", "хорошо"]
    for response in positive_responses:
        result = is_positive_response(response)
        print(f"is_positive_response('{response}') = {result}")
    
    # Тест 6: Различные запросы товаров
    print("\n📝 Тест 6: Различные запросы товаров")
    
    product_requests = ["футболки", "рубашки", "джинсы", "покажи", "найди", "ищу", "нужны"]
    for request in product_requests:
        result = is_product_request(request)
        print(f"is_product_request('{request}') = {result}")
    
    print("\n✅ Тестирование завершено!")

if __name__ == "__main__":
    test_dialogue_logic() 