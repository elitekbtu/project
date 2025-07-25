import logging
import asyncio
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.db.models.item import Item
from app.core.config import get_settings
import openai
from openai import AsyncOpenAI
import re, json
from app.api.v1.endpoints.profile.schemas import ProfileOut

logger = logging.getLogger(__name__)
settings = get_settings()

ITEM_SCHEMA_STR = (
    "id (int), name (str), brand (str), color (str), size (str), clothing_type (str), "
    "description (str), price (float), category (str), article (str), style (str), "
    "collection (str), image_url (str), created_at (datetime), updated_at (datetime)"
)

class StyleAgent:
    def __init__(self):
        self.client = None
        self._initialize_client()

    def _initialize_client(self):
        if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
            openai.api_key = settings.OPENAI_API_KEY
            self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            logger.info("OpenAI (Azure) клиент для StyleAgent инициализирован")
        else:
            logger.warning("OPENAI_API_KEY не задан — StyleAgent не будет работать")

    def is_small_talk(self, user_message: str) -> bool:
        """
        Простая эвристика для определения small talk (приветствие, как дела и т.п.)
        """
        small_talk_patterns = [
            r"привет",
            r"здравствуй",
            r"добрый день",
            r"как дела",
            r"что нового",
            r"как ты",
            r"чем занимаешься",
            r"hello",
            r"hi",
            r"how are you",
            r"what's up",
            r"good morning",
            r"good evening",
        ]
        msg = user_message.lower()
        return any(re.search(p, msg) for p in small_talk_patterns)

    async def chat(self, db: Session, user_message: str, user_profile: ProfileOut = None, limit: int = 10) -> Dict[str, Any]:
        """
        Универсальный метод: определяет тип запроса и либо отвечает дружелюбно, либо даёт рекомендации с товарами.
        user_profile: объект с персональными данными пользователя (рост, вес, обхваты и т.д.)
        """
        user_info = ""
        if user_profile:
            user_info = (
                f"\nДанные пользователя:\n"
                f"Рост: {user_profile.height or '-'} см, Вес: {user_profile.weight or '-'} кг, "
                f"Обхват груди: {user_profile.chest or '-'} см, талии: {user_profile.waist or '-'} см, бёдер: {user_profile.hips or '-'} см. "
                f"Любимые бренды: {', '.join(user_profile.favorite_brands) if user_profile.favorite_brands else '-'}; "
                f"Любимые цвета: {', '.join(user_profile.favorite_colors) if user_profile.favorite_colors else '-'}"
            )
        if self.is_small_talk(user_message):
            # Small talk: дружелюбный ответ + предложение помощи
                    prompt = (
            f"Пользователь написал: '{user_message}'. "
            "Ты — дружелюбный ассистент-консультант магазина одежды. "
            "Ответь по-человечески, коротко и тепло, а затем предложи помощь с подбором одежды или советом по стилю."
            f"{user_info}\n"
            "Если у пользователя указаны параметры (рост, вес, обхваты), обязательно учитывай их и дай совет по размеру одежды, если это уместно."
            "ВАЖНО: Всегда указывай цены в тенге (₸)."
        )
        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "system", "content": "Ты — дружелюбный ассистент-консультанта магазина одежды."},
                          {"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=150
            )
            answer = response.choices[0].message.content.strip()
            return {"reply": answer, "items": []}
        except Exception as e:
            logger.error(f"StyleAgent OpenAI error (small talk): {e}")
            return {"reply": "Ошибка генерации ответа: " + str(e), "items": []}
        else:
            # Запрос о стиле/товарах — рекомендации
            return await self.recommend(db, user_message, limit, user_profile=user_profile)

    def parse_llm_filter(self, text: str) -> dict:
        """
        Извлекает JSON-фильтр из текста (между советом и массивом id).
        """
        # Ищем JSON-объект между советом и массивом id
        matches = re.findall(r'\{[\s\S]*?\}', text)
        if matches:
            try:
                return json.loads(matches[0])
            except Exception:
                return {}
        return {}

    def apply_filter_to_query(self, query, filter_dict: dict):
        """
        Применяет фильтр (dict) к SQLAlchemy query.
        Поддерживает простые операторы: ==, $lte, $gte, $in.
        """
        for key, value in filter_dict.items():
            col = getattr(Item, key, None)
            if not col:
                continue
            if isinstance(value, dict):
                # Операторы
                for op, v in value.items():
                    if op == "$lte":
                        query = query.filter(col <= v)
                    elif op == "$gte":
                        query = query.filter(col >= v)
                    elif op == "$in" and isinstance(v, list):
                        query = query.filter(col.in_(v))
            else:
                query = query.filter(col == value)
        return query

    def _smart_search_items(self, db: Session, user_message: str, user_profile: ProfileOut = None, limit: int = 10, request_params: Dict[str, Any] = None) -> List[Item]:
        """
        Умный поиск товаров по ключевым словам из запроса и профиля пользователя
        """
        query = db.query(Item)
        
        # Используем параметры из парсинга запроса
        if request_params:
            category = request_params.get('category')
            sort_order = request_params.get('sort_order', 'desc')
            limit = request_params.get('limit', 10)
        else:
            category = None
            sort_order = 'desc'
        
        # Извлекаем ключевые слова из запроса
        message_lower = user_message.lower()
        
        # Поиск по категориям одежды
        clothing_keywords = {
            'футболка': ['футболка', 'tshirt', 't-shirt', 'майка'],
            'рубашка': ['рубашка', 'shirt', 'блузка'],
            'джинсы': ['джинсы', 'jeans', 'брюки', 'pants'],
            'платье': ['платье', 'dress', 'сарафан'],
            'куртка': ['куртка', 'jacket', 'пальто', 'coat'],
            'свитер': ['свитер', 'sweater', 'кофта', 'джемпер'],
            'юбка': ['юбка', 'skirt'],
            'шорты': ['шорты', 'shorts'],
            'обувь': ['обувь', 'туфли', 'кроссовки', 'ботинки', 'shoes', 'sneakers', 'boots']
        }
        
        # Применяем фильтр по категории
        if category:
            if category in clothing_keywords:
                keywords = clothing_keywords[category]
                category_filters = []
                for keyword in keywords:
                    category_filters.append(Item.name.ilike(f"%{keyword}%"))
                    category_filters.append(Item.category.ilike(f"%{keyword}%"))
                    category_filters.append(Item.clothing_type.ilike(f"%{keyword}%"))
                query = query.filter(or_(*category_filters))
        
        # Фильтр по любимым брендам пользователя
        if user_profile and user_profile.favorite_brands:
            brand_filters = []
            for brand in user_profile.favorite_brands:
                brand_filters.append(Item.brand.ilike(f"%{brand}%"))
            if brand_filters:
                query = query.filter(or_(*brand_filters))
        
        # Фильтр по любимым цветам пользователя
        if user_profile and user_profile.favorite_colors:
            color_filters = []
            for color in user_profile.favorite_colors:
                color_filters.append(Item.color.ilike(f"%{color}%"))
            if color_filters:
                query = query.filter(or_(*color_filters))
        
        # Применяем сортировку по цене
        if sort_order == 'desc':
            query = query.order_by(Item.price.desc())
        else:
            query = query.order_by(Item.price.asc())
        
        # Применяем лимит
        query = query.limit(limit)
        
        # Выполняем запрос
        items = query.all()
        
        # Если товары не найдены, показываем популярные
        if not items:
            logger.info(f"Товары не найдены для запроса: {user_message}")
            fallback_query = db.query(Item).order_by(Item.price.desc()).limit(limit)
            items = fallback_query.all()
        
        logger.info(f"Найдено {len(items)} товаров для запроса: {user_message}")
        return items

    def _parse_user_request(self, user_message: str) -> Dict[str, Any]:
        """
        Парсит запрос пользователя и извлекает параметры поиска
        """
        message_lower = user_message.lower()
        
        # Определяем категорию товаров
        category = None
        clothing_keywords = {
            'футболка': ['футболка', 'tshirt', 't-shirt', 'майка'],
            'рубашка': ['рубашка', 'shirt', 'блузка'],
            'джинсы': ['джинсы', 'jeans', 'брюки', 'pants'],
            'платье': ['платье', 'dress', 'сарафан'],
            'куртка': ['куртка', 'jacket', 'пальто', 'coat'],
            'свитер': ['свитер', 'sweater', 'кофта', 'джемпер'],
            'юбка': ['юбка', 'skirt'],
            'шорты': ['шорты', 'shorts'],
            'обувь': ['обувь', 'туфли', 'кроссовки', 'ботинки', 'shoes', 'sneakers', 'boots']
        }
        
        for cat, keywords in clothing_keywords.items():
            if any(keyword in message_lower for keyword in keywords):
                category = cat
                break
        
        # Определяем сортировку
        sort_by = 'price'
        sort_order = 'desc'  # по умолчанию самые дорогие
        
        if any(word in message_lower for word in ['дешевые', 'дешево', 'недорогие', 'бюджетные']):
            sort_order = 'asc'
        elif any(word in message_lower for word in ['дорогие', 'дорого', 'премиум', 'люкс']):
            sort_order = 'desc'
        
        # Определяем лимит
        limit = 10  # по умолчанию
        if 'топ' in message_lower or 'top' in message_lower:
            # Ищем числа после "топ"
            numbers = re.findall(r'топ\s*(\d+)', message_lower)
            if numbers:
                limit = int(numbers[0])
            else:
                limit = 5  # если просто "топ" без числа
        elif any(word in message_lower for word in ['3', 'три', 'three']):
            limit = 3
        elif any(word in message_lower for word in ['5', 'пять', 'five']):
            limit = 5
        
        return {
            'category': category,
            'sort_by': sort_by,
            'sort_order': sort_order,
            'limit': limit,
            'original_message': user_message
        }

    async def recommend(self, db: Session, user_message: str, limit: int = 10, user_profile: ProfileOut = None) -> Dict[str, Any]:
        # Парсим запрос пользователя
        request_params = self._parse_user_request(user_message)
        
        user_info = ""
        if user_profile:
            user_info = (
                f"\nДанные пользователя:\n"
                f"Рост: {user_profile.height or '-'} см, Вес: {user_profile.weight or '-'} кг, "
                f"Обхват груди: {user_profile.chest or '-'} см, талии: {user_profile.waist or '-'} см, бёдер: {user_profile.hips or '-'} см. "
                f"Любимые бренды: {', '.join(user_profile.favorite_brands) if user_profile.favorite_brands else '-'}; "
                f"Любимые цвета: {', '.join(user_profile.favorite_colors) if user_profile.favorite_colors else '-'}."
            )

        prompt = (
            f"Вот схема товара (Item): {ITEM_SCHEMA_STR}.\n"
            f"Пользователь спрашивает: '{user_message}'.\n"
            f"Параметры запроса: категория={request_params['category']}, сортировка={request_params['sort_order']}, лимит={request_params['limit']}\n"
            f"{user_info}\n"
            f"Твоя задача: Дай конкретный и полезный ответ на запрос пользователя. Если он просит конкретные товары (например, 'самые дорогие футболки') - дай прямой ответ. Если просит совет - дай полезный совет.\n"
            f"Ответ должен быть естественным, дружелюбным и полезным. НЕ используй технические термины или заголовки.\n"
            f"Просто отвечай на вопрос пользователя.\n"
            f"ВАЖНО: Всегда указывай цены в тенге (₸)."
        )
        try:
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "system", "content": "Ты — fashion-стилист-консультант. Ты отлично понимаешь структуру товаров и фильтры."},
                          {"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=600
            )
            answer = response.choices[0].message.content.strip()
            # Умный поиск товаров по ключевым словам вместо JSON-фильтра
            items = self._smart_search_items(db, user_message, user_profile, request_params['limit'], request_params)
            return {"reply": answer, "items": items}
        except Exception as e:
            logger.error(f"StyleAgent OpenAI error: {e}")
            return {"reply": "Ошибка генерации рекомендации: " + str(e), "items": []}
