#!/usr/bin/env python3
"""
AI Description Enhancement Agent

Агент для умной обработки и дополнения данных товаров через OpenAI API:
- Анализ и улучшение описаний товаров
- Дополнение недостающих полей по схеме Item
- Классификация товаров по категориям и стилям
- Извлечение материалов, цветов и характеристик
- Генерация идеальных данных как при ручном создании
"""

import logging
import json
import asyncio
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Union
from datetime import datetime

import openai
from openai import AsyncOpenAI

from app.core.config import get_settings

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Получаем настройки
settings = get_settings()

@dataclass
class EnhanceResult:
    """Результат улучшения данных товара"""
    # Основные поля по схеме Item
    name: str
    brand: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    clothing_type: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    article: Optional[str] = None
    style: Optional[str] = None
    collection: Optional[str] = None
    
    # Метаданные
    materials: List[str] = field(default_factory=list)
    features: List[str] = field(default_factory=list)
    colors_detected: List[str] = field(default_factory=list)
    target_audience: Optional[str] = None
    season: Optional[str] = None
    quality_score: float = 0.0
    confidence: float = 0.0
    enhanced_fields: List[str] = field(default_factory=list)


class DescriptionAgent:
    """Агент для интеллектуального улучшения описаний товаров"""
    
    def __init__(self):
        self.client = None
        self.stats = {
            'processed_items': 0,
            'ai_requests': 0,
            'fields_enhanced': 0,
            'errors': 0
        }
        
        # Инициализация OpenAI клиента
        self._initialize_client()
        
        # Предопределенные категории и стили
        self.categories = {
            'tops': ['футболка', 'рубашка', 'блузка', 'свитер', 'кардиган', 'жакет', 'топ'],
            'bottoms': ['джинсы', 'брюки', 'шорты', 'юбка', 'леггинсы'],
            'dresses': ['платье', 'сарафан'],
            'outerwear': ['куртка', 'пальто', 'пуховик', 'жилет', 'ветровка'],
            'shoes': ['кроссовки', 'ботинки', 'туфли', 'сандалии', 'босоножки'],
            'accessories': ['сумка', 'рюкзак', 'ремень', 'шарф', 'шапка', 'перчатки']
        }
        
        self.styles = {
            'casual': ['повседневный', 'комфортный', 'расслабленный'],
            'formal': ['официальный', 'деловой', 'классический'],
            'sporty': ['спортивный', 'активный', 'для фитнеса'],
            'elegant': ['элегантный', 'изысканный', 'торжественный'],
            'trendy': ['модный', 'современный', 'трендовый'],
            'minimalist': ['минималистичный', 'лаконичный', 'простой']
        }
    
    def _initialize_client(self):
        """Инициализация OpenAI клиента"""
        try:
            if settings.OPENAI_API_KEY and settings.OPENAI_API_KEY.strip():
                openai.api_key = settings.OPENAI_API_KEY
                self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info("OpenAI клиент успешно инициализирован")
            else:
                logger.warning("OPENAI_API_KEY не найден. AI функции отключены.")
                self.client = None
        except Exception as e:
            logger.error(f"Ошибка инициализации OpenAI клиента: {e}")
            self.client = None
    
    async def enhance_product_data(self, raw_data: Dict[str, Any]) -> EnhanceResult:
        """
        Главная функция для улучшения данных товара
        
        Args:
            raw_data: Исходные данные товара с парсера
            
        Returns:
            EnhanceResult с дополненными данными
        """
        try:
            self.stats['processed_items'] += 1
            
            # Базовая обработка данных
            result = self._process_basic_data(raw_data)
            
            # Если есть OpenAI - дополняем данные через AI
            if self.client:
                result = await self._enhance_with_ai(result, raw_data)
            else:
                # Без AI - базовое дополнение
                result = self._enhance_without_ai(result, raw_data)
            
            # Финальная валидация и нормализация
            result = self._finalize_data(result)
            
            logger.info(f"Товар улучшен: {result.name} (поли: {len(result.enhanced_fields)})")
            return result
            
        except Exception as e:
            self.stats['errors'] += 1
            logger.error(f"Ошибка улучшения товара: {e}")
            return self._create_fallback_result(raw_data)
    
    def _process_basic_data(self, raw_data: Dict[str, Any]) -> EnhanceResult:
        """Базовая обработка исходных данных"""
        # Обработка размеров - если передан список, берем первый
        size_data = raw_data.get('size') or raw_data.get('sizes')
        if isinstance(size_data, list) and size_data:
            size = size_data[0]
        elif isinstance(size_data, str):
            size = size_data.strip() or None
        else:
            size = None
            
        result = EnhanceResult(
            name=(raw_data.get('name') or '').strip(),
            brand=(raw_data.get('brand') or '').strip() or None,
            color=(raw_data.get('color') or '').strip() or None,
            size=size,
            description=(raw_data.get('description') or '').strip() or None,
            price=self._parse_price(raw_data.get('price')),
            article=(raw_data.get('sku') or '').strip() or None
        )
        
        # Базовая категоризация по названию
        result.clothing_type = self._detect_clothing_type(result.name)
        result.category = self._detect_category(result.name, result.clothing_type)
        result.style = self._detect_style(result.name, result.description)
        
        return result
    
    async def _enhance_with_ai(self, result: EnhanceResult, raw_data: Dict[str, Any]) -> EnhanceResult:
        """Улучшение данных через OpenAI API"""
        try:
            self.stats['ai_requests'] += 1
            
            # Создаем промпт для анализа товара
            prompt = self._create_analysis_prompt(result, raw_data)
            
            # Запрос к OpenAI
            response = await self.client.chat.completions.create(
                model="gpt-3.5-turbo-1106",  # Модель поддерживающая JSON response format
                messages=[
                    {
                        "role": "system", 
                        "content": self._get_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.3,
                max_tokens=1500,
                response_format={"type": "json_object"}
            )
            
            # Парсим ответ AI
            ai_data = json.loads(response.choices[0].message.content)
            result = self._apply_ai_enhancements(result, ai_data)
            
            logger.info(f"AI обработка завершена для: {result.name}")
            
        except Exception as e:
            logger.error(f"Ошибка AI обработки: {e}")
            # Продолжаем без AI
            
        return result
    
    def _get_system_prompt(self) -> str:
        """Системный промпт для AI"""
        return """Ты эксперт по fashion-товарам. Анализируй товары и дополняй недостающие данные.

ТРЕБОВАНИЯ:
1. Отвечай ТОЛЬКО в JSON формате
2. Дополни ВСЕ недостающие поля
3. Делай данные как будто товар создан вручную экспертом
4. Используй профессиональную терминологию
5. Будь точным и конкретным

ПОЛЯ ДЛЯ ЗАПОЛНЕНИЯ:
- name: улучшенное название товара
- brand: бренд (если можно определить)
- color: основной цвет
- clothing_type: тип одежды (платье, рубашка, и т.д.)
- description: профессиональное описание (100-200 слов)
- category: категория товара
- style: стиль товара
- collection: коллекция (если можно определить)
- materials: список материалов
- features: ключевые особенности
- colors_detected: все обнаруженные цвета
- target_audience: целевая аудитория
- season: сезон
- quality_score: оценка качества данных (0-10)
- confidence: уверенность в анализе (0-10)"""
    
    def _create_analysis_prompt(self, result: EnhanceResult, raw_data: Dict[str, Any]) -> str:
        """Создание промпта для анализа товара"""
        prompt = f"""Проанализируй этот товар и дополни недостающие данные:

ИСХОДНЫЕ ДАННЫЕ:
Название: {result.name}
Бренд: {result.brand or 'не указан'}
Цвет: {result.color or 'не указан'}
Размер: {result.size or 'не указан'}
Цена: {result.price or 'не указана'}
Описание: {result.description or 'нет описания'}
Артикул: {result.article or 'не указан'}

ДОПОЛНИТЕЛЬНАЯ ИНФОРМАЦИЯ:
{json.dumps(raw_data, ensure_ascii=False, indent=2)}

ЗАДАЧА:
Создай полные профессиональные данные для этого товара. Заполни ВСЕ поля схемы Item.
Ответ должен быть в JSON формате со всеми полями."""
        
        return prompt
    
    def _apply_ai_enhancements(self, result: EnhanceResult, ai_data: Dict[str, Any]) -> EnhanceResult:
        """Применение улучшений от AI"""
        enhanced_fields = []
        
        # Обновляем поля если AI предоставил лучшие данные
        if ai_data.get('name') and len(ai_data['name']) > len(result.name or ''):
            result.name = ai_data['name']
            enhanced_fields.append('name')
        
        if ai_data.get('brand') and not result.brand:
            result.brand = ai_data['brand']
            enhanced_fields.append('brand')
        
        if ai_data.get('color') and not result.color:
            result.color = ai_data['color']
            enhanced_fields.append('color')
        
        if ai_data.get('clothing_type'):
            result.clothing_type = ai_data['clothing_type']
            enhanced_fields.append('clothing_type')
        
        if ai_data.get('description'):
            result.description = ai_data['description']
            enhanced_fields.append('description')
        
        if ai_data.get('category'):
            result.category = ai_data['category']
            enhanced_fields.append('category')
        
        if ai_data.get('style'):
            result.style = ai_data['style']
            enhanced_fields.append('style')
        
        if ai_data.get('collection'):
            result.collection = ai_data['collection']
            enhanced_fields.append('collection')
        
        # Дополнительные данные
        result.materials = ai_data.get('materials', [])
        result.features = ai_data.get('features', [])
        result.colors_detected = ai_data.get('colors_detected', [])
        result.target_audience = ai_data.get('target_audience')
        result.season = ai_data.get('season')
        result.quality_score = float(ai_data.get('quality_score', 7.0))
        result.confidence = float(ai_data.get('confidence', 8.0))
        
        result.enhanced_fields = enhanced_fields
        self.stats['fields_enhanced'] += len(enhanced_fields)
        
        return result
    
    def _enhance_without_ai(self, result: EnhanceResult, raw_data: Dict[str, Any]) -> EnhanceResult:
        """Базовое улучшение без AI"""
        enhanced_fields = []
        
        # Улучшаем описание если его нет
        if not result.description:
            result.description = self._generate_basic_description(result)
            enhanced_fields.append('description')
        
        # Определяем коллекцию по бренду и сезону
        if not result.collection and result.brand:
            result.collection = f"{result.brand} Collection"
            enhanced_fields.append('collection')
        
        # Базовые материалы по типу одежды
        result.materials = self._guess_materials(result.clothing_type)
        result.quality_score = 6.0  # Средняя оценка без AI
        result.confidence = 6.0
        result.enhanced_fields = enhanced_fields
        
        return result
    
    def _finalize_data(self, result: EnhanceResult) -> EnhanceResult:
        """Финальная обработка и валидация"""
        # Нормализация данных
        if result.name and isinstance(result.name, str):
            result.name = result.name.strip().title()
        
        if result.brand and isinstance(result.brand, str):
            result.brand = result.brand.strip().title()
        
        if result.color and isinstance(result.color, str):
            result.color = result.color.strip().lower()
        
        if result.category and isinstance(result.category, str):
            result.category = result.category.strip().lower()
        
        if result.style and isinstance(result.style, str):
            result.style = result.style.strip().lower()
        
        # Валидация цены
        if result.price and result.price <= 0:
            result.price = None
        
        # Генерация артикула если его нет
        if not result.article and result.name and result.brand:
            result.article = self._generate_article(result.name, result.brand)
        
        return result
    
    def _detect_clothing_type(self, name: str) -> Optional[str]:
        """Определение типа одежды по названию"""
        if not name:
            return None
        
        name_lower = name.lower()
        
        # Словарь для определения типов одежды
        clothing_types = {
            'платье': ['платье', 'dress'],
            'рубашка': ['рубашка', 'shirt', 'блузка'],
            'футболка': ['футболка', 't-shirt', 'tshirt', 'майка'],
            'джинсы': ['джинсы', 'jeans', 'denim'],
            'брюки': ['брюки', 'pants', 'trousers'],
            'юбка': ['юбка', 'skirt'],
            'куртка': ['куртка', 'jacket', 'пиджак'],
            'свитер': ['свитер', 'sweater', 'джемпер'],
            'кроссовки': ['кроссовки', 'sneakers', 'кеды'],
            'сумка': ['сумка', 'bag', 'рюкзак']
        }
        
        for clothing_type, keywords in clothing_types.items():
            if any(keyword in name_lower for keyword in keywords):
                return clothing_type
        
        return None
    
    def _detect_category(self, name: str, clothing_type: Optional[str]) -> Optional[str]:
        """Определение категории товара"""
        if not name:
            return None
        
        name_lower = name.lower()
        
        # Прямое определение по типу одежды
        if clothing_type:
            for category, types in self.categories.items():
                if clothing_type in types:
                    return category
        
        # Определение по ключевым словам
        for category, keywords in self.categories.items():
            if any(keyword in name_lower for keyword in keywords):
                return category
        
        return 'other'
    
    def _detect_style(self, name: str, description: Optional[str]) -> Optional[str]:
        """Определение стиля товара"""
        text = f"{name} {description or ''}".lower()
        
        for style, keywords in self.styles.items():
            if any(keyword in text for keyword in keywords):
                return style
        
        return 'casual'  # По умолчанию
    
    def _parse_price(self, price_data: Any) -> Optional[float]:
        """Парсинг цены"""
        if not price_data:
            return None
        
        try:
            if isinstance(price_data, (int, float)):
                return float(price_data)
            
            if isinstance(price_data, str):
                # Убираем все кроме цифр и точки
                price_str = ''.join(c for c in price_data if c.isdigit() or c == '.')
                if price_str:
                    return float(price_str)
        except:
            pass
        
        return None
    
    def _generate_basic_description(self, result: EnhanceResult) -> str:
        """Генерация базового описания"""
        parts = []
        
        if result.brand:
            parts.append(f"Стильный товар от бренда {result.brand}.")
        
        if result.clothing_type:
            parts.append(f"Качественный(ая) {result.clothing_type}")
        
        if result.color:
            parts.append(f"в {result.color} цвете.")
        
        if result.materials:
            parts.append(f"Материал: {', '.join(result.materials)}.")
        
        parts.append("Отличное качество и современный дизайн.")
        
        return " ".join(parts)
    
    def _guess_materials(self, clothing_type: Optional[str]) -> List[str]:
        """Предположение материалов по типу одежды"""
        materials_map = {
            'футболка': ['хлопок', 'эластан'],
            'джинсы': ['деним', 'хлопок', 'эластан'],
            'платье': ['полиэстер', 'эластан'],
            'рубашка': ['хлопок', 'полиэстер'],
            'куртка': ['полиэстер', 'нylon'],
            'свитер': ['шерсть', 'акрил']
        }
        
        return materials_map.get(clothing_type, ['текстиль'])
    
    def _generate_article(self, name: str, brand: str) -> str:
        """Генерация артикула товара"""
        import hashlib
        
        text = f"{brand}{name}".lower().replace(' ', '')
        hash_obj = hashlib.md5(text.encode())
        return f"ART{hash_obj.hexdigest()[:8].upper()}"
    
    def _create_fallback_result(self, raw_data: Dict[str, Any]) -> EnhanceResult:
        """Создание базового результата при ошибке"""
        return EnhanceResult(
            name=raw_data.get('name', 'Товар'),
            price=self._parse_price(raw_data.get('price')),
            quality_score=3.0,
            confidence=3.0
        )
    
    def get_stats(self) -> Dict[str, Any]:
        """Получение статистики работы агента"""
        return {
            **self.stats,
            'ai_enabled': self.client is not None,
            'uptime': datetime.now().isoformat()
        }
