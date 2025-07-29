#!/usr/bin/env python3
"""
Продвинутый агент для распознавания намерений пользователя
"""

import re
import time
from typing import Dict, Any, List, Tuple, Optional
from dataclasses import dataclass
from .base_agent import BaseAgent, IntentResult, IntentType, AgentResult, ConversationContext, FallbackHandler
from openai import AsyncAzureOpenAI
from app.core.config import get_settings

settings = get_settings()

@dataclass
class IntentPattern:
    """Паттерн для распознавания намерений"""
    intent: IntentType
    patterns: List[str]
    confidence: float
    context_hints: List[str]
    entities: List[str]

class IntentRecognitionAgent(BaseAgent):
    """Продвинутый агент для распознавания намерений пользователя"""
    
    def __init__(self):
        super().__init__("intent_recognition")
        self.client = None
        self._initialize_client()
        self._setup_patterns()
        
    def _initialize_client(self):
        """Инициализация OpenAI клиента"""
        if (settings.AZURE_OPENAI_API_KEY and settings.AZURE_OPENAI_API_KEY.strip() and 
            settings.AZURE_OPENAI_ENDPOINT and settings.AZURE_OPENAI_ENDPOINT.strip()):
            self.client = AsyncAzureOpenAI(
                api_version=settings.AZURE_OPENAI_API_VERSION,
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_key=settings.AZURE_OPENAI_API_KEY,
            )
            self.logger.info("Azure OpenAI клиент для IntentRecognitionAgent инициализирован")
        else:
            self.logger.warning("Azure OpenAI параметры не заданы — IntentRecognitionAgent будет использовать fallback")
    
    def _setup_patterns(self):
        """Настройка паттернов для распознавания намерений"""
        self.intent_patterns = [
            # Приветствия
            IntentPattern(
                intent=IntentType.GREETING,
                patterns=[
                    r"привет", r"здравствуй", r"добрый день", r"доброе утро", r"добрый вечер",
                    r"hello", r"hi", r"hey", r"доброго времени суток", r"доброго дня",
                    r"приветствую", r"рад видеть", r"рада видеть"
                ],
                confidence=0.9,
                context_hints=["начало разговора", "вежливость"],
                entities=["greeting_type"]
            ),
            
            # Small talk
            IntentPattern(
                intent=IntentType.SMALL_TALK,
                patterns=[
                    r"как дела", r"как ты", r"что нового", r"как жизнь", r"как настроение",
                    r"how are you", r"what's up", r"how's it going", r"как поживаешь",
                    r"что делаешь", r"чем занимаешься", r"как день", r"как неделя"
                ],
                confidence=0.8,
                context_hints=["общение", "интерес к собеседнику"],
                entities=["small_talk_type"]
            ),
            
            # Запросы товаров
            IntentPattern(
                intent=IntentType.PRODUCT_REQUEST,
                patterns=[
                    r"футболк", r"рубашк", r"джинс", r"плать", r"куртк", r"костюм", r"брюк",
                    r"шорт", r"юбк", r"свитер", r"худи", r"толстовк", r"пиджак", r"пальто",
                    r"кроссовк", r"туфл", r"ботинк", r"сапог", r"сандал", r"кед", r"мокасин",
                    r"покажи", r"найди", r"ищу", r"нужн", r"хочу", r"дай", r"дайте",
                    r"цена", r"стоимость", r"диапазон", r"от", r"до", r"тысяч", r"тенге",
                    r"цвет", r"размер", r"бренд", r"стиль", r"мода", r"одежд", r"обув", r"купить",
                    r"посмотреть", r"выбрать", r"подобрать", r"рекомендуй", r"советуй"
                ],
                confidence=0.85,
                context_hints=["покупка", "выбор", "поиск"],
                entities=["product_type", "price_range", "color", "size", "brand"]
            ),
            
            # Помощь с размерами
            IntentPattern(
                intent=IntentType.SIZE_HELP,
                patterns=[
                    r"размер", r"размеры", r"подобрать размер", r"какой размер", r"мерки",
                    r"рост", r"вес", r"обхват", r"талия", r"грудь", r"бедра", r"плечи",
                    r"size", r"measurement", r"fit", r"подходит", r"не подходит"
                ],
                confidence=0.8,
                context_hints=["размеры", "мерки", "подбор"],
                entities=["body_part", "measurement_type"]
            ),
            
            # Советы по стилю
            IntentPattern(
                intent=IntentType.STYLE_ADVICE,
                patterns=[
                    r"стиль", r"мода", r"тренд", r"модно", r"стильно", r"сочетание",
                    r"образ", r"лук", r"комплект", r"ансамбль", r"гардероб", r"стилист",
                    r"style", r"fashion", r"trend", r"outfit", r"look", r"совет",
                    r"собери", r"собрать", r"подбери", r"подобрать", r"создай", r"создать",
                    r"школ", r"университет", r"колледж", r"работа", r"офис", r"деловой",
                    r"вечеринк", r"праздник", r"торжество", r"свадьб", r"день рождения",
                    r"повседневн", r"каждодневн", r"обычн", r"классик", r"элегантн",
                    r"спорт", r"фитнес", r"тренировк", r"прогулк", r"отдых", r"отпуск"
                ],
                confidence=0.85,
                context_hints=["стиль", "мода", "советы", "образ"],
                entities=["style_type", "occasion", "lifestyle"]
            ),
            
            # Жалобы
            IntentPattern(
                intent=IntentType.COMPLAINT,
                patterns=[
                    r"плохо", r"ужасно", r"не нравится", r"не подходит", r"не работает",
                    r"ошибка", r"проблема", r"неправильно", r"не то", r"не так",
                    r"bad", r"terrible", r"wrong", r"problem", r"issue", r"неудобно"
                ],
                confidence=0.7,
                context_hints=["недовольство", "проблема", "жалоба"],
                entities=["complaint_type", "severity"]
            ),
            
            # Вопросы
            IntentPattern(
                intent=IntentType.QUESTION,
                patterns=[
                    r"что", r"как", r"где", r"когда", r"почему", r"зачем", r"какой",
                    r"what", r"how", r"where", r"when", r"why", r"which", r"\?"
                ],
                confidence=0.6,
                context_hints=["вопрос", "интерес", "любопытство"],
                entities=["question_type", "topic"]
            ),
            
            # Прощание
            IntentPattern(
                intent=IntentType.GOODBYE,
                patterns=[
                    r"пока", r"до свидания", r"до встречи", r"увидимся", r"прощай",
                    r"goodbye", r"bye", r"see you", r"до завтра", r"спасибо, все"
                ],
                confidence=0.9,
                context_hints=["прощание", "завершение"],
                entities=["goodbye_type"]
            )
        ]
    
    async def process(self, input_data: Dict[str, Any], context: ConversationContext) -> AgentResult:
        """Основной метод обработки"""
        start_time = time.time()
        
        try:
            user_message = input_data.get('message', '').strip()
            if not user_message:
                return FallbackHandler.create_fallback_result(
                    "Пустое сообщение",
                    {'intent': IntentType.UNCLEAR, 'confidence': 0.0}
                )
            
            self.logger.info(f"Анализируем намерение: '{user_message}'")
            
            # 1. Анализ с помощью паттернов
            pattern_result = self._analyze_with_patterns(user_message)
            
            # 2. Анализ с помощью AI (если доступен)
            ai_result = None
            if self.client:
                ai_result = await self._analyze_with_ai(user_message, context)
            
            # 3. Объединение результатов
            final_result = self._combine_results(pattern_result, ai_result, context)
            
            # 4. Обновление контекста
            context.current_intent = final_result
            context.previous_intents.append(final_result)
            
            processing_time = time.time() - start_time
            result = AgentResult(
                success=True,
                data={'intent_result': final_result},
                confidence=final_result.confidence,
                processing_time=processing_time
            )
            
            self.update_stats(result, processing_time)
            return result
            
        except Exception as e:
            self.logger.error(f"Ошибка в IntentRecognitionAgent: {e}")
            import traceback
            self.logger.error(f"Traceback: {traceback.format_exc()}")
            processing_time = time.time() - start_time
            return FallbackHandler.create_fallback_result(
                f"Ошибка анализа намерений: {str(e)}",
                {'intent': IntentType.UNCLEAR, 'confidence': 0.1}
            )
    
    def _analyze_with_patterns(self, message: str) -> IntentResult:
        """Анализ намерений с помощью паттернов"""
        message_lower = message.lower()
        best_match = None
        best_confidence = 0.0
        
        # Специальная обработка для запросов типа "покажи кроссовки"
        if any(word in message_lower for word in ["покажи", "найди", "ищу", "нужны", "хочу"]) and \
           any(word in message_lower for word in ["футболк", "рубашк", "джинс", "плать", "куртк", "костюм", "брюк",
                                                 "шорт", "юбк", "свитер", "худи", "толстовк", "пиджак", "пальто",
                                                 "кроссовк", "туфл", "ботинк", "сапог", "сандал", "кед", "мокасин",
                                                 "одежд", "обув"]):
            return IntentResult(
                intent=IntentType.PRODUCT_REQUEST,
                confidence=0.9,
                entities=self._extract_entities(message, ["product_type", "price_range", "color", "size", "brand"]),
                context_hints=["покупка", "выбор", "поиск"]
            )
        
        # Специальная обработка для стилевых запросов типа "собери образ на школу"
        if any(word in message_lower for word in ["собери", "собрать", "подбери", "подобрать", "создай", "создать", "образ", "лук", "комплект"]) and \
           any(word in message_lower for word in ["школ", "университет", "колледж", "работа", "работы", "офис", "деловой", "бизнес",
                                                 "вечеринк", "праздник", "торжество", "свадьб", "день рождения",
                                                 "повседневн", "каждодневн", "обычн", "классик", "элегантн",
                                                 "спорт", "фитнес", "тренировк", "прогулк", "отдых", "отпуск"]):
            return IntentResult(
                intent=IntentType.STYLE_ADVICE,
                confidence=0.95,
                entities=self._extract_entities(message, ["style_type", "occasion", "lifestyle"]),
                context_hints=["стиль", "мода", "советы", "образ"]
            )
        
        # Специальная обработка для коротких уточнений типа "для школы", "школы"
        if len(message_lower.strip()) <= 20 and \
           any(word in message_lower for word in ["школ", "университет", "колледж", "работа", "работы", "офис", "деловой", "бизнес",
                                                 "вечеринк", "праздник", "торжество", "свадьб", "день рождения",
                                                 "повседневн", "каждодневн", "обычн", "классик", "элегантн",
                                                 "спорт", "фитнес", "тренировк", "прогулк", "отдых", "отпуск"]):
            return IntentResult(
                intent=IntentType.STYLE_ADVICE,
                confidence=0.85,
                entities=self._extract_entities(message, ["style_type", "occasion", "lifestyle"]),
                context_hints=["стиль", "мода", "советы", "образ", "уточнение"]
            )
        
        for pattern in self.intent_patterns:
            for regex_pattern in pattern.patterns:
                # Проверяем, что паттерн не пустой и валидный
                if not regex_pattern or not regex_pattern.strip():
                    continue
                
                try:
                    if re.search(regex_pattern, message_lower):
                        # Увеличиваем уверенность при множественных совпадениях
                        confidence = pattern.confidence
                        if best_match and best_match.intent == pattern.intent:
                            confidence = min(1.0, confidence + 0.1)
                        
                        if confidence > best_confidence:
                            best_confidence = confidence
                            best_match = pattern
                        break
                except re.error as e:
                    self.logger.warning(f"Некорректный regex паттерн '{regex_pattern}': {e}")
                    continue
        
        if best_match:
            entities = self._extract_entities(message, best_match.entities)
            return IntentResult(
                intent=best_match.intent,
                confidence=best_confidence,
                entities=entities,
                context_hints=best_match.context_hints
            )
        
        # Если ничего не найдено
        return IntentResult(
            intent=IntentType.UNCLEAR,
            confidence=0.1,
            entities={},
            context_hints=["неопределенное намерение"]
        )
    
    async def _analyze_with_ai(self, message: str, context: ConversationContext) -> Optional[IntentResult]:
        """Анализ намерений с помощью AI"""
        if not self.client:
            self.logger.warning("OpenAI клиент не инициализирован, пропускаем AI анализ")
            return None
            
        try:
            # Создаем промпт для AI
            prompt = self._create_ai_prompt(message, context)
            
            # Добавляем timeout и retry логику
            import asyncio
            try:
                response = await asyncio.wait_for(
                    self.client.chat.completions.create(
                        model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
                        messages=[
                            {"role": "system", "content": self._get_system_prompt()},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.3,
                        max_tokens=200
                    ),
                    timeout=10.0  # 10 секунд timeout
                )
                
                ai_response = response.choices[0].message.content.strip()
                return self._parse_ai_response(ai_response)
                
            except asyncio.TimeoutError:
                self.logger.warning("Timeout при обращении к OpenAI API")
                return None
            except Exception as api_error:
                self.logger.error(f"Ошибка OpenAI API: {api_error}")
                return None
                
        except Exception as e:
            self.logger.error(f"Ошибка AI анализа: {e}")
            return None
    
    def _create_ai_prompt(self, message: str, context: ConversationContext) -> str:
        """Создает промпт для AI анализа"""
        history = ""
        if context.conversation_flow:
            history = f"История разговора: {' -> '.join(context.conversation_flow[-3:])}\n"
        
        return f"""
{history}
Сообщение пользователя: "{message}"

Проанализируй намерение пользователя и верни JSON в формате:
{{
    "intent": "greeting|small_talk|product_request|size_help|style_advice|complaint|question|goodbye|unclear",
    "confidence": 0.0-1.0,
    "entities": {{"key": "value"}},
    "context_hints": ["hint1", "hint2"],
    "alternative_intents": ["intent1", "intent2"]
}}
"""
    
    def _get_system_prompt(self) -> str:
        """Системный промпт для AI"""
        return """Ты эксперт по анализу намерений пользователей в чате с ИИ-стилистом.

ТИПЫ НАМЕРЕНИЙ:
- greeting: приветствия, начало разговора
- small_talk: обычное общение, вопросы о делах
- product_request: запросы товаров, покупки, поиск
- size_help: помощь с размерами, мерки
- style_advice: советы по стилю, мода
- complaint: жалобы, недовольство
- question: общие вопросы
- goodbye: прощание, завершение
- unclear: неопределенное намерение

ТРЕБОВАНИЯ:
1. Отвечай ТОЛЬКО в JSON формате
2. Будь точным в определении намерений
3. Учитывай контекст разговора
4. Извлекай ключевые сущности
5. Указывай уровень уверенности 0.0-1.0"""
    
    def _parse_ai_response(self, response: str) -> Optional[IntentResult]:
        """Парсит ответ AI"""
        try:
            import json
            data = json.loads(response)
            
            intent_map = {
                'greeting': IntentType.GREETING,
                'small_talk': IntentType.SMALL_TALK,
                'product_request': IntentType.PRODUCT_REQUEST,
                'size_help': IntentType.SIZE_HELP,
                'style_advice': IntentType.STYLE_ADVICE,
                'complaint': IntentType.COMPLAINT,
                'question': IntentType.QUESTION,
                'goodbye': IntentType.GOODBYE,
                'unclear': IntentType.UNCLEAR
            }
            
            intent = intent_map.get(data.get('intent', 'unclear'), IntentType.UNCLEAR)
            confidence = float(data.get('confidence', 0.5))
            entities = data.get('entities', {})
            context_hints = data.get('context_hints', [])
            alternative_intents = [
                intent_map.get(alt, IntentType.UNCLEAR) 
                for alt in data.get('alternative_intents', [])
            ]
            
            return IntentResult(
                intent=intent,
                confidence=confidence,
                entities=entities,
                context_hints=context_hints,
                alternative_intents=alternative_intents
            )
            
        except Exception as e:
            self.logger.error(f"Ошибка парсинга AI ответа: {e}")
            return None
    
    def _combine_results(self, pattern_result: IntentResult, ai_result: Optional[IntentResult], context: ConversationContext) -> IntentResult:
        """Объединяет результаты паттернов и AI"""
        if not ai_result:
            return pattern_result
        
        # Если AI более уверен, используем его результат
        if ai_result.confidence > pattern_result.confidence + 0.1:
            return ai_result
        
        # Если паттерны более уверенны, используем их
        if pattern_result.confidence > ai_result.confidence + 0.1:
            return pattern_result
        
        # Если уверенность близка, объединяем результаты
        combined_entities = {**pattern_result.entities, **ai_result.entities}
        combined_hints = list(set(pattern_result.context_hints + ai_result.context_hints))
        
        # Выбираем намерение с большей уверенностью
        final_intent = ai_result.intent if ai_result.confidence > pattern_result.confidence else pattern_result.intent
        final_confidence = max(ai_result.confidence, pattern_result.confidence)
        
        return IntentResult(
            intent=final_intent,
            confidence=final_confidence,
            entities=combined_entities,
            context_hints=combined_hints,
            alternative_intents=ai_result.alternative_intents
        )
    
    def _extract_entities(self, message: str, entity_types: List[str]) -> Dict[str, Any]:
        """Извлекает сущности из сообщения"""
        entities = {}
        message_lower = message.lower()
        
        # Извлечение типа товара
        if 'product_type' in entity_types:
            product_types = {
                'футболк': 'футболка', 'рубашк': 'рубашка', 'джинс': 'джинсы', 
                'плать': 'платье', 'куртк': 'куртка', 'костюм': 'костюм', 'брюк': 'брюки',
                'шорт': 'шорты', 'юбк': 'юбка', 'свитер': 'свитер', 'худи': 'худи', 
                'толстовк': 'толстовка', 'пиджак': 'пиджак', 'пальто': 'пальто',
                'кроссовк': 'кроссовки', 'туфл': 'туфли', 'ботинк': 'ботинки', 
                'сапог': 'сапоги', 'сандал': 'сандалии', 'кед': 'кеды', 'мокасин': 'мокасины',
                'одежд': 'одежда', 'обув': 'обувь'
            }
            
            found_products = []
            for pattern, product_type in product_types.items():
                if pattern in message_lower:
                    found_products.append(product_type)
            
            if found_products:
                entities['product_types'] = found_products
        
        # Извлечение ценового диапазона
        if 'price_range' in entity_types:
            price_match = re.search(r'(\d+)\s*-\s*(\d+)', message)
            if price_match:
                entities['price_range'] = {
                    'min': int(price_match.group(1)),
                    'max': int(price_match.group(2))
                }
            else:
                # Поиск отдельных цен
                price_matches = re.findall(r'(\d+)\s*(?:тенге|₸|руб|₽)', message)
                if price_matches:
                    prices = [int(p) for p in price_matches]
                    entities['price_range'] = {
                        'min': min(prices),
                        'max': max(prices)
                    }
        
        # Извлечение цветов
        if 'color' in entity_types:
            colors = ['черный', 'белый', 'красный', 'синий', 'зеленый', 'желтый', 'серый', 'розовый', 
                     'голубой', 'фиолетовый', 'оранжевый', 'коричневый', 'бежевый', 'сиреневый']
            found_colors = [color for color in colors if color in message_lower]
            if found_colors:
                entities['colors'] = found_colors
        
        # Извлечение размеров
        if 'size' in entity_types:
            sizes = ['xs', 's', 'm', 'l', 'xl', 'xxl', 'xxs', 'xxxl']
            found_sizes = [size for size in sizes if size in message_lower]
            if found_sizes:
                entities['sizes'] = found_sizes
        
        # Извлечение брендов
        if 'brand' in entity_types:
            brands = ['adidas', 'nike', 'puma', 'reebok', 'converse', 'vans', 'tommy hilfiger', 
                     'calvin klein', 'levis', 'wrangler', 'boss', 'dickies', 'tom tailor', 
                     'finn flare', 'sela']
            found_brands = [brand for brand in brands if brand in message_lower]
            if found_brands:
                entities['brands'] = found_brands
        
        # Извлечение стилевых предпочтений и поводов
        if 'style_type' in entity_types or 'occasion' in entity_types or 'lifestyle' in entity_types:
            style_occasions = {
                'школ': 'школа', 'университет': 'университет', 'колледж': 'колледж',
                'работа': 'работа', 'работы': 'работа', 'офис': 'офис', 'деловой': 'деловой стиль', 'бизнес': 'деловой стиль',
                'вечеринк': 'вечеринка', 'праздник': 'праздник', 'торжество': 'торжество',
                'свадьб': 'свадьба', 'день рождения': 'день рождения',
                'повседневн': 'повседневный', 'каждодневн': 'повседневный', 'обычн': 'повседневный',
                'классик': 'классический', 'элегантн': 'элегантный',
                'спорт': 'спортивный', 'фитнес': 'спортивный', 'тренировк': 'спортивный',
                'прогулк': 'прогулка', 'отдых': 'отдых', 'отпуск': 'отпуск'
            }
            
            found_occasions = []
            for pattern, occasion in style_occasions.items():
                if pattern in message_lower:
                    found_occasions.append(occasion)
            
            if found_occasions:
                entities['occasions'] = found_occasions
                entities['style_type'] = found_occasions[0]  # Основной повод
        
        return entities 