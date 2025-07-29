#!/usr/bin/env python3
"""
Базовые классы для системы агентов
"""

import logging
from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, field
from enum import Enum
import json
from datetime import datetime

logger = logging.getLogger(__name__)

class IntentType(Enum):
    """Типы намерений пользователя"""
    GREETING = "greeting"
    SMALL_TALK = "small_talk"
    PRODUCT_REQUEST = "product_request"
    SIZE_HELP = "size_help"
    STYLE_ADVICE = "style_advice"
    COMPLAINT = "complaint"
    QUESTION = "question"
    UNCLEAR = "unclear"
    GOODBYE = "goodbye"

class ConfidenceLevel(Enum):
    """Уровни уверенности"""
    HIGH = "high"      # 0.8-1.0
    MEDIUM = "medium"  # 0.5-0.8
    LOW = "low"        # 0.2-0.5
    VERY_LOW = "very_low"  # 0.0-0.2

class UserMood(Enum):
    """Эмоциональное состояние пользователя"""
    POSITIVE = "positive"
    NEUTRAL = "neutral"
    NEGATIVE = "negative"
    EXCITED = "excited"
    CONFUSED = "confused"
    IMPATIENT = "impatient"

@dataclass
class AgentResult:
    """Результат работы агента"""
    success: bool = True
    data: Dict[str, Any] = field(default_factory=dict)
    confidence: float = 1.0
    error_message: Optional[str] = None
    fallback_used: bool = False
    processing_time: float = 0.0

@dataclass
class IntentResult:
    """Результат анализа намерений"""
    intent: IntentType
    confidence: float
    entities: Dict[str, Any] = field(default_factory=dict)
    context_hints: List[str] = field(default_factory=list)
    alternative_intents: List[IntentType] = field(default_factory=list)

@dataclass
class UserContext:
    """Контекст пользователя"""
    user_id: Optional[int] = None
    session_id: str = ""
    conversation_history: List[Dict[str, Any]] = field(default_factory=list)
    preferences: Dict[str, Any] = field(default_factory=dict)
    mood: UserMood = UserMood.NEUTRAL
    interaction_count: int = 0
    last_interaction: Optional[datetime] = None
    favorite_categories: List[str] = field(default_factory=list)
    price_range: Dict[str, float] = field(default_factory=dict)
    size_preferences: List[str] = field(default_factory=list)
    style_preferences: List[str] = field(default_factory=list)

@dataclass
class ConversationContext:
    """Контекст разговора"""
    current_state: str = "greeting"
    user_context: UserContext = field(default_factory=UserContext)
    conversation_flow: List[str] = field(default_factory=list)
    current_intent: Optional[IntentResult] = None
    previous_intents: List[IntentResult] = field(default_factory=list)
    system_messages: List[str] = field(default_factory=list)
    error_count: int = 0
    last_error: Optional[str] = None

class BaseAgent(ABC):
    """Базовый класс для всех агентов"""
    
    def __init__(self, name: str):
        self.name = name
        self.logger = logging.getLogger(f"agent.{name}")
        self.stats = {
            'requests_processed': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'average_processing_time': 0.0,
            'fallback_used': 0
        }
    
    @abstractmethod
    async def process(self, input_data: Dict[str, Any], context: ConversationContext) -> AgentResult:
        """Основной метод обработки"""
        pass
    
    def update_stats(self, result: AgentResult, processing_time: float):
        """Обновляет статистику агента"""
        self.stats['requests_processed'] += 1
        self.stats['average_processing_time'] = (
            (self.stats['average_processing_time'] * (self.stats['requests_processed'] - 1) + processing_time) 
            / self.stats['requests_processed']
        )
        
        if result.success:
            self.stats['successful_requests'] += 1
        else:
            self.stats['failed_requests'] += 1
            
        if result.fallback_used:
            self.stats['fallback_used'] += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """Возвращает статистику агента"""
        return self.stats.copy()
    
    def reset_stats(self):
        """Сбрасывает статистику"""
        self.stats = {
            'requests_processed': 0,
            'successful_requests': 0,
            'failed_requests': 0,
            'average_processing_time': 0.0,
            'fallback_used': 0
        }

class AgentError(Exception):
    """Исключение для ошибок агентов"""
    def __init__(self, message: str, agent_name: str, fallback_available: bool = True):
        self.message = message
        self.agent_name = agent_name
        self.fallback_available = fallback_available
        super().__init__(self.message)

class FallbackHandler:
    """Обработчик fallback механизмов"""
    
    @staticmethod
    def create_fallback_result(error_message: str, fallback_data: Dict[str, Any] = None) -> AgentResult:
        """Создает fallback результат"""
        return AgentResult(
            success=True,
            data=fallback_data or {},
            confidence=0.1,
            error_message=error_message,
            fallback_used=True
        )
    
    @staticmethod
    def should_use_fallback(confidence: float, threshold: float = 0.3) -> bool:
        """Определяет, нужно ли использовать fallback"""
        return confidence < threshold 