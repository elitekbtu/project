#!/usr/bin/env python3
"""
Главный менеджер разговора для координации всех агентов
"""

import time
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from .base_agent import BaseAgent, AgentResult, ConversationContext, UserContext, FallbackHandler
from .intent_recognition_agent import IntentRecognitionAgent, IntentType
from .context_analysis_agent import ContextAnalysisAgent
from .user_behavior_agent import UserBehaviorAgent
from .response_generation_agent import ResponseGenerationAgent
from .style_agent import StyleAgent

class ConversationManager(BaseAgent):
    """Главный менеджер разговора, координирующий всех агентов"""
    
    def __init__(self):
        super().__init__("conversation_manager")
        
        # Инициализируем всех агентов
        self.intent_agent = IntentRecognitionAgent()
        self.context_agent = ContextAnalysisAgent()
        self.behavior_agent = UserBehaviorAgent()
        self.response_agent = ResponseGenerationAgent()
        self.style_agent = StyleAgent()
        
        # Кэш контекстов пользователей
        self.user_contexts: Dict[str, ConversationContext] = {}
        
        # Статистика системы
        self.system_stats = {
            'total_conversations': 0,
            'successful_conversations': 0,
            'failed_conversations': 0,
            'average_response_time': 0.0,
            'agent_performance': {}
        }
        
        self.logger.info("ConversationManager инициализирован со всеми агентами")
    
    async def process(self, input_data: Dict[str, Any], context: ConversationContext) -> AgentResult:
        """Реализация абстрактного метода process из BaseAgent"""
        start_time = time.time()
        
        try:
            user_message = input_data.get('message', '')
            user_id = input_data.get('user_id')
            
            self.logger.info(f"Обрабатываем сообщение от пользователя {user_id}: '{user_message[:50]}...'")
            
            # Запускаем цепочку агентов
            result = await self._process_agent_chain(input_data, context)
            
            # Обновляем статистику
            processing_time = time.time() - start_time
            self._update_system_stats(result, processing_time)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Ошибка в ConversationManager: {e}")
            processing_time = time.time() - start_time
            return AgentResult(
                success=False,
                error_message=str(e),
                processing_time=processing_time
            )

    async def process_message(self, user_message: str, user_id: Optional[int] = None, 
                           user_profile=None, db=None) -> Dict[str, Any]:
        """Основной метод обработки сообщения пользователя"""
        start_time = time.time()
        
        try:
            self.logger.info(f"Обрабатываем сообщение от пользователя {user_id}: '{user_message[:50]}...'")
            
            # 1. Получаем или создаем контекст пользователя
            context = self._get_or_create_context(user_id)
            
            # 2. Подготавливаем входные данные
            input_data = {
                'message': user_message,
                'user_id': user_id,
                'user_profile': user_profile,
                'db': db
            }
            
            # 3. Запускаем цепочку агентов
            result = await self._process_agent_chain(input_data, context)
            
            # 4. Обновляем статистику
            processing_time = time.time() - start_time
            self._update_system_stats(result, processing_time)
            
            # 5. Подготавливаем финальный ответ
            final_response = self._prepare_final_response(result, context)
            
            self.logger.info(f"Сообщение обработано за {processing_time:.2f}с")
            return final_response
            
        except Exception as e:
            self.logger.error(f"Ошибка в ConversationManager: {e}")
            processing_time = time.time() - start_time
            return self._create_error_response(str(e), processing_time)
    
    async def _process_agent_chain(self, input_data: Dict[str, Any], context: ConversationContext) -> AgentResult:
        """Обрабатывает цепочку агентов"""
        chain_start_time = time.time()
        
        try:
            # 1. Анализ намерений
            self.logger.info("🔍 Шаг 1: Анализ намерений")
            intent_result = await self.intent_agent.process(input_data, context)
            
            if not intent_result.success:
                self.logger.warning("Ошибка анализа намерений, используем fallback")
                return self._create_fallback_response("Ошибка анализа намерений")
            
            intent_data = intent_result.data.get('intent_result')
            input_data['intent_result'] = intent_data
            
            # 2. Анализ контекста
            self.logger.info("📊 Шаг 2: Анализ контекста")
            context_result = await self.context_agent.process(input_data, context)
            
            if not context_result.success:
                self.logger.warning("Ошибка анализа контекста, продолжаем без него")
            
            context_data = context_result.data if context_result.success else {}
            input_data['context_analysis'] = context_data
            
            # 3. Анализ поведения
            self.logger.info("🧠 Шаг 3: Анализ поведения")
            behavior_result = await self.behavior_agent.process(input_data, context)
            
            if not behavior_result.success:
                self.logger.warning("Ошибка анализа поведения, продолжаем без него")
            
            behavior_data = behavior_result.data if behavior_result.success else {}
            input_data['behavior_analysis'] = behavior_data
            
            # 4. Определяем, нужен ли поиск товаров
            if intent_data and intent_data.intent == IntentType.PRODUCT_REQUEST:
                self.logger.info("🛍️ Шаг 4: Поиск товаров")
                product_result = await self._handle_product_search(input_data, context)
                input_data['product_result'] = product_result
            else:
                input_data['product_result'] = None
            
            # 5. Генерация ответа
            self.logger.info("💬 Шаг 5: Генерация ответа")
            response_result = await self.response_agent.process(input_data, context)
            
            if not response_result.success:
                self.logger.warning("Ошибка генерации ответа, используем fallback")
                return self._create_fallback_response("Ошибка генерации ответа")
            
            # 6. Обновляем контекст разговора
            self._update_conversation_context(context, intent_data, input_data)
            
            # 7. Создаем финальный результат
            chain_processing_time = time.time() - chain_start_time
            # Безопасное извлечение данных
            product_result = input_data.get('product_result')
            if product_result is None:
                product_result = {}
            
            context_analysis = input_data.get('context_analysis')
            if context_analysis is None:
                context_analysis = {}
            
            response_data = response_result.data if response_result.data is not None else {}
            
            final_result = AgentResult(
                success=True,
                data={
                    'response': response_data.get('response', ''),
                    'intent': intent_data.intent.value if intent_data else 'unclear',
                    'confidence': intent_data.confidence if intent_data else 0.0,
                    'products': product_result.get('items', []),
                    'context_hints': context_analysis.get('context_hints', []),
                    'personalization': response_data.get('personalization', {}),
                    'processing_steps': [
                        'intent_recognition',
                        'context_analysis', 
                        'behavior_analysis',
                        'product_search' if product_result else None,
                        'response_generation'
                    ]
                },
                confidence=min(intent_data.confidence if intent_data else 0.0, response_result.confidence),
                processing_time=chain_processing_time
            )
            
            return final_result
            
        except Exception as e:
            self.logger.error(f"Ошибка в цепочке агентов: {e}")
            import traceback
            self.logger.error(f"Traceback: {traceback.format_exc()}")
            return self._create_fallback_response(f"Ошибка обработки: {str(e)}")
    
    async def _handle_product_search(self, input_data: Dict[str, Any], context: ConversationContext) -> Dict[str, Any]:
        """Обрабатывает поиск товаров"""
        search_start_time = time.time()
        
        try:
            # Используем стандартный метод process() StyleAgent
            self.logger.info(f"Выполняем поиск товаров для запроса: '{input_data.get('message', '')[:50]}...'")
            
            # Вызываем стандартный метод process() агента
            agent_result = await self.style_agent.process(input_data, context)
            
            search_time = time.time() - search_start_time
            
            if agent_result.success:
                items_count = len(agent_result.data.get('items', []))
                self.logger.info(f"Поиск завершен за {search_time:.2f}с, найдено {items_count} товаров")
                
                return {
                    'items': agent_result.data.get('items', []),
                    'search_performed': True,
                    'search_query': input_data.get('message', ''),
                    'search_time': search_time,
                    'items_count': items_count,
                    'response': agent_result.data.get('response', '')
                }
            else:
                self.logger.warning(f"Поиск не удался: {agent_result.error_message}")
                return {
                    'items': [],
                    'search_performed': False,
                    'error': agent_result.error_message,
                    'search_time': search_time
                }
            
        except Exception as e:
            search_time = time.time() - search_start_time
            self.logger.error(f"Ошибка поиска товаров за {search_time:.2f}с: {e}")
            return {
                'items': [], 
                'search_performed': False, 
                'error': str(e),
                'search_time': search_time
            }
    
    def _get_or_create_context(self, user_id: Optional[int]) -> ConversationContext:
        """Получает или создает контекст пользователя"""
        # Создаем уникальный ключ для пользователя
        user_key = str(user_id) if user_id else f"anonymous_{uuid.uuid4().hex[:8]}"
        
        if user_key not in self.user_contexts:
            # Создаем новый контекст
            user_context = UserContext(
                user_id=user_id,
                session_id=uuid.uuid4().hex,
                last_interaction=datetime.now()
            )
            
            conversation_context = ConversationContext(
                user_context=user_context,
                current_state='greeting'
            )
            
            self.user_contexts[user_key] = conversation_context
            self.logger.info(f"Создан новый контекст для пользователя {user_key}")
        
        return self.user_contexts[user_key]
    
    def _update_conversation_context(self, context: ConversationContext, intent_data, input_data: Dict[str, Any]):
        """Обновляет контекст разговора"""
        # Обновляем состояние разговора
        if intent_data:
            previous_state = context.current_state
            
            if intent_data.intent == IntentType.GREETING:
                context.current_state = 'greeting'
            elif intent_data.intent == IntentType.PRODUCT_REQUEST:
                context.current_state = 'product_search'
            elif intent_data.intent == IntentType.SIZE_HELP:
                context.current_state = 'size_help'
            elif intent_data.intent == IntentType.STYLE_ADVICE:
                context.current_state = 'style_advice'
            elif intent_data.intent == IntentType.COMPLAINT:
                context.current_state = 'complaint'
            elif intent_data.intent == IntentType.QUESTION:
                context.current_state = 'question'
            elif intent_data.intent == IntentType.GOODBYE:
                context.current_state = 'goodbye'
            elif intent_data.intent == IntentType.SMALL_TALK:
                context.current_state = 'small_talk'
            else:
                context.current_state = 'unclear'
            
            # Логируем изменение состояния
            if previous_state != context.current_state:
                self.logger.info(f"Состояние разговора изменилось: {previous_state} -> {context.current_state}")
        
        # Добавляем шаг в поток разговора
        if intent_data:
            context.conversation_flow.append(intent_data.intent.value)
            
            # Ограничиваем длину истории разговора
            if len(context.conversation_flow) > 50:
                context.conversation_flow = context.conversation_flow[-50:]
        
        # Обновляем время последнего взаимодействия
        context.user_context.last_interaction = datetime.now()
        context.user_context.interaction_count += 1
        
        # Обновляем статистику агентов
        if intent_data:
            self.intent_agent.update_stats(AgentResult(success=True), 0.0)
    
    def _prepare_final_response(self, result: AgentResult, context: ConversationContext) -> Dict[str, Any]:
        """Подготавливает финальный ответ"""
        # Проверяем, что data не None
        data = result.data if result.data is not None else {}
        
        return {
            'reply': data.get('response', 'Извините, произошла ошибка. Попробуйте еще раз!'),
            'items': data.get('items', data.get('products', [])),  # Поддержка обоих ключей
            'intent': data.get('intent', 'unclear'),
            'confidence': result.confidence,
            'context_hints': data.get('context_hints', []),
            'personalization': data.get('personalization', {}),
            'processing_time': result.processing_time,
            'conversation_state': context.current_state,
            'user_interaction_count': context.user_context.interaction_count,
            'success': result.success
        }
    
    def _create_error_response(self, error_message: str, processing_time: float) -> Dict[str, Any]:
        """Создает ответ об ошибке"""
        return {
            'reply': f"Извините, произошла ошибка: {error_message}. Попробуйте еще раз!",
            'items': [],
            'intent': 'error',
            'confidence': 0.0,
            'context_hints': ['error_occurred'],
            'personalization': {},
            'processing_time': processing_time,
            'conversation_state': 'error',
            'user_interaction_count': 0,
            'success': False
        }
    
    def _create_fallback_response(self, error_message: str) -> AgentResult:
        """Создает fallback ответ"""
        return FallbackHandler.create_fallback_result(
            error_message,
            {
                'response': "Извините, произошла ошибка. Попробуйте еще раз!",
                'intent': 'unclear',
                'confidence': 0.1,
                'products': [],
                'context_hints': ['fallback_used'],
                'personalization': {}
            }
        )
    
    def _update_system_stats(self, result: AgentResult, processing_time: float):
        """Обновляет статистику системы"""
        self.system_stats['total_conversations'] += 1
        
        if result.success:
            self.system_stats['successful_conversations'] += 1
        else:
            self.system_stats['failed_conversations'] += 1
        
        # Обновляем среднее время обработки
        total_conversations = self.system_stats['total_conversations']
        current_avg = self.system_stats['average_response_time']
        self.system_stats['average_response_time'] = (
            (current_avg * (total_conversations - 1) + processing_time) / total_conversations
        )
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Возвращает статистику системы"""
        stats = self.system_stats.copy()
        
        # Добавляем статистику агентов
        stats['agent_stats'] = {
            'intent_recognition': self.intent_agent.get_stats(),
            'context_analysis': self.context_agent.get_stats(),
            'user_behavior': self.behavior_agent.get_stats(),
            'response_generation': self.response_agent.get_stats(),
            'style_agent': self.style_agent.get_stats()
        }
        
        # Добавляем информацию о контекстах
        stats['active_contexts'] = len(self.user_contexts)
        
        # Добавляем детальную статистику по состояниям разговоров
        state_stats = {}
        for context in self.user_contexts.values():
            state = context.current_state
            state_stats[state] = state_stats.get(state, 0) + 1
        
        stats['conversation_states'] = state_stats
        
        # Добавляем информацию о производительности
        if stats['total_conversations'] > 0:
            stats['success_rate'] = stats['successful_conversations'] / stats['total_conversations']
            stats['failure_rate'] = stats['failed_conversations'] / stats['total_conversations']
        else:
            stats['success_rate'] = 0.0
            stats['failure_rate'] = 0.0
        
        return stats
    
    def reset_user_context(self, user_id: Optional[int] = None):
        """Сбрасывает контекст пользователя"""
        if user_id:
            user_key = str(user_id)
            if user_key in self.user_contexts:
                del self.user_contexts[user_key]
                self.logger.info(f"Контекст пользователя {user_id} сброшен")
        else:
            # Сбрасываем все контексты
            self.user_contexts.clear()
            self.logger.info("Все контексты пользователей сброшены")
    
    def get_user_context(self, user_id: Optional[int]) -> Optional[ConversationContext]:
        """Получает контекст пользователя"""
        user_key = str(user_id) if user_id else None
        return self.user_contexts.get(user_key) if user_key else None
    
    def cleanup_old_contexts(self, max_age_hours: int = 24):
        """Очищает старые контексты"""
        current_time = datetime.now()
        keys_to_remove = []
        
        for user_key, context in self.user_contexts.items():
            if context.user_context.last_interaction:
                age = current_time - context.user_context.last_interaction
                if age.total_seconds() > max_age_hours * 3600:
                    keys_to_remove.append(user_key)
        
        for key in keys_to_remove:
            del self.user_contexts[key]
        
        if keys_to_remove:
            self.logger.info(f"Очищено {len(keys_to_remove)} старых контекстов")
    
    def get_conversation_summary(self, user_id: Optional[int]) -> Dict[str, Any]:
        """Возвращает сводку разговора для пользователя"""
        context = self.get_user_context(user_id)
        if not context:
            return {'error': 'Контекст не найден'}
        
        # Анализируем поток разговора
        intent_counts = {}
        for intent in context.conversation_flow:
            intent_counts[intent] = intent_counts.get(intent, 0) + 1
        
        # Определяем наиболее частые намерения
        most_common_intents = sorted(intent_counts.items(), key=lambda x: x[1], reverse=True)[:3]
        
        return {
            'user_id': context.user_context.user_id,
            'session_id': context.user_context.session_id,
            'interaction_count': context.user_context.interaction_count,
            'conversation_flow': context.conversation_flow,
            'current_state': context.current_state,
            'favorite_categories': context.user_context.favorite_categories,
            'style_preferences': context.user_context.style_preferences,
            'price_range': context.user_context.price_range,
            'size_preferences': context.user_context.size_preferences,
            'last_interaction': context.user_context.last_interaction.isoformat() if context.user_context.last_interaction else None,
            'mood': context.user_context.mood.value,
            'conversation_duration': self._calculate_conversation_duration(context),
            'intent_analysis': {
                'total_intents': len(context.conversation_flow),
                'most_common_intents': most_common_intents,
                'intent_distribution': intent_counts
            },
            'preferences_summary': {
                'has_style_preferences': len(context.user_context.style_preferences) > 0,
                'has_size_preferences': len(context.user_context.size_preferences) > 0,
                'has_price_range': bool(context.user_context.price_range),
                'favorite_categories_count': len(context.user_context.favorite_categories)
            }
        }
    
    def _calculate_conversation_duration(self, context: ConversationContext) -> float:
        """Вычисляет продолжительность разговора в минутах"""
        if not context.user_context.conversation_history:
            return 0.0
        
        first_message = context.user_context.conversation_history[0]['timestamp']
        last_message = context.user_context.conversation_history[-1]['timestamp']
        duration = last_message - first_message
        return duration.total_seconds() / 60
    
    def export_conversation_data(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        """Экспортирует данные разговора в JSON-совместимом формате"""
        if user_id:
            # Экспорт данных конкретного пользователя
            context = self.get_user_context(user_id)
            if not context:
                return {'error': 'Контекст пользователя не найден'}
            
            return {
                'user_data': self.get_conversation_summary(user_id),
                'export_timestamp': datetime.now().isoformat(),
                'export_type': 'single_user'
            }
        else:
            # Экспорт всех данных
            all_contexts = {}
            for user_key, context in self.user_contexts.items():
                try:
                    user_id_from_key = int(user_key) if user_key.isdigit() else None
                    all_contexts[user_key] = self.get_conversation_summary(user_id_from_key)
                except (ValueError, KeyError):
                    continue
            
            return {
                'all_users_data': all_contexts,
                'system_stats': self.get_system_stats(),
                'export_timestamp': datetime.now().isoformat(),
                'export_type': 'all_users',
                'total_users': len(all_contexts)
            }
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Возвращает метрики производительности системы"""
        stats = self.get_system_stats()
        
        # Вычисляем дополнительные метрики
        total_agents = len(stats['agent_stats'])
        agent_success_rates = {}
        
        for agent_name, agent_stats in stats['agent_stats'].items():
            total_requests = agent_stats.get('requests_processed', 0)
            successful_requests = agent_stats.get('successful_requests', 0)
            
            if total_requests > 0:
                success_rate = successful_requests / total_requests
                agent_success_rates[agent_name] = {
                    'success_rate': success_rate,
                    'total_requests': total_requests,
                    'average_processing_time': agent_stats.get('average_processing_time', 0.0)
                }
        
        return {
            'overall_success_rate': stats.get('success_rate', 0.0),
            'average_response_time': stats.get('average_response_time', 0.0),
            'agent_performance': agent_success_rates,
            'active_conversations': stats.get('active_contexts', 0),
            'conversation_states_distribution': stats.get('conversation_states', {}),
            'system_health': {
                'total_conversations': stats.get('total_conversations', 0),
                'error_rate': stats.get('failure_rate', 0.0),
                'uptime_metric': 'healthy' if stats.get('success_rate', 0.0) > 0.8 else 'degraded'
            }
        } 