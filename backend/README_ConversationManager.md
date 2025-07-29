# ConversationManager - Документация

## Обзор

`ConversationManager` - это главный координатор системы агентов для обработки разговоров с пользователями. Он управляет цепочкой агентов, обрабатывающих сообщения пользователей, и поддерживает контекст разговора.

## Архитектура

```
ConversationManager
├── IntentRecognitionAgent (анализ намерений)
├── ContextAnalysisAgent (анализ контекста)
├── UserBehaviorAgent (анализ поведения)
├── ResponseGenerationAgent (генерация ответов)
└── StyleAgent (поиск товаров)
```

Все агенты наследуются от `BaseAgent` и имеют единый интерфейс:
- `process(input_data, context)` - основной метод обработки
- `get_stats()` - получение статистики
- `update_stats(result, processing_time)` - обновление статистики

## Основные возможности

### 1. Обработка сообщений
- Асинхронная обработка входящих сообщений
- Автоматическое определение намерений пользователя
- Контекстный анализ и персонализация
- Поиск товаров при необходимости

### 2. Управление контекстом
- Поддержка множественных пользователей
- Сохранение истории разговоров
- Отслеживание предпочтений пользователей
- Автоматическая очистка старых контекстов

### 3. Мониторинг и аналитика
- Детальная статистика системы
- Метрики производительности агентов
- Анализ состояния разговоров
- Экспорт данных для анализа

## Использование

### Базовое использование

```python
from app.agents.conversation_manager import ConversationManager

# Создание экземпляра
manager = ConversationManager()

# Обработка сообщения
response = await manager.process_message(
    user_message="Покажи мне футболки",
    user_id=123,
    user_profile=user_profile,
    db=database_connection
)

print(response['reply'])
print(f"Найдено товаров: {len(response['items'])}")
```

### Получение статистики

```python
# Общая статистика системы
stats = manager.get_system_stats()
print(f"Всего разговоров: {stats['total_conversations']}")
print(f"Успешных: {stats['successful_conversations']}")

# Метрики производительности
metrics = manager.get_performance_metrics()
print(f"Общий успех: {metrics['overall_success_rate']:.2%}")
print(f"Среднее время ответа: {metrics['average_response_time']:.2f}с")
```

### Работа с контекстом пользователя

```python
# Получение сводки разговора
summary = manager.get_conversation_summary(user_id=123)
print(f"Взаимодействий: {summary['interaction_count']}")
print(f"Текущее состояние: {summary['current_state']}")

# Экспорт данных пользователя
export_data = manager.export_conversation_data(user_id=123)

# Сброс контекста
manager.reset_user_context(user_id=123)
```

## Состояния разговора

- `greeting` - приветствие
- `product_search` - поиск товаров
- `size_help` - помощь с размерами
- `style_advice` - советы по стилю
- `complaint` - жалобы
- `question` - вопросы
- `goodbye` - прощание
- `small_talk` - светская беседа
- `unclear` - неясное намерение

## Типы намерений

- `GREETING` - приветствие
- `PRODUCT_REQUEST` - запрос товаров
- `SIZE_HELP` - помощь с размерами
- `STYLE_ADVICE` - советы по стилю
- `COMPLAINT` - жалобы
- `QUESTION` - вопросы
- `GOODBYE` - прощание
- `SMALL_TALK` - светская беседа
- `UNCLEAR` - неясное намерение

## Структура ответа

```python
{
    'reply': 'Текстовый ответ пользователю',
    'items': [список найденных товаров],
    'intent': 'тип_намерения',
    'confidence': 0.95,
    'context_hints': ['подсказки_контекста'],
    'personalization': {'данные_персонализации'},
    'processing_time': 0.5,
    'conversation_state': 'текущее_состояние',
    'user_interaction_count': 5,
    'success': True
}
```

## Управление памятью

### Очистка старых контекстов

```python
# Очистка контекстов старше 24 часов
manager.cleanup_old_contexts(max_age_hours=24)

# Сброс всех контекстов
manager.reset_user_context()
```

### Мониторинг памяти

```python
stats = manager.get_system_stats()
print(f"Активных контекстов: {stats['active_contexts']}")
```

## Обработка ошибок

Система автоматически обрабатывает ошибки и использует fallback-механизмы:

- При ошибке анализа намерений - используется fallback
- При ошибке поиска товаров - возвращается пустой список
- При ошибке генерации ответа - используется стандартный ответ

## Тестирование

Запуск тестов:

```bash
cd backend
python test_conversation_manager.py
```

Тесты проверяют:
- Обработку различных типов сообщений
- Работу с множественными пользователями
- Обработку ошибок
- Статистику и метрики
- Экспорт данных

## Производительность

### Рекомендации

1. **Мониторинг**: Регулярно проверяйте метрики производительности
2. **Очистка**: Настройте автоматическую очистку старых контекстов
3. **Масштабирование**: При большом количестве пользователей рассмотрите использование Redis для хранения контекстов

### Метрики для отслеживания

- `average_response_time` - среднее время ответа
- `success_rate` - процент успешных обработок
- `active_contexts` - количество активных контекстов
- `agent_performance` - производительность отдельных агентов

## Расширение функциональности

### Добавление нового агента

1. Создайте новый агент, наследующий от `BaseAgent`
2. Реализуйте обязательный метод `process(input_data, context) -> AgentResult`
3. Добавьте его в `ConversationManager.__init__()`
4. Интегрируйте в цепочку обработки в `_process_agent_chain()`

### Пример создания агента

```python
from .base_agent import BaseAgent, AgentResult, ConversationContext

class MyCustomAgent(BaseAgent):
    def __init__(self):
        super().__init__("my_custom_agent")
    
    async def process(self, input_data: Dict[str, Any], context: ConversationContext) -> AgentResult:
        # Ваша логика обработки
        return AgentResult(
            success=True,
            data={'result': 'processed'},
            processing_time=0.1
        )
```

### Добавление нового состояния

1. Добавьте новое состояние в `_update_conversation_context()`
2. Добавьте соответствующий тип намерения в `IntentType`
3. Обновите логику обработки в агентах

## Логирование

Система использует структурированное логирование:

```python
# Настройка логирования
import logging
logging.basicConfig(level=logging.INFO)

# Логи включают:
# - Время обработки каждого шага
# - Изменения состояний разговора
# - Ошибки и предупреждения
# - Статистику производительности
```

## Безопасность

- Контексты пользователей изолированы
- Данные не сохраняются на диск по умолчанию
- Автоматическая очистка чувствительных данных
- Валидация входных данных

## Поддержка

При возникновении проблем:

1. Проверьте логи системы
2. Используйте `get_performance_metrics()` для диагностики
3. Проверьте состояние агентов через `get_system_stats()`
4. При необходимости сбросьте контексты пользователей 