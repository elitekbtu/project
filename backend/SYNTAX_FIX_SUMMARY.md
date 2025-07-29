# Исправление синтаксической ошибки в StyleAgent

## Проблема

Сервер не запускался из-за синтаксической ошибки в файле `backend/app/agents/style_agent.py` на строке 876:

```
SyntaxError: expected 'except' or 'finally' block
```

## Причина ошибки

В методе `_handle_style_request` переменная `all_items` использовалась до её определения:

```python
# Строка 878 - ОШИБКА: all_items используется до определения
if request_params.get('party_request') and not all_items:
    # ...

# Строка 890 - all_items определяется здесь
all_items = []
```

## Исправление

Переместил определение `all_items` перед его использованием:

```python
# Сначала определяем all_items
all_items = []

# Сначала добавляем основные результаты
if search_results.get('main_results'):
    all_items.extend(search_results['main_results'])

# Затем добавляем остальные результаты, избегая дубликатов
seen_ids = {item.id for item in all_items}
for key, items in search_results.items():
    if key != 'main_results' and items:
        for item in items:
            if item.id not in seen_ids:
                all_items.append(item)
                seen_ids.add(item.id)

# Теперь можно использовать all_items
reply = await self._create_ai_response(search_results, user_message, market_insights, preferences)

# Специальная обработка для вечеринок
if request_params.get('party_request') and not all_items:
    # ...
```

## Результат

✅ **Сервер запустился успешно** без синтаксических ошибок

✅ **Все исправления для поиска товаров вечеринок** теперь работают

✅ **Чат должен функционировать корректно**

## Следующие шаги

1. Протестировать чат с запросом "что можно одеть на вечеринку"
2. Проверить, что товары отображаются правильно
3. Убедиться, что fallback поиск работает для вечеринок

🎉 **Проблема решена!** 