import logging
import asyncio
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, desc, asc, text
from app.db.models.item import Item
from app.db.models.user import User
from app.db.models.associations import user_favorite_items, UserView
from app.core.config import get_settings
from openai import AsyncAzureOpenAI
import re, json
from app.api.v1.endpoints.profile.schemas import ProfileOut
from app.api.v1.endpoints.items.service import (
    list_items, trending_items, similar_items, 
    list_favorite_items, viewed_items
)
from .base_agent import BaseAgent, AgentResult, ConversationContext

logger = logging.getLogger(__name__)
settings = get_settings()

ITEM_SCHEMA_STR = (
    "id (int), name (str), brand (str), color (str), size (str), clothing_type (str), "
    "description (str), price (float), category (str), article (str), style (str), "
    "collection (str), image_url (str), created_at (datetime), updated_at (datetime)"
)

class StyleAgent(BaseAgent):
    def __init__(self):
        super().__init__("style_agent")
        self.client = None
        self.conversation_state = 'greeting'  # Состояние диалога
        self.user_interests = []  # Интересы пользователя
        self._initialize_client()

    def _initialize_client(self):
        if (settings.AZURE_OPENAI_API_KEY and settings.AZURE_OPENAI_API_KEY.strip() and 
            settings.AZURE_OPENAI_ENDPOINT and settings.AZURE_OPENAI_ENDPOINT.strip()):
            self.client = AsyncAzureOpenAI(
                api_version=settings.AZURE_OPENAI_API_VERSION,
                azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
                api_key=settings.AZURE_OPENAI_API_KEY,
            )
            logger.info("Azure OpenAI клиент для StyleAgent инициализирован")
        else:
            logger.warning("Azure OpenAI параметры не заданы — StyleAgent не будет работать")

    def _is_greeting(self, user_message: str) -> bool:
        """Определяет приветственные сообщения"""
        greeting_patterns = [
            r"привет", r"здравствуй", r"добрый день", r"доброе утро", r"добрый вечер",
            r"hello", r"hi", r"hey", r"доброго времени суток"
        ]
        
        msg = user_message.lower()
        result = any(re.search(p, msg) for p in greeting_patterns)
        logger.info(f"_is_greeting('{user_message}') = {result}")
        return result

    def _is_positive_response(self, user_message: str) -> bool:
        """Определяет положительные ответы"""
        positive_patterns = [
            r"да", r"конечно", r"хочу", r"интересно", r"помоги", r"давай", r"хорошо",
            r"yes", r"sure", r"ok", r"okay", r"хотел бы", r"хотела бы", r"помогите"
        ]
        
        msg = user_message.lower()
        result = any(re.search(p, msg) for p in positive_patterns)
        logger.info(f"_is_positive_response('{user_message}') = {result}")
        return result

    def _is_product_request(self, user_message: str) -> bool:
        """Определяет запросы на товары"""
        product_patterns = [
            r"футболк", r"рубашк", r"джинс", r"плать", r"куртк", r"костюм", r"брюк",
            r"покажи", r"найди", r"ищу", r"нужн", r"хочу", r"дай", r"дайте",
            r"цена", r"стоимость", r"диапазон", r"от", r"до", r"тысяч", r"тенге",
            r"цвет", r"размер", r"бренд", r"стиль", r"мода", r"одежд",
            r"вечеринк", r"праздн", r"торжеств", r"выход", r"выходн", r"событи",
            r"образ", r"лук", r"комплект", r"наряд", r"что одеть", r"что надеть",
            r"подобрать", r"выбрать", r"купить", r"приобрести"
        ]
        
        msg = user_message.lower()
        result = any(re.search(p, msg) for p in product_patterns)
        logger.info(f"_is_product_request('{user_message}') = {result}")
        return result

    async def _handle_greeting(self, user_message: str, user_profile: ProfileOut = None) -> Dict[str, Any]:
        """Обрабатывает приветствие и предлагает помощь"""
        logger.info(f"_handle_greeting вызван с сообщением: '{user_message}'")
        
        user_info = ""
        if user_profile:
            user_info = (
                f"\nДанные пользователя:\n"
                f"Рост: {user_profile.height or '-'} см, Вес: {user_profile.weight or '-'} кг, "
                f"Обхват груди: {user_profile.chest or '-'} см, талии: {user_profile.waist or '-'} см, бёдер: {user_profile.hips or '-'} см. "
                f"Любимые бренды: {', '.join(user_profile.favorite_brands) if user_profile.favorite_brands else '-'}; "
                f"Любимые цвета: {', '.join(user_profile.favorite_colors) if user_profile.favorite_colors else '-'}"
            )
        
        prompt = (
            f"Пользователь написал: '{user_message}'. "
            "Ты — живой, дружелюбный и энергичный ИИ-консультант-стилист в магазине одежды. "
            "Пользователь только что поздоровался с тобой. "
            "Отвечай тепло, представься как ИИ-стилист, предложи свою помощь. "
            "Спроси, что интересует пользователя, можешь ли ты помочь с выбором одежды. "
            "Используй разговорный стиль, эмодзи, будь дружелюбным."
            f"{user_info}\n"
            "ВАЖНО: НЕ предлагай конкретные товары пока, только предложи помощь и спроси интересы."
        )
        
        try:
            response = await self.client.chat.completions.create(
                model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
                messages=[
                    {"role": "system", "content": "Ты — живой, дружелюбный ИИ-консультант-стилист. Отвечай тепло, используй эмодзи, НЕ предлагай товары пока, только предложи помощь."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=200
            )
            answer = response.choices[0].message.content.strip()
            
            # Переходим к следующему состоянию
            self.conversation_state = 'waiting_for_interest'
            logger.info(f"Состояние изменено на: {self.conversation_state}")
            
            return {"reply": answer, "items": []}
        except Exception as e:
            logger.error(f"StyleAgent Azure OpenAI error (greeting): {e}")
            self.conversation_state = 'waiting_for_interest'
            logger.info(f"Состояние изменено на: {self.conversation_state} (fallback)")
            return {"reply": "Привет! 👋 Я ваш ИИ-стилист и готов помочь с выбором одежды! 😊 Что вас интересует? Могу помочь подобрать что-то стильное и подходящее именно вам!", "items": []}

    async def _handle_interest_confirmation(self, user_message: str, user_profile: ProfileOut = None) -> Dict[str, Any]:
        """Обрабатывает подтверждение интереса и предлагает варианты"""
        prompt = (
            f"Пользователь подтвердил интерес к помощи: '{user_message}'. "
            "Ты — ИИ-консультант-стилист. Пользователь согласился на твою помощь. "
            "Предложи несколько вариантов того, что ты можешь помочь выбрать: "
            "- Повседневную одежду (футболки, джинсы, рубашки) "
            "- Деловую одежду (костюмы, рубашки, брюки) "
            "- Спортивную одежду "
            "- Одежду для особых случаев "
            "- Помощь с размерами и стилем "
            "Будь дружелюбным, используй эмодзи, спроси что именно интересует."
        )
        
        try:
            response = await self.client.chat.completions.create(
                model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
                messages=[
                    {"role": "system", "content": "Ты — ИИ-консультант-стилист. Предложи варианты помощи, будь дружелюбным, используй эмодзи."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=250
            )
            answer = response.choices[0].message.content.strip()
            
            # Переходим к предложению вариантов
            self.conversation_state = 'suggesting_options'
            
            return {"reply": answer, "items": []}
        except Exception as e:
            logger.error(f"StyleAgent Azure OpenAI error (interest): {e}")
            self.conversation_state = 'suggesting_options'
            return {"reply": "Отлично! 😊 Я могу помочь вам с выбором:\n\n👕 Повседневной одежды (футболки, джинсы, рубашки)\n👔 Деловой одежды (костюмы, рубашки)\n🏃‍♀️ Спортивной одежды\n✨ Одежды для особых случаев\n📏 Помощью с размерами и стилем\n\nЧто именно вас интересует?", "items": []}

    async def _suggest_options(self, user_message: str, user_profile: ProfileOut = None) -> Dict[str, Any]:
        """Предлагает конкретные варианты на основе интересов пользователя"""
        # Анализируем интересы пользователя
        interests = []
        msg_lower = user_message.lower()
        
        if any(word in msg_lower for word in ['повседневн', 'casual', 'обычн']):
            interests.append('повседневная одежда')
        if any(word in msg_lower for word in ['делов', 'офис', 'business', 'рабоч']):
            interests.append('деловая одежда')
        if any(word in msg_lower for word in ['спорт', 'sport', 'тренировк']):
            interests.append('спортивная одежда')
        if any(word in msg_lower for word in ['особ', 'вечерн', 'праздн', 'торжествен']):
            interests.append('одежда для особых случаев')
        if any(word in msg_lower for word in ['размер', 'размеры', 'подобрать']):
            interests.append('помощь с размерами')
        
        # Если интересы не определены, предлагаем общие варианты
        if not interests:
            interests = ['повседневная одежда', 'деловая одежда', 'спортивная одежда']
        
        prompt = (
            f"Пользователь интересуется: '{user_message}'. "
            f"Определенные интересы: {', '.join(interests)}. "
            "Предложи конкретные варианты одежды, которые можно выбрать. "
            "Например: футболки, рубашки, джинсы, платья, куртки и т.д. "
            "Будь конкретным, но не слишком длинным. Используй эмодзи."
        )
        
        try:
            response = await self.client.chat.completions.create(
                model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
                messages=[
                    {"role": "system", "content": "Ты — ИИ-консультант-стилист. Предложи конкретные варианты одежды, будь кратким, используй эмодзи."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=200
            )
            answer = response.choices[0].message.content.strip()
            
            # Переходим к поиску товаров
            self.conversation_state = 'searching_products'
            
            return {"reply": answer, "items": []}
        except Exception as e:
            logger.error(f"StyleAgent Azure OpenAI error (suggestions): {e}")
            self.conversation_state = 'searching_products'
            return {"reply": "Отлично! 😊 Вот что я могу предложить:\n\n👕 Футболки и рубашки\n👖 Джинсы и брюки\n👗 Платья и юбки\n🧥 Куртки и пальто\n👟 Обувь\n\nЧто именно хотите посмотреть? Могу найти конкретные товары!", "items": []}

    def is_small_talk(self, user_message: str) -> bool:
        """Определяет small talk сообщения"""
        small_talk_patterns = [
            r"привет", r"здравствуй", r"добрый день", r"как дела", r"что нового",
            r"как ты", r"чем занимаешься", r"что делаешь", r"как жизнь", r"как настроение",
            r"hello", r"hi", r"how are you", r"what's up", r"good morning", r"good evening", 
            r"спасибо", r"thanks", r"хорошо", r"плохо", r"нормально", r"отлично"
        ]
        
        # Проверяем, есть ли в сообщении запрос на товары
        shopping_patterns = [
            r"футболк", r"рубашк", r"джинс", r"плать", r"куртк", r"костюм", r"брюк",
            r"покажи", r"найди", r"ищу", r"нужн", r"хочу", r"дай", r"дайте",
            r"цена", r"стоимость", r"диапазон", r"от", r"до", r"тысяч", r"тенге",
            r"цвет", r"размер", r"бренд", r"стиль", r"мода"
        ]
        
        msg = user_message.lower()
        
        # Если есть слова о покупках, это не small talk
        if any(re.search(p, msg) for p in shopping_patterns):
            return False
            
        # Иначе проверяем на small talk
        return any(re.search(p, msg) for p in small_talk_patterns)

    def _analyze_user_preferences(self, db: Session, user_profile: ProfileOut = None) -> Dict[str, Any]:
        """Анализирует предпочтения пользователя на основе профиля и истории"""
        preferences = {
            'favorite_brands': [],
            'favorite_colors': [],
            'favorite_categories': [],
            'price_range': {'min': 0, 'max': float('inf')},
            'size_preferences': [],
            'style_preferences': []
        }
        
        if user_profile:
            preferences['favorite_brands'] = user_profile.favorite_brands or []
            preferences['favorite_colors'] = user_profile.favorite_colors or []
            
            # Анализируем размеры на основе параметров тела
            if user_profile.height and user_profile.weight:
                # Простая логика определения размера
                if user_profile.height < 160:
                    preferences['size_preferences'].extend(['XS', 'S'])
                elif user_profile.height < 170:
                    preferences['size_preferences'].extend(['S', 'M'])
                elif user_profile.height < 180:
                    preferences['size_preferences'].extend(['M', 'L'])
                else:
                    preferences['size_preferences'].extend(['L', 'XL', 'XXL'])
        
        return preferences

    def _get_market_insights(self, db: Session) -> Dict[str, Any]:
        """Получает аналитику рынка и тренды"""
        insights = {}
        
        # Популярные бренды
        brand_stats = db.query(
            Item.brand, 
            func.count(Item.id).label('count'),
            func.avg(Item.price).label('avg_price')
        ).filter(
            Item.brand.isnot(None)
        ).group_by(Item.brand).order_by(desc('count')).limit(10).all()
        
        insights['popular_brands'] = [
            {'brand': brand, 'count': count, 'avg_price': float(avg_price) if avg_price else 0}
            for brand, count, avg_price in brand_stats
        ]
        
        # Популярные категории
        category_stats = db.query(
            Item.category,
            func.count(Item.id).label('count'),
            func.avg(Item.price).label('avg_price')
        ).filter(
            Item.category.isnot(None)
        ).group_by(Item.category).order_by(desc('count')).limit(10).all()
        
        insights['popular_categories'] = [
            {'category': cat, 'count': count, 'avg_price': float(avg_price) if avg_price else 0}
            for cat, count, avg_price in category_stats
        ]
        
        # Ценовые диапазоны
        price_stats = db.query(
            func.min(Item.price).label('min_price'),
            func.max(Item.price).label('max_price'),
            func.avg(Item.price).label('avg_price')
        ).filter(Item.price.isnot(None)).first()
        
        insights['price_analysis'] = {
            'min_price': float(price_stats.min_price) if price_stats.min_price else 0,
            'max_price': float(price_stats.max_price) if price_stats.max_price else 0,
            'avg_price': float(price_stats.avg_price) if price_stats.avg_price else 0
        }
        
        return insights

    def _smart_search_with_direct_queries(self, db: Session, user_message: str, user_profile: ProfileOut = None, limit: int = 10) -> Dict[str, List[Item]]:
        """Выполняет умные прямые запросы к БД"""
        results = {}
        preferences = self._analyze_user_preferences(db, user_profile)
        request_params = self._parse_user_request(user_message)
        user_limit = request_params.get('limit', limit)
        
        # 1. Основной поиск по запросу
        main_items = self._search_main_query(db, request_params, user_limit)
        results['main_results'] = main_items
        
        # 2. Поиск по любимым брендам пользователя (только если нет конкретного запроса)
        if preferences['favorite_brands'] and not request_params.get('category'):
            brand_items = self._search_by_brands(db, preferences['favorite_brands'], user_limit)
            results['favorite_brands'] = brand_items
        
        # 3. Поиск по любимым цветам (только если нет конкретного цвета в запросе)
        if preferences['favorite_colors'] and not request_params.get('color'):
            color_items = self._search_by_colors(db, preferences['favorite_colors'], user_limit)
            results['favorite_colors'] = color_items
        
        # 4. Трендовые товары (только если нет конкретного запроса)
        if not request_params.get('category') and not request_params.get('color'):
            trending_items = self._get_trending_items(db, user_limit)
            results['trending'] = trending_items
        
        # 5. Поиск по размеру (если есть предпочтения и нет конкретного запроса)
        if preferences['size_preferences'] and not request_params.get('category'):
            size_items = self._search_by_sizes(db, preferences['size_preferences'], user_limit)
            results['size_match'] = size_items
        
        # 6. Поиск в ценовом диапазоне (если указан)
        if request_params.get('price_range'):
            price_items = self._search_by_price_range(db, request_params['price_range'], request_params, user_limit)
            results['price_match'] = price_items
        
        # 7. Поиск по стилю (если указан)
        if request_params.get('style'):
            style_items = self._search_by_style(db, request_params['style'], request_params, user_limit)
            results['style_match'] = style_items
        
        return results

    def _search_main_query(self, db: Session, request_params: Dict, limit: int) -> List[Item]:
        """Основной поиск по запросу пользователя"""
        query = db.query(Item)
        
        # Фильтр по категории
        if request_params.get('category'):
            category = request_params['category']
            # Умный поиск по категории - ищем в названии и категории
            category_filters = [
                Item.name.ilike(f"%{category}%"),
                Item.category.ilike(f"%{category}%"),
                Item.clothing_type.ilike(f"%{category}%")
            ]
            
            # Добавляем дополнительные варианты поиска для футболок
            if category == 'футболка':
                category_filters.extend([
                    Item.category.ilike("%футболк%"),
                    Item.category.ilike("%топ%"),
                    Item.name.ilike("%футболк%"),
                    Item.name.ilike("%майк%")
                ])
            
            query = query.filter(or_(*category_filters))
            logger.info(f"Поиск по категории '{category}' с фильтрами: {category_filters}")
        
        # Фильтр по цвету
        if request_params.get('color'):
            color = request_params['color']
            query = query.filter(Item.color.ilike(f"%{color}%"))
            logger.info(f"Поиск по цвету '{color}'")
        
        # Фильтр по цене - ПРИОРИТЕТНЫЙ ФИЛЬТР
        if request_params.get('price_range'):
            price_range = request_params['price_range']
            logger.info(f"Применяем фильтр по цене: {price_range}")
            
            if price_range.get('min') is not None:
                query = query.filter(Item.price >= price_range['min'])
                logger.info(f"Минимальная цена: {price_range['min']}")
            
            if price_range.get('max') is not None and price_range['max'] != float('inf'):
                query = query.filter(Item.price <= price_range['max'])
                logger.info(f"Максимальная цена: {price_range['max']}")
        
        # Сортировка
        if request_params.get('sort_order') == 'asc':
            query = query.order_by(Item.price.asc())
        elif request_params.get('sort_order') == 'desc':
            query = query.order_by(Item.price.desc())
        else:
            # Если есть ценовой диапазон, сортируем по возрастанию цены
            if request_params.get('price_range'):
                query = query.order_by(Item.price.asc())
            else:
                query = query.order_by(Item.price.desc())  # По умолчанию дорогие
        
        result = query.limit(limit).all()
        logger.info(f"Найдено {len(result)} товаров по основному запросу")
        
        # Логируем найденные товары для отладки
        for item in result:
            logger.info(f"Найден товар: {item.name} - {item.price} ₸")
        
        return result

    def _search_by_brands(self, db: Session, brands: List[str], limit: int) -> List[Item]:
        """Поиск по брендам"""
        if not brands:
            return []
        
        brand_filters = []
        for brand in brands[:3]:  # Берем первые 3 бренда
            brand_filters.append(Item.brand.ilike(f"%{brand}%"))
        
        query = db.query(Item).filter(or_(*brand_filters)).order_by(Item.price.desc())
        return query.limit(limit).all()

    def _search_by_colors(self, db: Session, colors: List[str], limit: int) -> List[Item]:
        """Поиск по цветам"""
        if not colors:
            return []
        
        color_filters = []
        for color in colors[:3]:  # Берем первые 3 цвета
            color_filters.append(Item.color.ilike(f"%{color}%"))
        
        query = db.query(Item).filter(or_(*color_filters)).order_by(Item.price.desc())
        return query.limit(limit).all()

    def _get_trending_items(self, db: Session, limit: int) -> List[Item]:
        """Получение трендовых товаров"""
        # Простая логика - самые дорогие товары как трендовые
        query = db.query(Item).filter(Item.price.isnot(None)).order_by(Item.price.desc())
        return query.limit(limit).all()

    def _search_by_sizes(self, db: Session, sizes: List[str], limit: int) -> List[Item]:
        """Поиск по размерам"""
        if not sizes:
            return []
        
        size_filters = []
        for size in sizes[:3]:
            size_filters.append(Item.size.ilike(f"%{size}%"))
        
        query = db.query(Item).filter(or_(*size_filters)).order_by(Item.price.desc())
        return query.limit(limit).all()

    def _search_by_price_range(self, db: Session, price_range: Dict, request_params: Dict, limit: int) -> List[Item]:
        """Поиск в ценовом диапазоне"""
        query = db.query(Item).filter(Item.price.isnot(None))
        
        if price_range.get('min') is not None:
            query = query.filter(Item.price >= price_range['min'])
        if price_range.get('max') is not None and price_range['max'] != float('inf'):
            query = query.filter(Item.price <= price_range['max'])
        
        # Добавляем дополнительные фильтры
        if request_params.get('category'):
            category = request_params['category']
            query = query.filter(
                or_(
                    Item.name.ilike(f"%{category}%"),
                    Item.category.ilike(f"%{category}%")
                )
            )
        
        if request_params.get('color'):
            color = request_params['color']
            query = query.filter(Item.color.ilike(f"%{color}%"))
        
        # Сортировка
        if request_params.get('sort_order') == 'asc':
            query = query.order_by(Item.price.asc())
        else:
            query = query.order_by(Item.price.desc())
        
        return query.limit(limit).all()

    def _search_by_style(self, db: Session, style: str, request_params: Dict, limit: int) -> List[Item]:
        """Поиск по стилю"""
        query = db.query(Item)
        
        # Стилевые ключевые слова для разных стилей
        style_keywords = {
            'casual': ['casual', 'повседневн', 'обычн', 'комфортн', 'базов'],
            'business': ['business', 'делов', 'офис', 'классич', 'элегант'],
            'elegant': ['elegant', 'элегант', 'вечерн', 'торжествен', 'празднич'],
            'sport': ['sport', 'спортив', 'фитнес', 'актив', 'тренировочн']
        }
        
        # Получаем ключевые слова для стиля
        keywords = style_keywords.get(style, [style])
        
        # Создаем условия поиска
        style_conditions = []
        for keyword in keywords:
            style_conditions.extend([
                Item.style.ilike(f"%{keyword}%"),
                Item.name.ilike(f"%{keyword}%"),
                Item.category.ilike(f"%{keyword}%")
            ])
        
        if style_conditions:
            query = query.filter(or_(*style_conditions))
        
        # Добавляем фильтры по рекомендуемым категориям для стилевых запросов
        if request_params.get('style_request') and request_params.get('recommended_categories'):
            recommended_categories = request_params['recommended_categories']
            category_conditions = []
            for category in recommended_categories:
                category_conditions.append(Item.name.ilike(f"%{category}%"))
            
            if category_conditions:
                query = query.filter(or_(*category_conditions))
        
        # Добавляем дополнительные фильтры
        if request_params.get('category'):
            category = request_params['category']
            query = query.filter(
                or_(
                    Item.name.ilike(f"%{category}%"),
                    Item.category.ilike(f"%{category}%")
                )
            )
        
        if request_params.get('color'):
            color = request_params['color']
            query = query.filter(Item.color.ilike(f"%{color}%"))
        
        return query.order_by(Item.price.desc()).limit(limit).all()

    def _parse_user_request(self, user_message: str) -> Dict[str, Any]:
        """Расширенный парсинг запроса пользователя"""
        message_lower = user_message.lower()
        
        # Категории одежды
        clothing_keywords = {
            'футболка': ['футболка', 'tshirt', 't-shirt', 'майка', 'футболки'],
            'рубашка': ['рубашка', 'shirt', 'блузка', 'рубашки'],
            'джинсы': ['джинсы', 'jeans', 'брюки', 'pants', 'джинсы'],
            'платье': ['платье', 'dress', 'сарафан', 'платья'],
            'куртка': ['куртка', 'jacket', 'пальто', 'coat', 'куртки'],
            'свитер': ['свитер', 'sweater', 'кофта', 'джемпер', 'свитера'],
            'юбка': ['юбка', 'skirt', 'юбки'],
            'шорты': ['шорты', 'shorts'],
            'обувь': ['обувь', 'туфли', 'кроссовки', 'ботинки', 'shoes', 'sneakers', 'boots']
        }
        
        # Стилевые запросы и поводы
        style_occasions = {
            'школа': {
                'keywords': ['школ', 'университет', 'колледж', 'учеба', 'учеб'],
                'style': 'casual',
                'price_range': {'min': 1000, 'max': 15000},
                'categories': ['футболка', 'рубашка', 'джинсы', 'свитер', 'куртка', 'обувь']
            },
            'работа': {
                'keywords': ['работа', 'офис', 'деловой', 'бизнес'],
                'style': 'business',
                'price_range': {'min': 5000, 'max': 30000},
                'categories': ['рубашка', 'джинсы', 'платье', 'куртка', 'обувь']
            },
            'вечеринка': {
                'keywords': ['вечеринк', 'праздник', 'торжество', 'свадьб', 'день рождения'],
                'style': 'elegant',
                'price_range': {'min': 5000, 'max': 50000},
                'categories': ['платье', 'рубашка', 'джинсы', 'куртка', 'обувь']
            },
            'повседневный': {
                'keywords': ['повседневн', 'каждодневн', 'обычн', 'классик'],
                'style': 'casual',
                'price_range': {'min': 2000, 'max': 20000},
                'categories': ['футболка', 'рубашка', 'джинсы', 'свитер', 'куртка', 'обувь']
            },
            'спортивный': {
                'keywords': ['спорт', 'фитнес', 'тренировк', 'активный'],
                'style': 'sport',
                'price_range': {'min': 1000, 'max': 15000},
                'categories': ['футболка', 'свитер', 'шорты', 'джинсы', 'обувь']
            }
        }
        
        # Проверяем стилевые запросы
        detected_occasion = None
        for occasion, config in style_occasions.items():
            if any(keyword in message_lower for keyword in config['keywords']):
                detected_occasion = occasion
                break
        
        # Специальная обработка для стилевых запросов
        if detected_occasion:
            occasion_config = style_occasions[detected_occasion]
            return {
                'category': None,  # Не ограничиваем категорию для стилевых запросов
                'style': occasion_config['style'],
                'price_range': occasion_config['price_range'],
                'sort_order': 'desc',
                'limit': 15,  # Увеличиваем лимит для стилевых запросов
                'style_request': True,  # Флаг для специальной обработки
                'occasion': detected_occasion,
                'recommended_categories': occasion_config['categories'],
                'original_message': user_message
            }
        
        # Специальная обработка для вечеринок и праздников (fallback)
        if any(word in message_lower for word in ['вечеринк', 'праздн', 'торжеств', 'выход', 'выходн', 'событи']):
            # Для вечеринок предлагаем платья, костюмы, элегантную одежду
            if not any(keyword in message_lower for keywords in clothing_keywords.values() for keyword in keywords):
                return {
                    'category': None,  # Не ограничиваем категорию для вечеринок
                    'style': 'elegant',
                    'price_range': {'min': 5000, 'max': 50000},  # Расширяем ценовой диапазон
                    'sort_order': 'desc',
                    'limit': 15,  # Увеличиваем лимит
                    'party_request': True,  # Флаг для специальной обработки
                    'original_message': user_message
                }
        
        category = None
        for cat, keywords in clothing_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                category = cat
                break
        
        # Цвет
        color = None
        color_keywords = {
            'черный': ['черный', 'черная', 'черные', 'black'],
            'белый': ['белый', 'белая', 'белые', 'white'],
            'красный': ['красный', 'красная', 'красные', 'red'],
            'синий': ['синий', 'синяя', 'синие', 'blue'],
            'зеленый': ['зеленый', 'зеленая', 'зеленые', 'green'],
            'желтый': ['желтый', 'желтая', 'желтые', 'yellow'],
            'серый': ['серый', 'серая', 'серые', 'gray', 'grey'],
            'розовый': ['розовый', 'розовая', 'розовые', 'pink'],
            'фиолетовый': ['фиолетовый', 'фиолетовая', 'фиолетовые', 'purple'],
            'оранжевый': ['оранжевый', 'оранжевая', 'оранжевые', 'orange']
        }
        
        for color_name, keywords in color_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                color = color_name
                break
        
        # Ценовой диапазон
        price_range = None
        
        # Ищем диапазоны типа "от X до Y", "X-Y", "X-Y тысяч"
        range_patterns = [
            r'от\s*(\d+)\s*до\s*(\d+)',
            r'(\d+)\s*-\s*(\d+)',
            r'(\d+)\s*до\s*(\d+)',
            r'диапазон\s*(\d+)\s*-\s*(\d+)',
            r'(\d+)\s*тысяч?\s*-\s*(\d+)\s*тысяч?',
            r'от\s*(\d+)\s*тысяч?\s*до\s*(\d+)\s*тысяч?'
        ]
        
        for pattern in range_patterns:
            matches = re.findall(pattern, message_lower)
            if matches:
                min_val, max_val = matches[0]
                # Если числа меньше 1000, считаем их тысячами
                min_price = int(min_val) * 1000 if int(min_val) < 1000 else int(min_val)
                max_price = int(max_val) * 1000 if int(max_val) < 1000 else int(max_val)
                price_range = {'min': min_price, 'max': max_price}
                break
        
        # Если диапазон не найден, ищем простые указания
        if not price_range:
            if any(word in message_lower for word in ['дешевые', 'дешево', 'недорогие', 'бюджетные', 'до 10000']):
                price_range = {'min': 0, 'max': 10000}
            elif any(word in message_lower for word in ['дорогие', 'дорого', 'премиум', 'люкс', 'от 50000']):
                price_range = {'min': 50000, 'max': float('inf')}
            elif any(word in message_lower for word in ['средние', 'средний', '10000-30000']):
                price_range = {'min': 10000, 'max': 30000}
        
        # Сортировка
        sort_order = 'desc'
        if any(word in message_lower for word in ['дешевые', 'дешево', 'недорогие', 'бюджетные']):
            sort_order = 'asc'
        elif any(word in message_lower for word in ['дорогие', 'дорого', 'премиум', 'люкс']):
            sort_order = 'desc'
        
        # Лимит
        limit = 10
        if 'топ' in message_lower or 'top' in message_lower:
            numbers = re.findall(r'топ\s*(\d+)', message_lower)
            if numbers:
                limit = int(numbers[0])
            else:
                limit = 5
        elif any(word in message_lower for word in ['3', 'три', 'three']):
            limit = 3
        elif any(word in message_lower for word in ['5', 'пять', 'five']):
            limit = 5
        
        # Стиль
        style = None
        style_keywords = {
            'casual': ['casual', 'повседневный', 'повседневная'],
            'business': ['business', 'деловой', 'деловая', 'офис'],
            'sport': ['sport', 'спортивный', 'спортивная'],
            'elegant': ['elegant', 'элегантный', 'элегантная', 'вечерний']
        }
        
        for style_name, keywords in style_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                style = style_name
                break
        
        return {
            'category': category,
            'color': color,
            'price_range': price_range,
            'sort_order': sort_order,
            'limit': limit,
            'style': style,
            'original_message': user_message
        }

    def _create_comprehensive_response(self, search_results: Dict[str, List[Item]], user_message: str, market_insights: Dict, preferences: Dict) -> str:
        """Создает живой, дружелюбный ответ как от настоящего консультанта"""
        total_items = sum(len(items) for items in search_results.values() if items)
        
        if total_items == 0:
            return "Ой, к сожалению, не нашла товары по вашему запросу 😔 Но не расстраивайтесь! Может быть, стоит попробовать другой ценовой диапазон или категорию? Я всегда готов помочь найти что-то подходящее!"
        
        # Основные результаты
        main_items = search_results.get('main_results', [])
        
        # Создаем живой ответ
        if main_items:
            # Определяем контекст запроса
            is_price_range = any(word in user_message.lower() for word in ['диапазон', 'от', 'до', '-', 'тысяч'])
            is_specific_category = any(word in user_message.lower() for word in ['футболк', 'рубашк', 'джинс', 'плать', 'куртк'])
            
            if is_price_range:
                response = f"Отлично! В вашем ценовом диапазоне нашла {len(main_items)} товаров, которые точно подойдут под ваш бюджет 😊\n\n"
            elif is_specific_category:
                response = f"Вот что нашла для вас! {len(main_items)} отличных вариантов:\n\n"
            else:
                response = f"Смотрите, что нашла! {len(main_items)} интересных товаров:\n\n"
            
            # Показываем товары с живыми комментариями
            for i, item in enumerate(main_items[:5], 1):
                price_str = f"{item.price:,.0f} ₸" if item.price else "Цена не указана"
                color_info = f" в цвете {item.color}" if item.color else ""
                
                # Добавляем живые комментарии к товарам
                if item.brand and item.brand.lower() in ['adidas', 'nike', 'fila']:
                    brand_comment = f" — отличный бренд {item.brand}!"
                elif item.price and item.price < 5000:
                    brand_comment = " — отличное соотношение цена/качество!"
                elif item.price and item.price > 10000:
                    brand_comment = " — премиум качество!"
                else:
                    brand_comment = " — стильный выбор!"
                
                response += f"{i}. {item.name}{color_info} за {price_str}{brand_comment}\n"
            
            # Добавляем персональные рекомендации
            if preferences.get('favorite_brands') and search_results.get('favorite_brands'):
                response += f"\nКстати, вижу что вы любите {preferences['favorite_brands'][0]}! У нас есть еще несколько вариантов от этого бренда, если интересно 😉"
            
            # Добавляем предложения помощи
            response += f"\n\nЧто думаете об этих вариантах? Могу помочь с выбором или поискать что-то еще! Может быть, интересует другой цвет или размер?"
            
            return response
        
        return "Извините, что-то пошло не так с поиском. Давайте попробуем еще раз или я помогу подобрать что-то другое! 😊"

    async def chat(self, db: Session, user_message: str, user_profile: ProfileOut = None, limit: int = 10) -> Dict[str, Any]:
        """Универсальный метод для обработки запросов пользователя с поддержкой диалога"""
        logger.info(f"=== НАЧАЛО ОБРАБОТКИ СООБЩЕНИЯ ===")
        logger.info(f"Состояние диалога: {self.conversation_state}")
        logger.info(f"Сообщение пользователя: '{user_message}'")
        
        # Проверяем состояние диалога
        if self.conversation_state == 'greeting':
            logger.info("Состояние: greeting")
            is_greeting = self._is_greeting(user_message)
            is_small_talk = self.is_small_talk(user_message)
            is_product_request = self._is_product_request(user_message)
            logger.info(f"is_greeting: {is_greeting}, is_small_talk: {is_small_talk}, is_product_request: {is_product_request}")
            
            # Если пользователь сразу просит товары - ПРИОРИТЕТ
            if is_product_request:
                logger.info("Переходим к поиску товаров")
                self.conversation_state = 'searching_products'
                return await self._handle_style_request(db, user_message, user_profile, limit)
            # Если это приветствие или small talk
            elif is_greeting or is_small_talk:
                logger.info("Обрабатываем как приветствие/small talk")
                return await self._handle_greeting(user_message, user_profile)
            else:
                # Если неясно, что хочет пользователь, предлагаем помощь
                logger.info("Неясный запрос, предлагаем помощь")
                return await self._handle_greeting(user_message, user_profile)
        
        elif self.conversation_state == 'waiting_for_interest':
            logger.info("Состояние: waiting_for_interest")
            # Ждем подтверждения интереса
            is_positive = self._is_positive_response(user_message)
            is_product_request = self._is_product_request(user_message)
            logger.info(f"is_positive: {is_positive}, is_product_request: {is_product_request}")
            
            if is_product_request:
                # Если пользователь сразу просит товары - ПРИОРИТЕТ
                logger.info("Переходим к поиску товаров")
                self.conversation_state = 'searching_products'
                return await self._handle_style_request(db, user_message, user_profile, limit)
            elif is_positive:
                logger.info("Обрабатываем положительный ответ")
                return await self._handle_interest_confirmation(user_message, user_profile)
            else:
                # Если ответ неясный, предлагаем помощь снова
                logger.info("Неясный ответ, предлагаем помощь снова")
                return await self._handle_greeting(user_message, user_profile)
        
        elif self.conversation_state == 'suggesting_options':
            logger.info("Состояние: suggesting_options")
            # Предлагаем варианты
            is_product_request = self._is_product_request(user_message)
            logger.info(f"is_product_request: {is_product_request}")
            
            if is_product_request:
                # Если пользователь выбрал что-то конкретное
                logger.info("Переходим к поиску товаров")
                self.conversation_state = 'searching_products'
                return await self._handle_style_request(db, user_message, user_profile, limit)
            else:
                # Если ответ неясный, предлагаем варианты снова
                logger.info("Предлагаем варианты снова")
                return await self._suggest_options(user_message, user_profile)
        
        elif self.conversation_state == 'searching_products':
            logger.info("Состояние: searching_products")
            # Обычный поиск товаров
            is_greeting = self._is_greeting(user_message)
            logger.info(f"is_greeting: {is_greeting}")
            
            if is_greeting:
                # Если пользователь снова здоровается, начинаем заново
                logger.info("Пользователь снова здоровается, начинаем заново")
                self.conversation_state = 'greeting'
                return await self._handle_greeting(user_message, user_profile)
            else:
                logger.info("Выполняем поиск товаров")
                return await self._handle_style_request(db, user_message, user_profile, limit)
        
        else:
            # Fallback - начинаем заново
            logger.info(f"Неизвестное состояние: {self.conversation_state}, начинаем заново")
            self.conversation_state = 'greeting'
            return await self._handle_greeting(user_message, user_profile)

    async def _handle_small_talk(self, user_message: str, user_profile: ProfileOut = None) -> Dict[str, Any]:
        """Обрабатывает small talk - теперь интегрирован с новой логикой диалога"""
        # Если это приветствие, используем новый метод
        if self._is_greeting(user_message):
            return await self._handle_greeting(user_message, user_profile)
        
        # Иначе обрабатываем как обычный small talk
        user_info = ""
        if user_profile:
            user_info = (
                f"\nДанные пользователя:\n"
                f"Рост: {user_profile.height or '-'} см, Вес: {user_profile.weight or '-'} кг, "
                f"Обхват груди: {user_profile.chest or '-'} см, талии: {user_profile.waist or '-'} см, бёдер: {user_profile.hips or '-'} см. "
                f"Любимые бренды: {', '.join(user_profile.favorite_brands) if user_profile.favorite_brands else '-'}; "
                f"Любимые цвета: {', '.join(user_profile.favorite_colors) if user_profile.favorite_colors else '-'}"
            )
        
        prompt = (
            f"Пользователь написал: '{user_message}'. "
            "Ты — живой, дружелюбный и энергичный ИИ-консультант-стилист в магазине одежды. "
            "Ты общаешься как настоящий человек, используешь эмодзи, шутишь, даешь персональные советы. "
            "Ты не робот, а настоящий эксперт по стилю, который любит свою работу и хочет помочь каждому клиенту. "
            "Отвечай тепло, с энтузиазмом, предлагай конкретную помощь. "
            "Используй разговорный стиль, как будто общаешься с другом."
            f"{user_info}\n"
            "Если у пользователя указаны параметры (рост, вес, обхваты), обязательно учитывай их и дай совет по размеру одежды, если это уместно."
            "ВАЖНО: Всегда указывай цены в тенге (₸)."
        )
        
        try:
            response = await self.client.chat.completions.create(
                model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
                messages=[
                    {"role": "system", "content": "Ты — живой, дружелюбный и энергичный ИИ-консультант-стилист в магазине одежды. Общаешься как настоящий человек, используешь эмодзи, даешь персональные советы. НЕ используй markdown форматирование (**жирный текст**), нумерацию (1. 2. 3.) или другие специальные символы. Просто пиши обычным текстом с эмодзи."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.8,
                max_tokens=500
            )
            answer = response.choices[0].message.content.strip()
                    return {"reply": answer, "items": []}
    except Exception as e:
        logger.error(f"StyleAgent Azure OpenAI error (small talk): {e}")
        return {"reply": "Привет! 👋 Я ваш ИИ-стилист и готов помочь найти идеальный образ! 😊 Что вас интересует сегодня? Может быть, новые футболки, стильные джинсы или что-то для особого случая?", "items": []}

    def _create_style_recommendation(self, items: List[Item], occasion: str, recommended_categories: List[str], user_message: str, user_profile: ProfileOut = None) -> str:
        """Создает стилевые рекомендации для конкретного повода"""
        
        # Стилевые советы для разных поводов
        style_advice = {
            'школа': {
                'title': '🎓 Образ для школы/университета',
                'description': 'Комфортный и стильный образ для учебы',
                'tips': [
                    'Выбирайте удобную обувь для долгого дня',
                    'Слоистая одежда для перемены температур',
                    'Нейтральные цвета легко комбинируются'
                ]
            },
            'работа': {
                'title': '💼 Деловой образ для работы',
                'description': 'Элегантный и профессиональный стиль',
                'tips': [
                    'Классические цвета создают серьезный образ',
                    'Качественные материалы важны для офиса',
                    'Удобная обувь для рабочего дня'
                ]
            },
            'вечеринка': {
                'title': '🎉 Образ для вечеринки',
                'description': 'Яркий и запоминающийся стиль',
                'tips': [
                    'Не бойтесь ярких цветов и акцентов',
                    'Удобная обувь для танцев',
                    'Добавьте аксессуары для завершенности'
                ]
            },
            'повседневный': {
                'title': '🌟 Повседневный образ',
                'description': 'Удобный и стильный для каждодневной носки',
                'tips': [
                    'Базовые вещи легко комбинируются',
                    'Удобство важнее всего',
                    'Качественные материалы прослужат дольше'
                ]
            },
            'спортивный': {
                'title': '🏃‍♀️ Спортивный образ',
                'description': 'Функциональный и комфортный для активности',
                'tips': [
                    'Дышащие материалы для комфорта',
                    'Удобная обувь для тренировок',
                    'Свободный крой не сковывает движения'
                ]
            }
        }
        
        # Получаем советы для повода
        advice = style_advice.get(occasion, style_advice['повседневный'])
        
        # Формируем список найденных товаров
        if items:
            items_text = "\n".join([f"• {item.name} - {item.price} ₸" for item in items[:5]])
        else:
            items_text = "К сожалению, товары не найдены"
        
        # Создаем персонализированное приветствие
        user_info = ""
        if user_profile:
            if user_profile.favorite_colors:
                user_info += f"\n🎨 Учитывая ваши любимые цвета: {', '.join(user_profile.favorite_colors)}"
            if user_profile.favorite_brands:
                user_info += f"\n🏷️ И предпочитаемые бренды: {', '.join(user_profile.favorite_brands)}"
        
        # Формируем ответ
        response = f"""
{advice['title']} ✨

{advice['description']} 💫

📋 Рекомендуемые категории: {', '.join(recommended_categories)}
{user_info}

💡 Стильные советы:
{chr(10).join([f"• {tip}" for tip in advice['tips']])}

🛍️ Найденные товары:
{items_text}

🎯 Хотите уточнить размеры или цветовую гамму?
"""
        
        return response.strip()

    async def _handle_style_request(self, db: Session, user_message: str, user_profile: ProfileOut = None, limit: int = 10) -> Dict[str, Any]:
        """Обрабатывает запросы о стиле и товарах"""
        logger.info(f"_handle_style_request вызван с сообщением: '{user_message}'")
        
        try:
            # Специальная обработка для коротких уточнений типа "для школы", "школы"
            message_lower = user_message.lower().strip()
            if len(message_lower) <= 20:
                occasion_keywords = {
                    'школ': 'школа', 'университет': 'университет', 'колледж': 'колледж',
                    'работа': 'работа', 'работы': 'работа', 'офис': 'офис', 'деловой': 'деловой стиль', 'бизнес': 'деловой стиль',
                    'вечеринк': 'вечеринка', 'праздник': 'праздник', 'торжество': 'торжество',
                    'свадьб': 'свадьба', 'день рождения': 'день рождения',
                    'повседневн': 'повседневный', 'каждодневн': 'повседневный', 'обычн': 'повседневный',
                    'классик': 'классический', 'элегантн': 'элегантный',
                    'спорт': 'спортивный', 'фитнес': 'спортивный', 'тренировк': 'спортивный',
                    'прогулк': 'прогулка', 'отдых': 'отдых', 'отпуск': 'отпуск'
                }
                
                detected_occasion = None
                for keyword, occasion in occasion_keywords.items():
                    if keyword in message_lower:
                        detected_occasion = occasion
                        break
                
                if detected_occasion:
                    logger.info(f"Обнаружено уточнение повода: {detected_occasion}")
                    
                    # Получаем рекомендуемые категории для повода
                    occasion_categories = {
                        'школа': ['футболка', 'рубашка', 'джинсы', 'свитер', 'куртка', 'обувь'],
                        'университет': ['футболка', 'рубашка', 'джинсы', 'свитер', 'куртка', 'обувь'],
                        'колледж': ['футболка', 'рубашка', 'джинсы', 'свитер', 'куртка', 'обувь'],
                        'работа': ['рубашка', 'джинсы', 'платье', 'куртка', 'обувь'],
                        'деловой стиль': ['рубашка', 'джинсы', 'платье', 'куртка', 'обувь'],
                        'вечеринка': ['платье', 'рубашка', 'джинсы', 'куртка', 'обувь'],
                        'праздник': ['платье', 'рубашка', 'джинсы', 'куртка', 'обувь'],
                        'торжество': ['платье', 'рубашка', 'джинсы', 'куртка', 'обувь'],
                        'свадьба': ['платье', 'рубашка', 'джинсы', 'куртка', 'обувь'],
                        'день рождения': ['платье', 'рубашка', 'джинсы', 'куртка', 'обувь'],
                        'повседневный': ['футболка', 'рубашка', 'джинсы', 'свитер', 'куртка', 'обувь'],
                        'классический': ['футболка', 'рубашка', 'джинсы', 'свитер', 'куртка', 'обувь'],
                        'элегантный': ['платье', 'рубашка', 'джинсы', 'куртка', 'обувь'],
                        'спортивный': ['футболка', 'свитер', 'шорты', 'джинсы', 'обувь'],
                        'прогулка': ['футболка', 'рубашка', 'джинсы', 'свитер', 'куртка', 'обувь'],
                        'отдых': ['футболка', 'рубашка', 'джинсы', 'свитер', 'куртка', 'обувь'],
                        'отпуск': ['футболка', 'рубашка', 'джинсы', 'свитер', 'куртка', 'обувь']
                    }
                    
                    recommended_categories = occasion_categories.get(detected_occasion, ['футболка', 'рубашка', 'джинсы', 'обувь'])
                    
                    # Создаем параметры для стилевого запроса
                    request_params = {
                        'style_request': True,
                        'occasion': detected_occasion,
                        'recommended_categories': recommended_categories,
                        'limit': 15,
                        'original_message': user_message
                    }
                else:
                    # Парсим запрос пользователя как обычно
                    request_params = self._parse_user_request(user_message)
            else:
                # Парсим запрос пользователя как обычно
                request_params = self._parse_user_request(user_message)
            
            user_limit = request_params.get('limit', limit)
            
            logger.info(f"Обработка запроса: {user_message}")
            logger.info(f"Параметры запроса: {request_params}")
            
            # Получаем аналитику рынка
            market_insights = self._get_market_insights(db)
            
            # Анализируем предпочтения пользователя
            preferences = self._analyze_user_preferences(db, user_profile)
            
            # Выполняем умные прямые запросы к БД
            search_results = self._smart_search_with_direct_queries(db, user_message, user_profile, limit)
            
            # Проверяем, есть ли результаты
            total_items = sum(len(items) for items in search_results.values() if items)
            
            # Если нет результатов, делаем fallback поиск
            if total_items == 0:
                logger.info("Нет результатов, выполняем fallback поиск")
                fallback_items = self._fallback_search(db, request_params, user_limit)
                search_results['main_results'] = fallback_items
            
            # Объединяем все найденные товары, приоритизируя основные результаты
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
            
            # Специальная обработка для стилевых запросов
            if request_params.get('style_request'):
                occasion = request_params.get('occasion', 'повседневный')
                recommended_categories = request_params.get('recommended_categories', [])
                
                # Создаем стилевой ответ
                style_response = self._create_style_recommendation(
                    all_items, occasion, recommended_categories, user_message, user_profile
                )
                
                return {
                    "reply": style_response,
                    "items": all_items[:limit],
                    "style_occasion": occasion,
                    "recommended_categories": recommended_categories
                }
                            seen_ids.add(item.id)
            
            # Создаем живой ответ с помощью AI
            reply = await self._create_ai_response(search_results, user_message, market_insights, preferences)
            
            # Специальная обработка для вечеринок
            if request_params.get('party_request') and not all_items:
                logger.info("Для вечеринки товары не найдены, даем специальный совет")
                reply = (
                    "Ой, к сожалению, не нашла товары по вашему запросу 😔 Но не расстраивайтесь! "
                    "Для вечеринки могу предложить:\n\n"
                    "🎉 **Элегантные футболки** - отличный выбор для неформальных вечеринок\n"
                    "👔 **Стильные рубашки** - подойдут для более официальных мероприятий\n"
                    "👗 **Любые нарядные вещи** - главное чувствовать себя комфортно!\n\n"
                    "Попробуйте поискать конкретные категории: 'покажи футболки', 'нужны рубашки' или 'стильная одежда'"
                )
            
            # Применяем лимит пользователя
            final_items = all_items[:user_limit]
            
            logger.info(f"Итоговый результат: {len(final_items)} товаров")
            return {"reply": reply, "items": final_items}
            
        except Exception as e:
            logger.error(f"StyleAgent error in _handle_style_request: {e}")
            return {"reply": "Ой, что-то пошло не так! 😅 Давайте попробуем еще раз или я помогу подобрать что-то другое. Может быть, стоит уточнить запрос?", "items": []}

    async def _create_ai_response(self, search_results: Dict[str, List[Item]], user_message: str, market_insights: Dict, preferences: Dict) -> str:
        """Создает AI ответ на основе результатов поиска"""
        if not self.client:
            logger.warning("OpenAI клиент не инициализирован, используем fallback ответ")
            return self._create_comprehensive_response(search_results, user_message, market_insights, preferences)
            
        try:
            # Подготавливаем данные для промпта
            items_info = []
            for category, items in search_results.items():
                if items:
                    category_items = []
                    for item in items[:3]:  # Берем только первые 3 товара из каждой категории
                        category_items.append(f"• {item.name} - {item.price} ₸")
                    items_info.append(f"{category}:\n" + "\n".join(category_items))
            
            items_text = "\n\n".join(items_info) if items_info else "Товары не найдены"
            
            # Создаем промпт
            prompt = f"""
Пользователь ищет: "{user_message}"

Найденные товары:
{items_text}

Создай ОЧЕНЬ КРАТКИЙ ответ (максимум 50-75 слов):
- 1 короткое предложение на товар
- Используй эмодзи
- Задай 1 вопрос в конце
- НЕ используй markdown или нумерацию
- Только самое важное!

Отвечай на русском языке, максимум 50-75 слов.
"""
            
            # Добавляем timeout и retry логику
            import asyncio
            try:
                response = await asyncio.wait_for(
                    self.client.chat.completions.create(
                        model=settings.AZURE_OPENAI_DEPLOYMENT_NAME,
                        messages=[
                            {"role": "system", "content": "Ты — очень краткий консультант-стилист. Отвечай СУПЕР КРАТКО (50-75 слов), используй эмодзи, НЕ используй markdown или нумерацию."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.8,
                        max_tokens=100
                    ),
                    timeout=10.0  # 10 секунд timeout
                )
                
                return response.choices[0].message.content.strip()
                
            except asyncio.TimeoutError:
                logger.warning("Timeout при обращении к OpenAI API в style_agent")
                return self._create_comprehensive_response(search_results, user_message, market_insights, preferences)
            except Exception as api_error:
                logger.error(f"Ошибка OpenAI API в style_agent: {api_error}")
                return self._create_comprehensive_response(search_results, user_message, market_insights, preferences)
                
        except Exception as e:
            logger.error(f"Error creating AI response: {e}")
            # Fallback к обычному ответу
            return self._create_comprehensive_response(search_results, user_message, market_insights, preferences)

    def _fallback_search(self, db: Session, request_params: Dict, limit: int) -> List[Item]:
        """Fallback поиск, если основной поиск не дал результатов"""
        query = db.query(Item)
        
        # Специальная обработка для вечеринок
        if request_params.get('party_request'):
            logger.info("Fallback поиск для вечеринки - ищем элегантную одежду")
            
            # Ищем элегантные товары для вечеринок
            party_keywords = ['платье', 'рубашка', 'костюм', 'элегантн', 'стильн', 'премиум']
            party_conditions = []
            
            for keyword in party_keywords:
                party_conditions.append(Item.name.ilike(f"%{keyword}%"))
            
            if party_conditions:
                query = query.filter(or_(*party_conditions))
            
            # Фильтруем по цене для вечеринок (более дорогие товары)
            if request_params.get('price_range'):
                price_range = request_params['price_range']
                if price_range.get('min') is not None:
                    query = query.filter(Item.price >= price_range['min'])
                if price_range.get('max') is not None and price_range['max'] != float('inf'):
                    query = query.filter(Item.price <= price_range['max'])
            
            # Сортируем по цене (дорогие сначала)
            query = query.order_by(Item.price.desc())
            
            result = query.limit(limit).all()
            logger.info(f"Fallback поиск для вечеринки нашел {len(result)} товаров")
            
            # Если для вечеринки ничего не найдено, показываем любые товары
            if not result:
                logger.info("Для вечеринки ничего не найдено, показываем любые товары")
                query = db.query(Item)
                result = query.order_by(Item.price.desc()).limit(limit).all()
            
            return result
        
        # Обычный fallback поиск
        # Приоритет ценового диапазона
        if request_params.get('price_range'):
            price_range = request_params['price_range']
            logger.info(f"Fallback поиск по ценовому диапазону: {price_range}")
            
            if price_range.get('min') is not None:
                query = query.filter(Item.price >= price_range['min'])
            if price_range.get('max') is not None and price_range['max'] != float('inf'):
                query = query.filter(Item.price <= price_range['max'])
            
            # Если есть категория, добавляем её
            if request_params.get('category'):
                category = request_params['category']
                query = query.filter(Item.name.ilike(f"%{category}%"))
                logger.info(f"Fallback поиск: добавлен фильтр по категории '{category}'")
        
        # Если есть категория, ищем только по названию
        elif request_params.get('category'):
            category = request_params['category']
            query = query.filter(Item.name.ilike(f"%{category}%"))
            logger.info(f"Fallback поиск по названию с категорией '{category}'")
        
        # Если есть цвет, ищем только по цвету
        elif request_params.get('color'):
            color = request_params['color']
            query = query.filter(Item.color.ilike(f"%{color}%"))
            logger.info(f"Fallback поиск по цвету '{color}'")
        
        # Если ничего нет, показываем все товары
        else:
            logger.info("Fallback поиск: показываем все товары")
        
        # Сортировка
        if request_params.get('sort_order') == 'asc':
            query = query.order_by(Item.price.asc())
        else:
            # Если есть ценовой диапазон, сортируем по возрастанию цены
            if request_params.get('price_range'):
                query = query.order_by(Item.price.asc())
            else:
                query = query.order_by(Item.price.desc())
        
        result = query.limit(limit).all()
        logger.info(f"Fallback поиск нашел {len(result)} товаров")
        
        # Логируем найденные товары для отладки
        for item in result:
            logger.info(f"Fallback найден товар: {item.name} - {item.price} ₸")
        
        return result

    async def recommend(self, db: Session, user_message: str, limit: int = 10, user_profile: ProfileOut = None) -> Dict[str, Any]:
        """Основной метод для рекомендаций (для обратной совместимости)"""
        return await self._handle_style_request(db, user_message, user_profile, limit)

    async def process(self, input_data: Dict[str, Any], context: ConversationContext) -> AgentResult:
        """Основной метод обработки для интеграции с архитектурой агентов"""
        start_time = asyncio.get_event_loop().time()
        
        try:
            # Извлекаем данные из input_data
            user_message = input_data.get('message', '')
            user_profile = input_data.get('user_profile')
            db = input_data.get('db')
            
            if not db:
                return AgentResult(
                    success=False,
                    error_message="База данных недоступна",
                    data={'items': [], 'response': 'Извините, база данных недоступна'}
                )
            
            # Выполняем поиск товаров
            result = await self.handle_style_request(db, user_message, user_profile)
            
            processing_time = asyncio.get_event_loop().time() - start_time
            
            return AgentResult(
                success=True,
                data={
                    'items': result.get('items', []),
                    'response': result.get('reply', ''),
                    'search_performed': True,
                    'items_count': len(result.get('items', []))
                },
                processing_time=processing_time
            )
            
        except Exception as e:
            processing_time = asyncio.get_event_loop().time() - start_time
            self.logger.error(f"Ошибка в StyleAgent.process: {e}")
            
            return AgentResult(
                success=False,
                error_message=str(e),
                data={'items': [], 'response': 'Извините, произошла ошибка при поиске товаров'},
                processing_time=processing_time
            )
    
    async def handle_style_request(self, db: Session, user_message: str, user_profile: ProfileOut = None, limit: int = 10) -> Dict[str, Any]:
        """Публичный метод для обработки запросов о стиле и товарах"""
        return await self._handle_style_request(db, user_message, user_profile, limit)
    
    def reset_conversation(self):
        """Сбрасывает состояние диалога для начала нового разговора"""
        self.conversation_state = 'greeting'
        self.user_interests = []
        logger.info("Состояние диалога сброшено")

    def get_size_recommendation(self, height: float, weight: float, chest: float = None, waist: float = None, hips: float = None) -> List[str]:
        """Рекомендует размеры на основе параметров тела"""
        recommendations = []
        
        # Простая логика определения размера по росту и весу
        bmi = weight / ((height / 100) ** 2) if height and weight else None
        
        if height and weight:
            if height < 160:
                if bmi < 18.5:
                    recommendations.extend(['XS', 'S'])
                elif bmi < 25:
                    recommendations.extend(['S', 'M'])
                else:
                    recommendations.extend(['M', 'L'])
            elif height < 170:
                if bmi < 18.5:
                    recommendations.extend(['S', 'M'])
                elif bmi < 25:
                    recommendations.extend(['M', 'L'])
                else:
                    recommendations.extend(['L', 'XL'])
            elif height < 180:
                if bmi < 18.5:
                    recommendations.extend(['M', 'L'])
                elif bmi < 25:
                    recommendations.extend(['L', 'XL'])
                else:
                    recommendations.extend(['XL', 'XXL'])
            else:
                if bmi < 18.5:
                    recommendations.extend(['L', 'XL'])
                elif bmi < 25:
                    recommendations.extend(['XL', 'XXL'])
                else:
                    recommendations.extend(['XXL', 'XXXL'])
        
        return list(set(recommendations))  # Убираем дубликаты
