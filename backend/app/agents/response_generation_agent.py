#!/usr/bin/env python3
"""
Агент для генерации персонализированных ответов
"""

import time
from typing import Dict, Any, List, Optional
from .base_agent import BaseAgent, AgentResult, ConversationContext, UserMood, FallbackHandler
from .intent_recognition_agent import IntentType
from openai import AsyncAzureOpenAI
from app.core.config import get_settings

settings = get_settings()

class ResponseGenerationAgent(BaseAgent):
    """Агент для генерации персонализированных ответов"""
    
    def __init__(self):
        super().__init__("response_generation")
        self.client = None
        self._initialize_client()
        self.response_templates = self._setup_response_templates()
        
    def _initialize_client(self):
        """Инициализация OpenAI клиента"""
        if (settings.AZURE_OPENAI_API_KEY and settings.AZURE_OPENAI_API_KEY.strip() and 
            settings.AZURE_OPENAI_ENDPOINT and settings.AZURE_OPENAI_ENDPOINT.strip()):
            self.client = AsyncAzureOpenAI(
                api_version=settings.AZURE_OPENAI_API_VERSION,
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_key=settings.AZURE_OPENAI_API_KEY,
            )
            self.logger.info("Azure OpenAI клиент для ResponseGenerationAgent инициализирован")
        else:
            self.logger.warning("Azure OpenAI параметры не заданы — ResponseGenerationAgent будет использовать шаблоны")
    
    def _setup_response_templates(self) -> Dict[str, List[str]]:
        """Настройка шаблонов ответов"""
        return {
            'greeting': [
                "Привет! 👋 Я ваш ИИ-стилист и готов помочь с выбором одежды! 😊 Что вас интересует?",
                "Здравствуйте! 🌟 Я ваш персональный стилист-консультант. Готов помочь создать идеальный образ! ✨",
                "Приветствую! 🎉 Я ИИ-стилист, специализируюсь на подборе стильной одежды. Чем могу помочь? 💫"
            ],
            'small_talk': [
                "Отлично, спасибо! 😊 А как у вас дела? Готов помочь с выбором одежды! 👗",
                "Все хорошо, работаю над созданием стильных образов! 🌟 А вы готовы обновить гардероб? ✨",
                "Прекрасно! 💫 Я всегда в хорошем настроении, особенно когда помогаю с выбором одежды! 👕"
            ],
            'product_request': [
                "Отлично! 🎯 Давайте найдем именно то, что вам нужно. Расскажите подробнее о ваших предпочтениях! 💫",
                "Понял! 🔍 Сейчас подберу лучшие варианты специально для вас. Что именно ищете? ✨",
                "Конечно! 🛍️ Я помогу найти идеальные товары. Какие у вас пожелания по стилю и бюджету? 💎"
            ],
            'size_help': [
                "Конечно! 📏 Я помогу подобрать идеальный размер. Расскажите о ваших параметрах! 📐",
                "Отлично! 👕 Размеры очень важны для комфорта. Давайте определим ваш идеальный размер! 📊",
                "Помогу! 🎯 Правильный размер - залог стильного образа. Какие у вас мерки? 📏"
            ],
            'style_advice': [
                "С удовольствием! 💡 Я дам профессиональные советы по стилю. Что вас интересует? ✨",
                "Конечно! 🌟 Я помогу создать идеальный образ. Расскажите о вашем стиле! 💫",
                "Отлично! 🎨 Стиль - это искусство! Давайте создадим ваш уникальный образ! 🎭"
            ],
            'complaint': [
                "Понимаю ваше беспокойство! 😔 Давайте решим эту проблему вместе. Что именно не понравилось? 🤝",
                "Извините за неудобства! 🙏 Я обязательно помогу исправить ситуацию. Расскажите подробнее? 💪",
                "Спасибо за обратную связь! 📝 Ваше мнение важно для нас. Давайте найдем решение! 🔧"
            ],
            'question': [
                "Отличный вопрос! 🤔 С удовольствием отвечу. Что именно вас интересует? 💡",
                "Конечно! 📚 Я знаю много интересного о моде и стиле. Задавайте вопросы! 🎓",
                "Рад помочь! 💫 У меня есть ответы на все вопросы о стиле и одежде! 🌟"
            ],
            'goodbye': [
                "До встречи! 👋 Было приятно помочь! Надеюсь, наш разговор был полезным! ✨",
                "Всего доброго! 🌟 Удачи в создании стильных образов! Буду рад помочь снова! 💫",
                "До свидания! 🎉 Спасибо за общение! Приходите еще за стильными советами! 👋"
            ],
            'unclear': [
                "Извините, не совсем понял! 🤔 Можете переформулировать? Я готов помочь! 💪",
                "Не уверен, что понял правильно! 😅 Расскажите подробнее, что вас интересует? 💡",
                "Давайте уточним! 🎯 Что именно вы хотели узнать или найти? Готов помочь! ✨"
            ]
        }
    
    async def process(self, input_data: Dict[str, Any], context: ConversationContext) -> AgentResult:
        """Основной метод обработки"""
        start_time = time.time()
        
        try:
            user_message = input_data.get('message', '')
            intent_result = input_data.get('intent_result')
            behavior_analysis = input_data.get('behavior_analysis', {})
            
            self.logger.info(f"Генерируем персонализированный ответ")
            
            # 1. Анализ контекста для персонализации
            personalization_context = self._create_personalization_context(context, behavior_analysis)
            
            # 2. Генерация ответа
            if self.client:
                response = await self._generate_ai_response(user_message, intent_result, personalization_context)
            else:
                response = self._generate_template_response(intent_result, personalization_context)
            
            # 3. Персонализация ответа
            personalized_response = self._personalize_response(response, personalization_context)
            
            # 4. Добавление контекстных подсказок
            final_response = self._add_context_hints(personalized_response, context, intent_result)
            
            processing_time = time.time() - start_time
            result = AgentResult(
                success=True,
                data={'response': final_response, 'personalization': personalization_context},
                confidence=0.9,
                processing_time=processing_time
            )
            
            self.update_stats(result, processing_time)
            return result
            
        except Exception as e:
            self.logger.error(f"Ошибка в ResponseGenerationAgent: {e}")
            processing_time = time.time() - start_time
            return FallbackHandler.create_fallback_result(
                f"Ошибка генерации ответа: {str(e)}",
                {'response': "Извините, произошла ошибка. Попробуйте еще раз!"}
            )
    
    def _create_personalization_context(self, context: ConversationContext, behavior_analysis: Dict) -> Dict[str, Any]:
        """Создает контекст для персонализации"""
        user_context = context.user_context
        
        personalization = {
            'user_mood': user_context.mood.value,
            'interaction_count': user_context.interaction_count,
            'is_first_time': user_context.interaction_count <= 2,
            'is_returning_user': user_context.interaction_count > 5,
            'favorite_categories': user_context.favorite_categories,
            'style_preferences': user_context.style_preferences,
            'price_range': user_context.price_range,
            'size_preferences': user_context.size_preferences,
            'conversation_history_length': len(user_context.conversation_history),
            'engagement_level': self._calculate_engagement_level(context),
            'behavior_patterns': behavior_analysis.get('behavior_patterns', {}).get('dominant_patterns', []),
            'preferences_confidence': behavior_analysis.get('preferences_analysis', {}).get('preferences_confidence', 0.5)
        }
        
        return personalization
    
    async def _generate_ai_response(self, user_message: str, intent_result, personalization_context: Dict) -> str:
        """Генерирует ответ с помощью AI"""
        try:
            prompt = self._create_ai_prompt(user_message, intent_result, personalization_context)
            
            response = await self.client.chat.completions.create(
                model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
                messages=[
                    {"role": "system", "content": self._get_system_prompt()},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=300
            )
            
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            self.logger.error(f"Ошибка AI генерации: {e}")
            return self._generate_template_response(intent_result, personalization_context)
    
    def _generate_template_response(self, intent_result, personalization_context: Dict) -> str:
        """Генерирует ответ на основе шаблонов"""
        if not intent_result:
            return self.response_templates['unclear'][0]
        
        intent_type = intent_result.intent.value
        templates = self.response_templates.get(intent_type, self.response_templates['unclear'])
        
        # Выбираем шаблон на основе персонализации
        selected_template = self._select_template(templates, personalization_context)
        
        return selected_template
    
    def _personalize_response(self, response: str, personalization_context: Dict) -> str:
        """Персонализирует ответ"""
        # Добавляем персонализированные элементы
        if personalization_context.get('is_first_time'):
            response += "\n\n💡 Совет: Я запоминаю ваши предпочтения, чтобы предлагать более подходящие варианты!"
        
        if personalization_context.get('favorite_categories'):
            categories = ', '.join(personalization_context['favorite_categories'][:2])
            response += f"\n\n🎯 Кстати, я помню, что вам нравятся: {categories}"
        
        if personalization_context.get('user_mood') == 'excited':
            response += "\n\n🌟 Отлично, что вы в таком хорошем настроении! Это поможет создать еще более стильный образ!"
        
        if personalization_context.get('user_mood') == 'confused':
            response += "\n\n🤝 Не волнуйтесь, я помогу разобраться! Давайте начнем с простого."
        
        return response
    
    def _add_context_hints(self, response: str, context: ConversationContext, intent_result) -> str:
        """Добавляет контекстные подсказки"""
        if not intent_result:
            return response
        
        # Добавляем подсказки в зависимости от намерения
        if intent_result.intent == IntentType.PRODUCT_REQUEST:
            if context.user_context.favorite_categories:
                response += "\n\n💡 Можете уточнить категорию или стиль, который вас интересует?"
            else:
                response += "\n\n💡 Расскажите о ваших предпочтениях: стиль, цвет, бюджет?"
        
        elif intent_result.intent == IntentType.SIZE_HELP:
            response += "\n\n📏 Для точного подбора размера мне понадобятся ваши мерки: рост, вес, обхваты."
        
        elif intent_result.intent == IntentType.STYLE_ADVICE:
            response += "\n\n🎨 Расскажите о вашем стиле жизни и предпочтениях, чтобы я дал более точные советы!"
        
        return response
    
    def _create_ai_prompt(self, user_message: str, intent_result, personalization_context: Dict) -> str:
        """Создает промпт для AI"""
        intent_info = f"Намерение: {intent_result.intent.value}" if intent_result else "Намерение: unclear"
        
        personalization_info = f"""
Персонализация:
- Настроение: {personalization_context.get('user_mood', 'neutral')}
- Количество взаимодействий: {personalization_context.get('interaction_count', 0)}
- Любимые категории: {', '.join(personalization_context.get('favorite_categories', []))}
- Стилевые предпочтения: {', '.join(personalization_context.get('style_preferences', []))}
- Уровень вовлеченности: {personalization_context.get('engagement_level', 'medium')}
"""
        
        return f"""
Сообщение пользователя: "{user_message}"
{intent_info}
{personalization_info}

Создай персонализированный, дружелюбный ответ:
- Учитывай настроение пользователя
- Используй эмодзи
- Будь естественным и разговорным
- Предложи конкретную помощь
- Учитывай предыдущие предпочтения
- Адаптируйся к уровню вовлеченности
"""
    
    def _get_system_prompt(self) -> str:
        """Системный промпт для AI"""
        return """Ты - дружелюбный ИИ-стилист-консультант в магазине одежды.

ТВОИ КАЧЕСТВА:
- Дружелюбный и энергичный
- Профессиональный в вопросах стиля
- Персонализированный подход
- Используешь эмодзи для живости
- Естественный разговорный стиль
- Помогаешь с выбором одежды

СТИЛЬ ОБЩЕНИЯ:
- Теплый и приветливый
- Используй эмодзи (но не переборщи)
- Разговорный тон
- Персонализированные предложения
- Конкретная помощь
- Учет предпочтений пользователя

НЕ ДЕЛАЙ:
- Слишком формальный тон
- Много эмодзи подряд
- Длинные ответы
- Повторение одних и тех же фраз
- Игнорирование контекста"""
    
    def _select_template(self, templates: List[str], personalization_context: Dict) -> str:
        """Выбирает подходящий шаблон"""
        if not templates:
            return "Извините, произошла ошибка. Попробуйте еще раз!"
        
        # Простая логика выбора шаблона
        if personalization_context.get('is_first_time'):
            # Для новых пользователей выбираем более подробные шаблоны
            return templates[0] if len(templates) > 0 else templates[0]
        elif personalization_context.get('is_returning_user'):
            # Для постоянных пользователей выбираем более краткие шаблоны
            return templates[-1] if len(templates) > 1 else templates[0]
        else:
            # Для остальных выбираем случайный шаблон
            import random
            return random.choice(templates)
    
    def _calculate_engagement_level(self, context: ConversationContext) -> str:
        """Вычисляет уровень вовлеченности"""
        interaction_count = context.user_context.interaction_count
        
        if interaction_count < 3:
            return 'low'
        elif interaction_count < 10:
            return 'medium'
        else:
            return 'high' 