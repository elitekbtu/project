"""
Chat Stylist API - Цепочка ИИ агентов для стилиста

Этот модуль предоставляет API для взаимодействия с ИИ-стилистом через цепочку агентов:

1. IntentRecognitionAgent - анализирует намерения пользователя
2. ContextAnalysisAgent - анализирует контекст разговора
3. UserBehaviorAgent - анализирует поведение пользователя
4. ResponseGenerationAgent - генерирует персонализированные ответы
5. StyleAgent - работает с товарами и рекомендациями

Основные функции:
- get_stylist_reply() - основной метод для получения ответа
- reset_stylist_conversation() - сброс состояния диалога
- get_conversation_stats() - получение статистики
- get_conversation_summary() - получение сводки разговора
- get_performance_metrics() - метрики производительности
"""

from .service import (
    get_stylist_reply,
    reset_stylist_conversation,
    get_conversation_stats,
    get_conversation_summary,
    get_performance_metrics,
    cleanup_old_contexts
)

from .router import router

__all__ = [
    'get_stylist_reply',
    'reset_stylist_conversation', 
    'get_conversation_stats',
    'get_conversation_summary',
    'get_performance_metrics',
    'cleanup_old_contexts',
    'router'
] 