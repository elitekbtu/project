#!/usr/bin/env python3
"""
Агент для анализа поведения пользователя
"""

import time
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from .base_agent import BaseAgent, AgentResult, ConversationContext, UserContext, FallbackHandler, IntentType

class UserBehaviorAgent(BaseAgent):
    """Агент для анализа поведения пользователя"""
    
    def __init__(self):
        super().__init__("user_behavior")
        self.behavior_patterns = {
            'impulsive_buyer': {
                'indicators': ['срочно', 'быстро', 'сейчас', 'немедленно'],
                'weight': 0.8
            },
            'careful_researcher': {
                'indicators': ['подробно', 'детально', 'все варианты', 'сравнить'],
                'weight': 0.7
            },
            'price_sensitive': {
                'indicators': ['дешево', 'недорого', 'бюджет', 'экономия'],
                'weight': 0.9
            },
            'quality_focused': {
                'indicators': ['качество', 'премиум', 'люкс', 'лучшее'],
                'weight': 0.8
            },
            'trend_follower': {
                'indicators': ['мода', 'тренд', 'популярно', 'стильно'],
                'weight': 0.6
            },
            'practical_buyer': {
                'indicators': ['удобно', 'практично', 'функционально'],
                'weight': 0.7
            }
        }
    
    async def process(self, input_data: Dict[str, Any], context: ConversationContext) -> AgentResult:
        """Основной метод обработки"""
        start_time = time.time()
        
        try:
            user_message = input_data.get('message', '')
            context_analysis = input_data.get('context_analysis', {})
            
            self.logger.info(f"Анализируем поведение пользователя")
            
            # 1. Анализ паттернов поведения
            behavior_patterns = self._analyze_behavior_patterns(user_message, context)
            
            # 2. Анализ предпочтений
            preferences_analysis = self._analyze_preferences_evolution(context)
            
            # 3. Анализ взаимодействий
            interaction_analysis = self._analyze_interaction_patterns(context)
            
            # 4. Предсказание поведения
            behavior_prediction = self._predict_behavior(context, behavior_patterns)
            
            # 5. Обновление профиля пользователя
            self._update_user_profile(context, behavior_patterns, preferences_analysis)
            
            # 6. Создание результата
            behavior_result = {
                'behavior_patterns': behavior_patterns,
                'preferences_analysis': preferences_analysis,
                'interaction_analysis': interaction_analysis,
                'behavior_prediction': behavior_prediction,
                'user_profile': self._create_user_profile(context)
            }
            
            processing_time = time.time() - start_time
            result = AgentResult(
                success=True,
                data=behavior_result,
                confidence=0.85,
                processing_time=processing_time
            )
            
            self.update_stats(result, processing_time)
            return result
            
        except Exception as e:
            self.logger.error(f"Ошибка в UserBehaviorAgent: {e}")
            processing_time = time.time() - start_time
            return FallbackHandler.create_fallback_result(
                f"Ошибка анализа поведения: {str(e)}",
                {'behavior_analysis': 'error'}
            )
    
    def _analyze_behavior_patterns(self, message: str, context: ConversationContext) -> Dict[str, Any]:
        """Анализирует паттерны поведения пользователя"""
        message_lower = message.lower()
        patterns = {}
        
        for pattern_name, pattern_data in self.behavior_patterns.items():
            indicators = pattern_data['indicators']
            weight = pattern_data['weight']
            
            # Подсчитываем совпадения
            matches = sum(1 for indicator in indicators if indicator in message_lower)
            
            if matches > 0:
                # Вычисляем силу паттерна
                strength = min(1.0, matches * weight / len(indicators))
                patterns[pattern_name] = {
                    'strength': strength,
                    'matches': matches,
                    'indicators_found': [ind for ind in indicators if ind in message_lower]
                }
        
        # Анализируем исторические паттерны
        historical_patterns = self._analyze_historical_patterns(context)
        
        return {
            'current_patterns': patterns,
            'historical_patterns': historical_patterns,
            'pattern_consistency': self._calculate_pattern_consistency(context),
            'dominant_patterns': self._identify_dominant_patterns(patterns, historical_patterns)
        }
    
    def _analyze_preferences_evolution(self, context: ConversationContext) -> Dict[str, Any]:
        """Анализирует эволюцию предпочтений пользователя"""
        history = context.user_context.conversation_history
        
        if len(history) < 3:
            return {'evolution': 'insufficient_data', 'trends': {}}
        
        # Анализируем изменения предпочтений во времени
        preferences_timeline = []
        for entry in history:
            if 'analysis' in entry and 'preferences' in entry['analysis']:
                preferences_timeline.append({
                    'timestamp': entry['timestamp'],
                    'preferences': entry['analysis']['preferences']
                })
        
        # Анализируем тренды
        trends = self._analyze_preference_trends(preferences_timeline)
        
        return {
            'evolution': 'stable' if len(trends) == 0 else 'evolving',
            'trends': trends,
            'preferences_stability': self._calculate_preferences_stability(preferences_timeline),
            'preferences_diversity': self._calculate_preferences_diversity(context)
        }
    
    def _analyze_interaction_patterns(self, context: ConversationContext) -> Dict[str, Any]:
        """Анализирует паттерны взаимодействий"""
        history = context.user_context.conversation_history
        
        if not history:
            return {'patterns': 'no_data'}
        
        # Анализируем время взаимодействий
        time_patterns = self._analyze_time_patterns(history)
        
        # Анализируем частоту взаимодействий
        frequency_patterns = self._analyze_frequency_patterns(history)
        
        # Анализируем типы взаимодействий
        interaction_types = self._analyze_interaction_types(history)
        
        return {
            'time_patterns': time_patterns,
            'frequency_patterns': frequency_patterns,
            'interaction_types': interaction_types,
            'engagement_trend': self._calculate_engagement_trend(history)
        }
    
    def _predict_behavior(self, context: ConversationContext, behavior_patterns: Dict) -> Dict[str, Any]:
        """Предсказывает будущее поведение пользователя"""
        predictions = {
            'next_likely_action': self._predict_next_action(context),
            'purchase_probability': self._predict_purchase_probability(context),
            'engagement_level': self._predict_engagement_level(context),
            'preference_evolution': self._predict_preference_evolution(context),
            'conversation_duration': self._predict_conversation_duration(context)
        }
        
        return predictions
    
    def _update_user_profile(self, context: ConversationContext, behavior_patterns: Dict, preferences_analysis: Dict):
        """Обновляет профиль пользователя"""
        # Обновляем предпочтения на основе поведения
        if 'current_patterns' in behavior_patterns:
            for pattern_name, pattern_data in behavior_patterns['current_patterns'].items():
                if pattern_data['strength'] > 0.5:
                    # Добавляем паттерн в профиль
                    if 'behavior_patterns' not in context.user_context.preferences:
                        context.user_context.preferences['behavior_patterns'] = []
                    
                    if pattern_name not in context.user_context.preferences['behavior_patterns']:
                        context.user_context.preferences['behavior_patterns'].append(pattern_name)
        
        # Обновляем метаданные профиля
        context.user_context.preferences['last_updated'] = datetime.now().isoformat()
        context.user_context.preferences['interaction_count'] = context.user_context.interaction_count
    
    def _create_user_profile(self, context: ConversationContext) -> Dict[str, Any]:
        """Создает профиль пользователя"""
        return {
            'user_id': context.user_context.user_id,
            'interaction_count': context.user_context.interaction_count,
            'preferences': context.user_context.preferences,
            'favorite_categories': context.user_context.favorite_categories,
            'style_preferences': context.user_context.style_preferences,
            'price_range': context.user_context.price_range,
            'size_preferences': context.user_context.size_preferences,
            'last_interaction': context.user_context.last_interaction.isoformat() if context.user_context.last_interaction else None,
            'profile_completeness': self._calculate_profile_completeness(context)
        }
    
    def _analyze_historical_patterns(self, context: ConversationContext) -> Dict[str, Any]:
        """Анализирует исторические паттерны поведения"""
        history = context.user_context.conversation_history
        
        if len(history) < 3:
            return {}
        
        # Анализируем паттерны по времени
        patterns_over_time = {}
        for entry in history:
            if 'analysis' in entry and 'behavior' in entry['analysis']:
                timestamp = entry['timestamp']
                behavior = entry['analysis']['behavior']
                
                # Группируем по дням
                day_key = timestamp.strftime('%Y-%m-%d')
                if day_key not in patterns_over_time:
                    patterns_over_time[day_key] = []
                
                patterns_over_time[day_key].append(behavior)
        
        return patterns_over_time
    
    def _calculate_pattern_consistency(self, context: ConversationContext) -> float:
        """Вычисляет консистентность паттернов поведения"""
        history = context.user_context.conversation_history
        
        if len(history) < 3:
            return 0.5  # Нейтральная консистентность для новых пользователей
        
        # Анализируем повторяющиеся паттерны
        interaction_styles = []
        for entry in history:
            if 'analysis' in entry and 'behavior' in entry['analysis']:
                behavior = entry['analysis']['behavior']
                if 'interaction_style' in behavior:
                    interaction_styles.append(behavior['interaction_style'])
        
        if not interaction_styles:
            return 0.5
        
        # Вычисляем консистентность на основе разнообразия стилей
        unique_styles = len(set(interaction_styles))
        total_interactions = len(interaction_styles)
        
        # Меньше уникальных стилей = более консистентное поведение
        consistency = max(0.0, 1.0 - (unique_styles - 1) / total_interactions)
        
        return consistency
    
    def _identify_dominant_patterns(self, current_patterns: Dict, historical_patterns: Dict) -> List[str]:
        """Определяет доминирующие паттерны"""
        all_patterns = {}
        
        # Добавляем текущие паттерны
        for pattern_name, pattern_data in current_patterns.items():
            all_patterns[pattern_name] = pattern_data.get('strength', 0)
        
        # Добавляем исторические паттерны
        for day_patterns in historical_patterns.values():
            for pattern in day_patterns:
                if 'interaction_style' in pattern:
                    style = pattern['interaction_style']
                    all_patterns[style] = all_patterns.get(style, 0) + 0.1
        
        # Сортируем по силе и возвращаем топ-3
        sorted_patterns = sorted(all_patterns.items(), key=lambda x: x[1], reverse=True)
        return [pattern[0] for pattern in sorted_patterns[:3]]
    
    def _analyze_preference_trends(self, preferences_timeline: List[Dict]) -> Dict[str, Any]:
        """Анализирует тренды предпочтений"""
        if len(preferences_timeline) < 2:
            return {}
        
        trends = {}
        
        # Анализируем изменения в ценовых предпочтениях
        price_trends = self._analyze_price_trends(preferences_timeline)
        if price_trends:
            trends['price_preferences'] = price_trends
        
        # Анализируем изменения в стилевых предпочтениях
        style_trends = self._analyze_style_trends(preferences_timeline)
        if style_trends:
            trends['style_preferences'] = style_trends
        
        return trends
    
    def _analyze_price_trends(self, preferences_timeline: List[Dict]) -> Dict[str, str]:
        """Анализирует тренды ценовых предпочтений"""
        trends = {}
        
        # Упрощенный анализ - можно расширить
        budget_mentions = 0
        premium_mentions = 0
        
        for entry in preferences_timeline:
            preferences = entry.get('preferences', {})
            price_prefs = preferences.get('price_preferences', {})
            
            if price_prefs.get('budget'):
                budget_mentions += 1
            if price_prefs.get('premium'):
                premium_mentions += 1
        
        if budget_mentions > premium_mentions:
            trends['direction'] = 'budget_focused'
        elif premium_mentions > budget_mentions:
            trends['direction'] = 'premium_focused'
        else:
            trends['direction'] = 'balanced'
        
        return trends
    
    def _analyze_style_trends(self, preferences_timeline: List[Dict]) -> Dict[str, str]:
        """Анализирует тренды стилевых предпочтений"""
        # Упрощенный анализ
        return {'direction': 'stable'}
    
    def _calculate_preferences_stability(self, preferences_timeline: List[Dict]) -> float:
        """Вычисляет стабильность предпочтений"""
        if len(preferences_timeline) < 2:
            return 1.0
        
        # Сравниваем предпочтения между соседними записями
        changes = 0
        comparisons = 0
        
        for i in range(1, len(preferences_timeline)):
            prev_prefs = preferences_timeline[i-1].get('preferences', {})
            curr_prefs = preferences_timeline[i].get('preferences', {})
            
            # Сравниваем ключевые предпочтения
            for key in ['price_preferences', 'style_preferences', 'category_preferences']:
                if prev_prefs.get(key) != curr_prefs.get(key):
                    changes += 1
                comparisons += 1
        
        if comparisons == 0:
            return 1.0
        
        stability = 1.0 - (changes / comparisons)
        return max(0.0, stability)
    
    def _calculate_preferences_diversity(self, context: ConversationContext) -> float:
        """Вычисляет разнообразие предпочтений"""
        diversity_factors = [
            len(context.user_context.favorite_categories),
            len(context.user_context.style_preferences),
            len(context.user_context.size_preferences)
        ]
        
        # Нормализуем каждый фактор
        normalized_factors = [min(1.0, factor / 5) for factor in diversity_factors]
        
        return sum(normalized_factors) / len(normalized_factors)
    
    def _analyze_time_patterns(self, history: List[Dict]) -> Dict[str, Any]:
        """Анализирует временные паттерны"""
        if len(history) < 2:
            return {'pattern': 'insufficient_data'}
        
        # Анализируем время дня
        hour_distribution = {}
        for entry in history:
            hour = entry['timestamp'].hour
            hour_distribution[hour] = hour_distribution.get(hour, 0) + 1
        
        # Определяем предпочтительное время
        preferred_hour = max(hour_distribution.items(), key=lambda x: x[1])[0]
        
        return {
            'pattern': 'time_preference',
            'preferred_hour': preferred_hour,
            'hour_distribution': hour_distribution,
            'activity_spread': len(hour_distribution)
        }
    
    def _analyze_frequency_patterns(self, history: List[Dict]) -> Dict[str, Any]:
        """Анализирует паттерны частоты"""
        if len(history) < 3:
            return {'pattern': 'insufficient_data'}
        
        # Вычисляем интервалы между сообщениями
        intervals = []
        for i in range(1, len(history)):
            interval = history[i]['timestamp'] - history[i-1]['timestamp']
            intervals.append(interval.total_seconds() / 60)  # в минутах
        
        avg_interval = sum(intervals) / len(intervals)
        
        return {
            'pattern': 'frequency_analysis',
            'average_interval_minutes': avg_interval,
            'total_interactions': len(history),
            'frequency_category': self._categorize_frequency(avg_interval)
        }
    
    def _analyze_interaction_types(self, history: List[Dict]) -> Dict[str, int]:
        """Анализирует типы взаимодействий"""
        type_counts = {}
        
        for entry in history:
            intent_type = entry.get('message', 'unknown')
            type_counts[intent_type] = type_counts.get(intent_type, 0) + 1
        
        return type_counts
    
    def _calculate_engagement_trend(self, history: List[Dict]) -> str:
        """Вычисляет тренд вовлеченности"""
        if len(history) < 5:
            return 'stable'
        
        # Анализируем последние 5 взаимодействий
        recent = history[-5:]
        
        # Упрощенный анализ - можно расширить
        return 'stable'
    
    def _predict_next_action(self, context: ConversationContext) -> str:
        """Предсказывает следующее действие пользователя"""
        if not context.previous_intents:
            return 'greeting'
        
        # Простое предсказание на основе последнего намерения
        last_intent = context.previous_intents[-1].intent
        
        intent_transitions = {
            IntentType.GREETING: 'product_request',
            IntentType.PRODUCT_REQUEST: 'product_request',
            IntentType.SMALL_TALK: 'product_request',
            IntentType.SIZE_HELP: 'product_request',
            IntentType.STYLE_ADVICE: 'product_request'
        }
        
        return intent_transitions.get(last_intent, 'product_request')
    
    def _predict_purchase_probability(self, context: ConversationContext) -> float:
        """Предсказывает вероятность покупки"""
        if context.user_context.interaction_count < 2:
            return 0.3  # Низкая вероятность для новых пользователей
        
        # Факторы, влияющие на вероятность покупки
        factors = {
            'engagement_level': min(1.0, context.user_context.interaction_count / 10),
            'has_preferences': 0.8 if context.user_context.favorite_categories else 0.3,
            'recent_product_requests': self._count_recent_product_requests(context),
            'mood_positive': 0.7 if context.user_context.mood.value in ['positive', 'excited'] else 0.4
        }
        
        # Вычисляем среднюю вероятность
        probability = sum(factors.values()) / len(factors)
        return min(1.0, probability)
    
    def _predict_engagement_level(self, context: ConversationContext) -> str:
        """Предсказывает уровень вовлеченности"""
        if context.user_context.interaction_count < 3:
            return 'low'
        elif context.user_context.interaction_count < 10:
            return 'medium'
        else:
            return 'high'
    
    def _predict_preference_evolution(self, context: ConversationContext) -> str:
        """Предсказывает эволюцию предпочтений"""
        return 'stable'  # Упрощенное предсказание
    
    def _predict_conversation_duration(self, context: ConversationContext) -> int:
        """Предсказывает продолжительность разговора в минутах"""
        base_duration = 5  # базовая продолжительность
        
        # Корректируем на основе поведения
        if context.user_context.interaction_count > 5:
            base_duration += 5
        
        if context.user_context.favorite_categories:
            base_duration += 3
        
        return min(30, base_duration)  # максимум 30 минут
    
    def _count_recent_product_requests(self, context: ConversationContext) -> float:
        """Подсчитывает недавние запросы товаров"""
        recent_intents = context.previous_intents[-5:] if len(context.previous_intents) >= 5 else context.previous_intents
        
        product_requests = sum(1 for intent in recent_intents if intent.intent == IntentType.PRODUCT_REQUEST)
        return min(1.0, product_requests / len(recent_intents)) if recent_intents else 0.0
    
    def _categorize_frequency(self, avg_interval: float) -> str:
        """Категоризирует частоту взаимодействий"""
        if avg_interval < 1:
            return 'very_frequent'
        elif avg_interval < 5:
            return 'frequent'
        elif avg_interval < 15:
            return 'moderate'
        else:
            return 'infrequent'
    
    def _calculate_profile_completeness(self, context: ConversationContext) -> float:
        """Вычисляет полноту профиля пользователя"""
        factors = [
            1.0 if context.user_context.favorite_categories else 0.0,
            1.0 if context.user_context.style_preferences else 0.0,
            1.0 if context.user_context.size_preferences else 0.0,
            1.0 if context.user_context.price_range else 0.0,
            min(1.0, context.user_context.interaction_count / 10)
        ]
        
        return sum(factors) / len(factors) 