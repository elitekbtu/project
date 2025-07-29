#!/usr/bin/env python3
"""
Агент для анализа контекста разговора
"""

import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from .base_agent import BaseAgent, AgentResult, ConversationContext, UserContext, UserMood, FallbackHandler
from .intent_recognition_agent import IntentType

class ContextAnalysisAgent(BaseAgent):
    """Агент для анализа контекста разговора"""
    
    def __init__(self):
        super().__init__("context_analysis")
        self.context_patterns = {
            'first_time_user': ['привет', 'здравствуйте', 'первый раз'],
            'returning_user': ['снова', 'опять', 'как обычно', 'как всегда'],
            'urgent_request': ['срочно', 'быстро', 'немедленно', 'сейчас'],
            'casual_browsing': ['посмотреть', 'полистать', 'интересно', 'любопытно'],
            'specific_search': ['ищу', 'нужно', 'требуется', 'необходимо'],
            'price_sensitive': ['дешево', 'недорого', 'бюджет', 'экономия'],
            'quality_focused': ['качество', 'премиум', 'люкс', 'лучшее'],
            'fashion_conscious': ['мода', 'тренд', 'стильно', 'модно']
        }
    
    async def process(self, input_data: Dict[str, Any], context: ConversationContext) -> AgentResult:
        """Основной метод обработки"""
        start_time = time.time()
        
        try:
            user_message = input_data.get('message', '')
            intent_result = input_data.get('intent_result')
            
            self.logger.info(f"Анализируем контекст для сообщения: '{user_message[:50]}...'")
            
            # 1. Анализ истории разговора
            conversation_analysis = self._analyze_conversation_history(context)
            
            # 2. Анализ поведения пользователя
            behavior_analysis = self._analyze_user_behavior(context, user_message)
            
            # 3. Анализ эмоционального состояния
            mood_analysis = self._analyze_user_mood(context, user_message, intent_result)
            
            # 4. Анализ предпочтений
            preferences_analysis = self._analyze_preferences(context, user_message)
            
            # 5. Обновление контекста пользователя
            self._update_user_context(context, conversation_analysis, behavior_analysis, mood_analysis, preferences_analysis)
            
            # 6. Создание результата
            analysis_result = {
                'conversation_analysis': conversation_analysis,
                'behavior_analysis': behavior_analysis,
                'mood_analysis': mood_analysis,
                'preferences_analysis': preferences_analysis,
                'context_hints': self._generate_context_hints(context)
            }
            
            processing_time = time.time() - start_time
            result = AgentResult(
                success=True,
                data=analysis_result,
                confidence=0.9,
                processing_time=processing_time
            )
            
            self.update_stats(result, processing_time)
            return result
            
        except Exception as e:
            self.logger.error(f"Ошибка в ContextAnalysisAgent: {e}")
            processing_time = time.time() - start_time
            return FallbackHandler.create_fallback_result(
                f"Ошибка анализа контекста: {str(e)}",
                {'context_analysis': 'error'}
            )
    
    def _analyze_conversation_history(self, context: ConversationContext) -> Dict[str, Any]:
        """Анализирует историю разговора"""
        history = context.user_context.conversation_history
        
        analysis = {
            'total_messages': len(history),
            'conversation_duration': self._calculate_conversation_duration(history),
            'message_frequency': self._calculate_message_frequency(history),
            'intent_distribution': self._analyze_intent_distribution(context.previous_intents),
            'conversation_flow': self._analyze_conversation_flow(context.conversation_flow),
            'is_first_time': len(history) <= 2,
            'is_returning_user': len(history) > 5,
            'conversation_depth': self._calculate_conversation_depth(history)
        }
        
        return analysis
    
    def _analyze_user_behavior(self, context: ConversationContext, current_message: str) -> Dict[str, Any]:
        """Анализирует поведение пользователя"""
        behavior = {
            'message_length': len(current_message),
            'typing_speed': self._estimate_typing_speed(context),
            'response_time': self._calculate_response_time(context),
            'interaction_style': self._determine_interaction_style(current_message),
            'engagement_level': self._calculate_engagement_level(context),
            'preference_consistency': self._check_preference_consistency(context),
            'decision_making_style': self._analyze_decision_style(context)
        }
        
        return behavior
    
    def _analyze_user_mood(self, context: ConversationContext, message: str, intent_result) -> Dict[str, Any]:
        """Анализирует эмоциональное состояние пользователя"""
        mood_indicators = {
            'positive_words': ['отлично', 'хорошо', 'нравится', 'люблю', 'супер', 'круто', 'класс'],
            'negative_words': ['плохо', 'ужасно', 'не нравится', 'неудобно', 'проблема', 'ошибка'],
            'excited_words': ['вау', 'круто', 'супер', 'отлично', 'здорово', 'потрясающе'],
            'confused_words': ['не понимаю', 'неясно', 'запутался', 'сложно', 'не знаю'],
            'impatient_words': ['быстро', 'срочно', 'немедленно', 'долго', 'медленно']
        }
        
        message_lower = message.lower()
        mood_scores = {}
        
        for mood_type, words in mood_indicators.items():
            score = sum(1 for word in words if word in message_lower)
            mood_scores[mood_type] = score
        
        # Определяем основное настроение
        if mood_scores.get('excited_words', 0) > 0:
            mood = UserMood.EXCITED
        elif mood_scores.get('negative_words', 0) > 0:
            mood = UserMood.NEGATIVE
        elif mood_scores.get('confused_words', 0) > 0:
            mood = UserMood.CONFUSED
        elif mood_scores.get('impatient_words', 0) > 0:
            mood = UserMood.IMPATIENT
        elif mood_scores.get('positive_words', 0) > 0:
            mood = UserMood.POSITIVE
        else:
            mood = UserMood.NEUTRAL
        
        # Обновляем настроение в контексте
        context.user_context.mood = mood
        
        return {
            'current_mood': mood.value,
            'mood_scores': mood_scores,
            'mood_change': self._detect_mood_change(context),
            'mood_stability': self._calculate_mood_stability(context)
        }
    
    def _analyze_preferences(self, context: ConversationContext, message: str) -> Dict[str, Any]:
        """Анализирует предпочтения пользователя"""
        message_lower = message.lower()
        
        # Анализ ценовых предпочтений
        price_preferences = self._analyze_price_preferences(message_lower)
        
        # Анализ стилевых предпочтений
        style_preferences = self._analyze_style_preferences(message_lower)
        
        # Анализ категорийных предпочтений
        category_preferences = self._analyze_category_preferences(message_lower)
        
        # Анализ брендовых предпочтений
        brand_preferences = self._analyze_brand_preferences(message_lower)
        
        return {
            'price_preferences': price_preferences,
            'style_preferences': style_preferences,
            'category_preferences': category_preferences,
            'brand_preferences': brand_preferences,
            'preferences_confidence': self._calculate_preferences_confidence(context)
        }
    
    def _update_user_context(self, context: ConversationContext, conversation_analysis: Dict, 
                           behavior_analysis: Dict, mood_analysis: Dict, preferences_analysis: Dict):
        """Обновляет контекст пользователя"""
        # Обновляем счетчик взаимодействий
        context.user_context.interaction_count += 1
        context.user_context.last_interaction = datetime.now()
        
        # Обновляем историю разговора
        context.user_context.conversation_history.append({
            'timestamp': datetime.now(),
            'message': context.current_intent.intent.value if context.current_intent else 'unknown',
            'mood': context.user_context.mood.value,
            'analysis': {
                'conversation': conversation_analysis,
                'behavior': behavior_analysis,
                'mood': mood_analysis,
                'preferences': preferences_analysis
            }
        })
        
        # Ограничиваем историю последними 50 сообщениями
        if len(context.user_context.conversation_history) > 50:
            context.user_context.conversation_history = context.user_context.conversation_history[-50:]
        
        # Обновляем предпочтения
        self._update_user_preferences(context, preferences_analysis)
    
    def _calculate_conversation_duration(self, history: List[Dict]) -> float:
        """Вычисляет продолжительность разговора в минутах"""
        if len(history) < 2:
            return 0.0
        
        first_message = history[0]['timestamp']
        last_message = history[-1]['timestamp']
        duration = last_message - first_message
        return duration.total_seconds() / 60
    
    def _calculate_message_frequency(self, history: List[Dict]) -> float:
        """Вычисляет частоту сообщений (сообщений в минуту)"""
        if len(history) < 2:
            return 0.0
        
        duration = self._calculate_conversation_duration(history)
        if duration == 0:
            return 0.0
        
        return len(history) / duration
    
    def _analyze_intent_distribution(self, intents: List) -> Dict[str, int]:
        """Анализирует распределение намерений"""
        distribution = {}
        for intent in intents:
            intent_name = intent.intent.value
            distribution[intent_name] = distribution.get(intent_name, 0) + 1
        return distribution
    
    def _analyze_conversation_flow(self, flow: List[str]) -> Dict[str, Any]:
        """Анализирует поток разговора"""
        if not flow:
            return {'flow_type': 'empty', 'flow_length': 0}
        
        return {
            'flow_type': self._determine_flow_type(flow),
            'flow_length': len(flow),
            'flow_pattern': flow[-5:] if len(flow) > 5 else flow,
            'flow_complexity': self._calculate_flow_complexity(flow)
        }
    
    def _calculate_conversation_depth(self, history: List[Dict]) -> int:
        """Вычисляет глубину разговора"""
        if not history:
            return 0
        
        # Подсчитываем уникальные темы/намерения
        unique_intents = set()
        for entry in history:
            if 'message' in entry:
                unique_intents.add(entry['message'])
        
        return len(unique_intents)
    
    def _estimate_typing_speed(self, context: ConversationContext) -> float:
        """Оценивает скорость печати пользователя"""
        # Упрощенная оценка на основе длины сообщений
        recent_messages = context.user_context.conversation_history[-5:]
        if not recent_messages:
            return 0.0
        
        total_length = sum(len(str(msg.get('message', ''))) for msg in recent_messages)
        return total_length / len(recent_messages)
    
    def _calculate_response_time(self, context: ConversationContext) -> float:
        """Вычисляет время ответа пользователя"""
        if len(context.user_context.conversation_history) < 2:
            return 0.0
        
        # Время между последними двумя сообщениями
        last_two = context.user_context.conversation_history[-2:]
        if len(last_two) < 2:
            return 0.0
        
        time_diff = last_two[1]['timestamp'] - last_two[0]['timestamp']
        return time_diff.total_seconds()
    
    def _determine_interaction_style(self, message: str) -> str:
        """Определяет стиль взаимодействия пользователя"""
        message_lower = message.lower()
        
        if any(word in message_lower for word in ['пожалуйста', 'спасибо', 'извините']):
            return 'polite'
        elif any(word in message_lower for word in ['быстро', 'срочно', 'немедленно']):
            return 'urgent'
        elif len(message) < 10:
            return 'brief'
        elif len(message) > 100:
            return 'detailed'
        else:
            return 'normal'
    
    def _calculate_engagement_level(self, context: ConversationContext) -> float:
        """Вычисляет уровень вовлеченности пользователя"""
        if not context.user_context.conversation_history:
            return 0.0
        
        # Факторы вовлеченности
        factors = {
            'message_length': min(1.0, len(context.user_context.conversation_history[-1].get('message', '')) / 50),
            'response_speed': min(1.0, 60 / max(1, self._calculate_response_time(context))),
            'conversation_depth': min(1.0, self._calculate_conversation_depth(context.user_context.conversation_history) / 5),
            'mood_positive': 1.0 if context.user_context.mood in [UserMood.POSITIVE, UserMood.EXCITED] else 0.5
        }
        
        return sum(factors.values()) / len(factors)
    
    def _check_preference_consistency(self, context: ConversationContext) -> float:
        """Проверяет консистентность предпочтений"""
        # Упрощенная проверка - можно расширить
        return 0.8  # Базовая консистентность
    
    def _analyze_decision_style(self, context: ConversationContext) -> str:
        """Анализирует стиль принятия решений"""
        history = context.user_context.conversation_history
        
        if len(history) < 3:
            return 'unknown'
        
        # Анализируем последние решения
        recent_decisions = [msg for msg in history[-5:] if 'product_request' in str(msg.get('message', ''))]
        
        if not recent_decisions:
            return 'browsing'
        
        # Определяем стиль на основе паттернов
        return 'decisive'  # Упрощенная логика
    
    def _detect_mood_change(self, context: ConversationContext) -> str:
        """Определяет изменение настроения"""
        if len(context.user_context.conversation_history) < 2:
            return 'stable'
        
        # Сравниваем текущее настроение с предыдущим
        current_mood = context.user_context.mood
        previous_mood = context.user_context.conversation_history[-2]['mood']
        
        if current_mood.value == previous_mood:
            return 'stable'
        elif current_mood in [UserMood.POSITIVE, UserMood.EXCITED] and previous_mood in [UserMood.NEGATIVE, UserMood.CONFUSED]:
            return 'improved'
        else:
            return 'changed'
    
    def _calculate_mood_stability(self, context: ConversationContext) -> float:
        """Вычисляет стабильность настроения"""
        if len(context.user_context.conversation_history) < 3:
            return 1.0
        
        # Анализируем последние настроения
        recent_moods = [msg['mood'] for msg in context.user_context.conversation_history[-5:]]
        unique_moods = len(set(recent_moods))
        
        # Меньше уникальных настроений = более стабильное настроение
        return max(0.0, 1.0 - (unique_moods - 1) / len(recent_moods))
    
    def _analyze_price_preferences(self, message: str) -> Dict[str, Any]:
        """Анализирует ценовые предпочтения"""
        price_indicators = {
            'budget': ['дешево', 'недорого', 'бюджет', 'экономия', 'доступно'],
            'premium': ['дорого', 'премиум', 'люкс', 'качество', 'лучшее'],
            'mid_range': ['средний', 'нормальный', 'обычный']
        }
        
        preferences = {}
        for category, words in price_indicators.items():
            if any(word in message for word in words):
                preferences[category] = True
        
        return preferences
    
    def _analyze_style_preferences(self, message: str) -> Dict[str, Any]:
        """Анализирует стилевые предпочтения"""
        style_indicators = {
            'casual': ['повседневный', 'комфортный', 'расслабленный'],
            'formal': ['деловой', 'официальный', 'классический'],
            'sporty': ['спортивный', 'активный', 'для фитнеса'],
            'elegant': ['элегантный', 'изысканный', 'торжественный']
        }
        
        preferences = {}
        for style, words in style_indicators.items():
            if any(word in message for word in words):
                preferences[style] = True
        
        return preferences
    
    def _analyze_category_preferences(self, message: str) -> Dict[str, Any]:
        """Анализирует категорийные предпочтения"""
        category_indicators = {
            'tops': ['футболка', 'рубашка', 'блузка', 'свитер'],
            'bottoms': ['джинсы', 'брюки', 'шорты', 'юбка'],
            'dresses': ['платье', 'сарафан'],
            'outerwear': ['куртка', 'пальто', 'жилет']
        }
        
        preferences = {}
        for category, words in category_indicators.items():
            if any(word in message for word in words):
                preferences[category] = True
        
        return preferences
    
    def _analyze_brand_preferences(self, message: str) -> Dict[str, Any]:
        """Анализирует брендовые предпочтения"""
        # Упрощенный анализ - можно расширить
        return {}
    
    def _calculate_preferences_confidence(self, context: ConversationContext) -> float:
        """Вычисляет уверенность в предпочтениях"""
        # Уверенность растет с количеством взаимодействий
        return min(1.0, context.user_context.interaction_count / 10)
    
    def _update_user_preferences(self, context: ConversationContext, preferences_analysis: Dict):
        """Обновляет предпочтения пользователя"""
        # Обновляем предпочтения на основе анализа
        if 'style_preferences' in preferences_analysis:
            for style, value in preferences_analysis['style_preferences'].items():
                if value and style not in context.user_context.style_preferences:
                    context.user_context.style_preferences.append(style)
        
        if 'category_preferences' in preferences_analysis:
            for category, value in preferences_analysis['category_preferences'].items():
                if value and category not in context.user_context.favorite_categories:
                    context.user_context.favorite_categories.append(category)
    
    def _generate_context_hints(self, context: ConversationContext) -> List[str]:
        """Генерирует подсказки контекста"""
        hints = []
        
        if context.user_context.interaction_count <= 2:
            hints.append("new_user")
        
        if context.user_context.mood == UserMood.NEGATIVE:
            hints.append("user_dissatisfied")
        
        if context.user_context.mood == UserMood.EXCITED:
            hints.append("user_excited")
        
        if len(context.user_context.favorite_categories) > 0:
            hints.append("has_preferences")
        
        return hints
    
    def _determine_flow_type(self, flow: List[str]) -> str:
        """Определяет тип потока разговора"""
        if not flow:
            return 'empty'
        
        if len(flow) == 1:
            return 'single_step'
        
        # Анализируем паттерны
        if 'greeting' in flow and 'product_request' in flow:
            return 'greeting_to_purchase'
        elif 'product_request' in flow and 'product_request' in flow:
            return 'multiple_requests'
        else:
            return 'mixed'
    
    def _calculate_flow_complexity(self, flow: List[str]) -> int:
        """Вычисляет сложность потока"""
        if not flow:
            return 0
        
        # Сложность = количество уникальных шагов
        return len(set(flow)) 