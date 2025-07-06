#!/usr/bin/env python3
"""
Enhanced Lamoda Parser Agent

Улучшенный парсер для извлечения товаров с Lamoda с поддержкой:
- Множественных стратегий парсинга
- Обработки ошибок и восстановления
- Кэширования и оптимизации
- Детального логирования
"""

import asyncio
import json
import re
import random
import time
import logging
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Union
from urllib.parse import urljoin, urlparse
from datetime import datetime, timedelta

import httpx
from bs4 import BeautifulSoup
import aiofiles
from pathlib import Path

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Конфигурация доменов
LAMODA_DOMAINS = {
    "ru": {"host": "https://www.lamoda.ru", "currency": "₽"},
    "kz": {"host": "https://www.lamoda.kz", "currency": "₸"},
    "by": {"host": "https://www.lamoda.by", "currency": "р."}
}

KNOWN_BRANDS = [
    'Nike', 'Adidas', 'Puma', 'Reebok', 'Jordan', 'Converse', 'New Balance', 
    'Vans', 'Under Armour', 'Asics', 'Mizuno', 'Skechers', 'Fila', 'Kappa', 
    'Umbro', 'Diadora', 'Calvin Klein', 'Tommy Hilfiger', 'Lacoste', 'Hugo Boss',
    'Demix', 'Outventure', 'Baon', 'Befree', 'Mango', 'Zara', 'H&M', 'Uniqlo',
    'Euphoria', 'Profit', 'Terranova', 'Pepe Jeans', 'Marco Tozzi', 'Tamaris',
    'Founds', 'Nume', 'Shoiberg', 'T.Taccardi', 'Abricot', 'Pierre Cardin',
    'Guess', 'Levi\'s', 'Jack & Jones', 'Only', 'Vero Moda'
]

@dataclass
class ParsedProduct:
    """Структура распарсенного товара для новой системы образов (5 категорий)"""
    sku: str
    name: str
    brand: str
    price: float
    old_price: Optional[float] = None
    url: str = ""
    image_url: str = ""
    image_urls: List[str] = field(default_factory=list)
    description: Optional[str] = None
    category: Optional[str] = None  # Одна из 5 категорий: top, bottom, footwear, accessory, fragrance
    clothing_type: Optional[str] = None  # То же что и category для совместимости
    color: Optional[str] = None
    sizes: List[str] = field(default_factory=list)
    style: Optional[str] = None
    # Убрано поле collection - коллекции удалены из системы
    rating: Optional[float] = None
    reviews_count: Optional[int] = None
    parse_quality: float = 0.0  # Качество парсинга от 0 до 1
    parse_metadata: Dict[str, Any] = field(default_factory=dict)
    parsed_at: datetime = field(default_factory=datetime.now)

@dataclass
class ParsingResult:
    """Результат парсинга"""
    products: List[ParsedProduct]
    total_found: int
    success_count: int
    failed_count: int
    quality_score: float
    parsing_time: float
    metadata: Dict[str, Any] = field(default_factory=dict)

class EnhancedLamodaParser:
    """
    Улучшенный парсер Lamoda с поддержкой:
    - Множественных стратегий
    - Восстановления после ошибок
    - Кэширования результатов
    - Детального анализа качества
    """

    def __init__(self, domain: str = "kz", cache_enabled: bool = True):
        if domain not in LAMODA_DOMAINS:
            raise ValueError(f"Unsupported domain: {domain}")
        
        self.domain = domain
        self.base_url = LAMODA_DOMAINS[domain]["host"]
        self.currency = LAMODA_DOMAINS[domain]["currency"]
        self.cache_enabled = cache_enabled
        self.cache = {}
        
        # Улучшенные заголовки для обхода блокировок
        self.headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'ru-RU,ru;q=0.9,en;q=0.8,kk;q=0.7',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0',
            'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
        }
        
        self.session = None
        self.stats = {
            'requests_made': 0,
            'cache_hits': 0,
            'parse_errors': 0,
            'recovery_attempts': 0
        }

        # Создаем папку для сохранения изображений
        self.images_dir = Path("uploads/items")
        self.images_dir.mkdir(parents=True, exist_ok=True)

    async def _get_session(self) -> httpx.AsyncClient:
        """Получить или создать HTTP сессию"""
        if self.session is None:
            timeout = httpx.Timeout(30.0, connect=15.0)
            self.session = httpx.AsyncClient(
                headers=self.headers,
                timeout=timeout,
                follow_redirects=True,
                limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
            )
        return self.session

    async def _make_request(self, url: str, **kwargs) -> Optional[httpx.Response]:
        """Выполнить HTTP запрос"""
        session = await self._get_session()
        
        try:
            # Добавляем случайную задержку
            await asyncio.sleep(random.uniform(0.5, 1.5))
            
            response = await session.get(url, **kwargs)
            self.stats['requests_made'] += 1
            
            if response.status_code == 429:  # Rate limiting
                logger.warning("Rate limited, waiting...")
                await asyncio.sleep(random.uniform(5, 10))
                return await self._make_request(url, **kwargs)
            
            if response.status_code in [200, 301, 302]:
                return response
            else:
                logger.warning(f"HTTP {response.status_code} for {url}")
                return None
                
        except Exception as e:
            logger.error(f"Request failed for {url}: {e}")
            return None

    async def parse_catalog(self, query: str, limit: int = 20, page: int = 1) -> List[ParsedProduct]:
        """Парсинг каталога с автоматическим скачиванием изображений"""
        start_time = time.time()
        
        try:
            logger.info(f"🔍 Starting catalog parsing for query: '{query}' (limit: {limit}, page: {page})")
            
            # Создаем URL для поиска
            search_url = f"{self.base_url}/catalogsearch/result/"
            params = {
                'q': query,
                'submit': 'y'
            }
            
            if page > 1:
                params['p'] = page
            
            logger.info(f"Making request to: {search_url}")
            
            # Выполняем запрос
            response = await self._make_request(search_url, params=params)
            if not response:
                logger.warning("Failed to get response from Lamoda")
                return []
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Парсим товары с улучшенной логикой
            products = []
            
            # Стратегия 1: JSON из скриптов
            logger.info("🔍 Trying JSON extraction...")
            json_products = self._extract_json_products(soup)
            
            for i, json_item in enumerate(json_products[:limit]):
                product_data = self._parse_product_from_json(json_item, i)
                if product_data:
                    parsed_product = self._convert_to_parsed_product(product_data, 'json')
                    if parsed_product:
                        products.append(parsed_product)
                        logger.info(f"✅ Parsed from JSON: {parsed_product.brand} - {parsed_product.name} - {parsed_product.price}₸")
            
            # Стратегия 2: HTML парсинг (если JSON не дал результатов)
            if not products:
                logger.info("🔍 Trying HTML parsing...")
                product_elements = self._find_product_elements(soup)
                
                for i, element in enumerate(product_elements[:limit]):
                    product_data = self._parse_product_from_element(element, i)
                    if product_data:
                        parsed_product = self._convert_to_parsed_product(product_data, 'html')
                        if parsed_product:
                            products.append(parsed_product)
                            logger.info(f"✅ Parsed from HTML: {parsed_product.brand} - {parsed_product.name} - {parsed_product.price}₸")
            
            logger.info(f"📈 Successfully parsed {len(products)} products")
            
            # Скачиваем изображения для всех найденных товаров
            enhanced_products = []
            for product in products:
                if product.image_url or product.image_urls:
                    # Скачиваем изображения
                    product_dict = {
                        'sku': product.sku,
                        'image_url': product.image_url,
                        'image_urls': product.image_urls
                    }
                    
                    downloaded_data = await self._download_product_images(product_dict)
                    
                    # Обновляем продукт с локальными путями
                    product.image_url = downloaded_data.get('image_url', product.image_url)
                    product.image_urls = downloaded_data.get('image_urls', product.image_urls)
                
                enhanced_products.append(product)
            
            return enhanced_products[:limit]
            
        except Exception as e:
            logger.error(f"Catalog parsing error: {e}")
            return []

    def _convert_to_parsed_product(self, product_data: Dict[str, Any], method: str) -> Optional[ParsedProduct]:
        """Конвертация данных продукта в ParsedProduct объект с нормализацией категорий"""
        try:
            # Проверяем обязательные поля
            if not all([
                product_data.get('name'),
                product_data.get('price'),
                product_data.get('sku')
            ]):
                return None
            
            # Извлекаем и нормализуем категорию
            raw_category = product_data.get('category')
            raw_clothing_type = self._extract_clothing_type(product_data['name'])
            normalized_category = self._normalize_category_for_outfits(
                raw_category, 
                raw_clothing_type, 
                product_data['name']
            )
            
            # Создаем ParsedProduct с нормализованными категориями
            return ParsedProduct(
                sku=product_data['sku'],
                name=product_data['name'],
                brand=product_data.get('brand', 'Unknown'),
                price=float(product_data['price']) if product_data['price'] else 0.0,
                old_price=float(product_data['old_price']) if product_data.get('old_price') else None,
                url=product_data.get('url', ''),
                image_url=product_data.get('image_url', ''),
                image_urls=product_data.get('image_urls', []),
                category=normalized_category,  # Нормализованная категория для системы образов
                clothing_type=normalized_category,  # Используем ту же нормализованную категорию
                parse_quality=0.9 if method == 'json' else 0.7,
                parse_metadata={
                    'method': method, 
                    'images_count': len(product_data.get('image_urls', [])),
                    'raw_category': raw_category,
                    'normalized_category': normalized_category
                }
            )
            
        except Exception as e:
            logger.error(f"Error converting product data: {e}")
            return None

    async def _parse_from_json_scripts(self, soup: BeautifulSoup, limit: int) -> List[ParsedProduct]:
        """Парсинг из JSON скриптов на странице"""
        products = []
        
        try:
            scripts = soup.find_all('script', type='application/ld+json')
            scripts.extend(soup.find_all('script', string=re.compile(r'window\.__INITIAL_STATE__')))
            scripts.extend(soup.find_all('script', string=re.compile(r'"products"')))
            
            for script in scripts:
                if not script.string:
                    continue
                
                try:
                    # Пытаемся найти JSON с товарами
                    content = script.string.strip()
                    
                    # Ищем различные JSON структуры
                    json_patterns = [
                        r'"products"\s*:\s*(\[.*?\])',
                        r'window\.__INITIAL_STATE__\s*=\s*({.*?});',
                        r'window\.__NUXT__\s*=\s*({.*?});'
                    ]
                    
                    for pattern in json_patterns:
                        matches = re.findall(pattern, content, re.DOTALL)
                        for match in matches:
                            try:
                                if match.startswith('['):
                                    data = json.loads(match)
                                    if isinstance(data, list):
                                        products.extend(self._parse_products_from_json_array(data, limit - len(products)))
                                else:
                                    data = json.loads(match)
                                    found_products = self._extract_products_from_json_object(data, limit - len(products))
                                    products.extend(found_products)
                                
                                if len(products) >= limit:
                                    return products[:limit]
                                    
                            except json.JSONDecodeError:
                                continue
                                
                except Exception as e:
                    logger.debug(f"Script parsing error: {e}")
                    continue
                    
        except Exception as e:
            logger.error(f"JSON script parsing failed: {e}")
        
        return products

    async def _parse_from_html_structure(self, soup: BeautifulSoup, limit: int) -> List[ParsedProduct]:
        """Парсинг из HTML структуры страницы"""
        products = []
        
        try:
            # Ищем различные селекторы для товаров
            selectors = [
                'a[href*="/p/"]',  # Прямые ссылки на товары
                'article[data-testid*="product"]',
                'div[class*="product-card"]',
                'div[class*="catalog-item"]',
                'div[data-testid*="product"]',
                '.x-product-card',
                '.product-tile'
            ]
            
            for selector in selectors:
                elements = soup.select(selector)
                if len(elements) > 3:  # Должно быть достаточно элементов
                    logger.info(f"Using selector: {selector} ({len(elements)} elements)")
                    
                    for i, element in enumerate(elements[:limit]):
                        try:
                            product = self._parse_product_from_element(element, i)
                            if product and product.price > 0:
                                products.append(product)
                                
                        except Exception as e:
                            logger.debug(f"Element parsing error: {e}")
                            continue
                    
                    if products:
                        break
                        
        except Exception as e:
            logger.error(f"HTML structure parsing failed: {e}")
        
        return products

    async def _parse_from_product_cards(self, soup: BeautifulSoup, limit: int) -> List[ParsedProduct]:
        """Парсинг из карточек товаров"""
        products = []
        
        try:
            # Ищем карточки с более специфичными селекторами
            card_selectors = [
                '.product-card',
                '[class*="ProductCard"]',
                '[data-testid*="product-card"]',
                '.catalog-item',
                '.item-card'
            ]
            
            for selector in card_selectors:
                cards = soup.select(selector)
                if cards:
                    logger.info(f"Found {len(cards)} cards with selector: {selector}")
                    
                    for i, card in enumerate(cards[:limit]):
                        try:
                            product = self._parse_product_card(card, i)
                            if product:
                                products.append(product)
                        except Exception as e:
                            logger.debug(f"Card parsing error: {e}")
                            continue
                    
                    if products:
                        break
                        
        except Exception as e:
            logger.error(f"Product card parsing failed: {e}")
        
        return products

    async def _parse_from_text_patterns(self, soup: BeautifulSoup, limit: int) -> List[ParsedProduct]:
        """Fallback парсинг из текстовых паттернов"""
        products = []
        
        try:
            page_text = soup.get_text()
            currency_symbol = self.currency
            
            # Паттерны для поиска товаров в тексте
            patterns = [
                rf'(\d{{1,3}}(?:\s+\d{{3}})*)\s*{re.escape(currency_symbol)}\s+([A-Z][A-Za-z\s&\.]+?)\s+([\w\s\-а-яё\.,"\'()]+?)(?=\d{{1,3}}(?:\s+\d{{3}})*\s*{re.escape(currency_symbol)}|$)',
                rf'([A-Z][A-Za-z\s&\.]+?)\s+([\w\s\-а-яё\.,"\'()]+?)\s+(\d{{1,3}}(?:\s+\d{{3}})*)\s*{re.escape(currency_symbol)}'
            ]
            
            for pattern in patterns:
                matches = re.findall(pattern, page_text, re.MULTILINE | re.IGNORECASE)
                
                for i, match in enumerate(matches[:limit]):
                    try:
                        if len(match) == 3:
                            if pattern.startswith(r'(\d'):  # Цена первая
                                price_str, brand, name = match
                            else:  # Цена последняя
                                brand, name, price_str = match
                            
                            price = float(price_str.replace(' ', ''))
                            if 100 <= price <= 10000000:
                                # Нормализуем категорию для совместимости с системой образов
                                normalized_category = self._normalize_category_for_outfits(
                                    None, None, name.strip()
                                )
                                
                                product = ParsedProduct(
                                    sku=f"TXT{self.domain.upper()}{i+1:04d}",
                                    name=name.strip()[:100],
                                    brand=self._normalize_brand(brand.strip()),
                                    price=price,
                                    category=normalized_category,
                                    clothing_type=normalized_category,
                                    parse_quality=0.3,  # Низкое качество для текстового парсинга
                                    parse_metadata={'method': 'text_patterns', 'normalized_category': normalized_category}
                                )
                                products.append(product)
                                
                    except Exception as e:
                        logger.debug(f"Text pattern parsing error: {e}")
                        continue
                
                if products:
                    break
                    
        except Exception as e:
            logger.error(f"Text pattern parsing failed: {e}")
        
        return products

    def _parse_products_from_json_array(self, data: list, limit: int) -> List[ParsedProduct]:
        """Парсинг товаров из JSON массива"""
        products = []
        
        for item in data[:limit]:
            try:
                if isinstance(item, dict):
                    product = self._parse_product_from_json(item)
                    if product:
                        products.append(product)
            except Exception as e:
                logger.debug(f"JSON item parsing error: {e}")
                continue
        
        return products

    def _extract_products_from_json_object(self, data: dict, limit: int) -> List[ParsedProduct]:
        """Рекурсивный поиск товаров в JSON объекте"""
        products = []
        
        def search_recursive(obj, path=""):
            nonlocal products
            
            if len(products) >= limit:
                return
                
            if isinstance(obj, dict):
                # Ищем ключи с товарами
                for key in ['products', 'items', 'catalog', 'results', 'data']:
                    if key in obj and isinstance(obj[key], list):
                        found = self._parse_products_from_json_array(obj[key], limit - len(products))
                        products.extend(found)
                        if len(products) >= limit:
                            return
                
                # Рекурсивно ищем в других ключах
                for key, value in obj.items():
                    if key not in ['products', 'items', 'catalog', 'results', 'data'] and len(products) < limit:
                        search_recursive(value, f"{path}.{key}")
                        
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    if len(products) >= limit:
                        break
                    search_recursive(item, f"{path}[{i}]")
        
        search_recursive(data)
        return products

    def _parse_product_from_json(self, item: Dict[str, Any], index: int = 0) -> Optional[Dict[str, Any]]:
        """Парсинг товара из JSON с улучшенным извлечением изображений"""
        try:
            product_data = {
                'name': None,
                'brand': None,
                'price': None,
                'old_price': None,
                'url': None,
                'image_url': None,
                'image_urls': [],
                'sku': None,
                'description': None,
                'category': None,
                'clothing_type': None,
                'color': None,
                'sizes': [],
                'style': None,
                'rating': None,
                'reviews_count': None
            }
            
            # Извлекаем основные данные
            product_data['sku'] = item.get('sku', f"JSON{index+1:04d}")
            product_data['name'] = item.get('name', '')
            
            # Бренд из объекта brand
            if 'brand' in item and isinstance(item['brand'], dict):
                product_data['brand'] = item['brand'].get('name', 'Unknown')
            else:
                product_data['brand'] = item.get('brand', 'Unknown')
            
            # Цена
            price = item.get('price_amount', item.get('price', 0))
            if isinstance(price, str):
                try:
                    price = float(price)
                except ValueError:
                    price = 0
            product_data['price'] = price
            
            # Старая цена
            old_price = item.get('old_price_amount', item.get('old_price'))
            if old_price and isinstance(old_price, str):
                try:
                    old_price = float(old_price)
                except ValueError:
                    old_price = None
            product_data['old_price'] = old_price
            
            # URL товара - проверяем разные поля
            url = ""
            if 'url' in item and item['url']:
                candidate_url = item['url']
                if candidate_url.startswith('/'):
                    url = f"{self.base_url}{candidate_url}"
                elif candidate_url.startswith('http'):
                    url = candidate_url
            
            # Если нет, строим URL из SKU + seo_tail (правильный формат Lamoda)
            if not url and product_data['sku']:
                seo_tail = item.get('seo_tail', '')
                if seo_tail:
                    url = f"{self.base_url}/p/{product_data['sku'].lower()}/{seo_tail}/"
                else:
                    url = f"{self.base_url}/p/{product_data['sku'].lower()}/"
            
            product_data['url'] = url
            
            # УЛУЧШЕННОЕ извлечение изображений (рекурсивный поиск как в рабочем парсере)
            found_images = []
            
            def normalize_image_url(img_url):
                """Нормализация URL изображения с преобразованием в формат img600x866"""
                if not img_url or not isinstance(img_url, str):
                    return None
                
                img_url = img_url.strip()
                if not img_url:
                    return None
                
                # Нормализация URL
                if img_url.startswith('//'):
                    full_url = 'https:' + img_url
                elif img_url.startswith('/'):
                    full_url = f"https://a.lmcdn.ru{img_url}"
                else:
                    full_url = img_url
                
                # Проверяем что это изображение Lamoda
                if (('lmcdn.ru' in full_url or 'lamoda' in full_url) and
                    any(ext in full_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp'])):
                    
                    # Преобразуем в формат img600x866 если это обычный CDN URL
                    if '/img600x866/' not in full_url and 'a.lmcdn.ru' in full_url:
                        # Извлекаем путь к файлу из URL
                        # Например: https://a.lmcdn.ru/R/T/RTLAEF651001_27427936_1_v4_2x.jpg
                        # Преобразуем в: https://a.lmcdn.ru/img600x866/R/T/RTLAEF651001_27427936_1_v4_2x.jpg
                        path_part = full_url.replace('https://a.lmcdn.ru/', '')
                        if path_part and not path_part.startswith('img600x866/'):
                            full_url = f"https://a.lmcdn.ru/img600x866/{path_part}"
                    
                    return full_url
                return None
            
            def walk_and_collect(obj):
                """Рекурсивный обход объекта для поиска изображений"""
                if len(found_images) >= 8:
                    return
                
                if isinstance(obj, str):
                    # Если строка похожа на URL изображения
                    if any(ext in obj.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp']):
                        normalized = normalize_image_url(obj)
                        if normalized and normalized not in found_images:
                            found_images.append(normalized)
                
                elif isinstance(obj, list):
                    for item_elem in obj:
                        walk_and_collect(item_elem)
                        if len(found_images) >= 8:
                            break
                
                elif isinstance(obj, dict):
                    # Сначала проверяем ключи, которые обычно содержат URL
                    priority_keys = ['url', 'src', 'href', 'path', 'image_url']
                    for key in priority_keys:
                        if key in obj and len(found_images) < 8:
                            walk_and_collect(obj[key])
                    
                    # Затем обходим остальные поля
                    for key, value in obj.items():
                        if key not in priority_keys and len(found_images) < 8:
                            walk_and_collect(value)
            
            # Поля, которые могут содержать изображения
            image_fields = [
                'image', 'images', 'photo', 'photos', 'picture', 'pictures',
                'main_image', 'preview_image', 'thumb', 'thumbs',
                'product_image', 'product_images', 'media', 'assets',
                'thumbnail', 'gallery'
            ]
            
            for field in image_fields:
                if field in item and len(found_images) < 8:
                    walk_and_collect(item[field])
            
            # Основное изображение из thumbnail
            thumbnail = item.get('thumbnail', '')
            if thumbnail:
                normalized = normalize_image_url(thumbnail)
                if normalized and normalized not in found_images:
                    found_images.insert(0, normalized)  # Добавляем в начало как главное
            
            # Дополнительные изображения из галереи
            gallery = item.get('gallery', [])
            if isinstance(gallery, list):
                for img_path in gallery:
                    if len(found_images) >= 8:
                        break
                    normalized = normalize_image_url(img_path)
                    if normalized and normalized not in found_images:
                        found_images.append(normalized)
            
            # Устанавливаем изображения
            product_data['image_urls'] = found_images
            product_data['image_url'] = found_images[0] if found_images else ""
            
            # Проверяем минимальные требования
            if not product_data['sku'] or not product_data['name'] or not product_data['price']:
                return None
            
            return product_data
            
        except Exception as e:
            logger.error(f"Error parsing Lamoda product JSON: {e}")
            return None

    def _parse_product_from_element(self, element, index: int = 0) -> Optional[Dict[str, Any]]:
        """Парсинг товара из HTML элемента с улучшенным извлечением изображений"""
        try:
            product_data = {
                'name': None,
                'brand': None,
                'price': None,
                'old_price': None,
                'url': None,
                'image_url': None,
                'image_urls': []
            }
            
            # Извлечение названия
            name_selectors = [
                'h3[class*="title"]', 'div[class*="title"]', 'span[class*="title"]',
                '[data-testid*="title"]', '[data-testid*="name"]',
                'h1, h2, h3, h4', '.product-card__product-name'
            ]
            
            for selector in name_selectors:
                name_elem = element.select_one(selector)
                if name_elem:
                    name_text = name_elem.get_text(strip=True)
                    if name_text and len(name_text) > 3:
                        product_data['name'] = name_text[:100]
                        break
            
            # Извлечение бренда
            brand_selectors = [
                'span[class*="brand"]', 'div[class*="brand"]',
                '[data-testid*="brand"]', '.product-card__brand-name'
            ]
            
            for selector in brand_selectors:
                brand_elem = element.select_one(selector)
                if brand_elem:
                    brand_text = brand_elem.get_text(strip=True)
                    if brand_text and len(brand_text) > 1:
                        product_data['brand'] = brand_text
                        break
            
            # Извлечение цен
            price_info = self._extract_prices_from_element(element)
            if price_info:
                product_data['price'] = price_info.get('current_price')
                product_data['old_price'] = price_info.get('old_price')
            
            # Извлечение URL товара
            url_selectors = ['a[href*="/p/"]', 'a[href]']
            for selector in url_selectors:
                link_elem = element.select_one(selector)
                if link_elem and link_elem.get('href'):
                    href = link_elem['href']
                    if href.startswith('/p/') or '/p/' in href:
                        if href.startswith('/'):
                            product_data['url'] = urljoin(self.base_url, href)
                        elif href.startswith('http'):
                            product_data['url'] = href
                        break
            
            # УЛУЧШЕННОЕ извлечение изображений (из рабочего парсера)
            found_images = set()
            
            # Основные селекторы для изображений Lamoda
            img_selectors = [
                'img[src*="lmcdn"]', 'img[data-src*="lmcdn"]',
                'img[data-lazy-src*="lmcdn"]', 'img[data-original*="lmcdn"]',
                'img[class*="image"]', 'img[class*="picture"]', 'img'
            ]
            
            for selector in img_selectors:
                img_elems = element.select(selector)
                for img in img_elems:
                    # Проверяем разные атрибуты изображений
                    src_attrs = ['src', 'data-src', 'data-lazy-src', 'data-original', 'data-srcset', 'srcset']
                    src = None
                    
                    for attr in src_attrs:
                        raw_val = img.get(attr)
                        if not raw_val:
                            continue
                        # Для атрибутов srcset / data-srcset берём первый URL до запятой или пробела
                        if attr in ['srcset', 'data-srcset']:
                            # srcset формата: "url1 1x, url2 2x" или "url1 236w"
                            raw_val = raw_val.split(',')[0].strip().split(' ')[0].strip()
                        src = raw_val
                        break
                    
                    if not src:
                        continue
                    
                    # Нормализация URL (как в рабочем парсере)
                    if src.startswith('//'):
                        full_url = 'https:' + src
                    elif src.startswith('/'):
                        full_url = urljoin(self.base_url, src)
                    else:
                        full_url = src
                    
                    # Фильтруем только изображения Lamoda
                    if (full_url and 
                        ('lmcdn.ru' in full_url or 'lamoda' in full_url) and
                        any(ext in full_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp'])):
                        found_images.add(full_url)
                
                if len(found_images) >= 8:
                    break
            
            # Дополнительный поиск изображений в inline-стилях background-image
            if len(found_images) < 8:
                styled_elems = element.select('[style*="background-image"], [data-bg], [data-image]')
                for styled in styled_elems:
                    style_attr = styled.get('style', '')
                    candidates = re.findall(r'url\(([^)]+)\)', style_attr)
                    for c in candidates:
                        if len(found_images) >= 8:
                            break
                        # Убираем кавычки и пробелы
                        c = c.strip('"\'').strip()
                        if not c:
                            continue
                        if c.startswith('//'):
                            full_url = 'https:' + c
                        elif c.startswith('/'):
                            full_url = urljoin(self.base_url, c)
                        else:
                            full_url = c
                        
                        if (full_url and 
                            ('lmcdn.ru' in full_url or 'lamoda' in full_url) and
                            any(ext in full_url.lower() for ext in ['.jpg', '.jpeg', '.png', '.webp']) and
                            full_url not in found_images):
                            found_images.add(full_url)
            
            # Конвертируем в список и устанавливаем главное изображение
            product_data['image_urls'] = list(found_images)
            if product_data['image_urls']:
                product_data['image_url'] = product_data['image_urls'][0]
            
            # Генерируем SKU
            sku = f"LMD{index + 1:04d}"
            if product_data['url']:
                sku_match = re.search(r'/([A-Z0-9]+)/?(?:\?|$)', product_data['url'])
                if sku_match:
                    sku = sku_match.group(1)
            
            product_data['sku'] = sku
            
            # Устанавливаем значения по умолчанию
            if not product_data['name']:
                product_data['name'] = "Product"
            if not product_data['brand']:
                product_data['brand'] = "Unknown"
            if not product_data['image_url']:
                product_data['image_url'] = ""
            
            return product_data
            
        except Exception as e:
            logger.error(f"Error parsing product from element {index}: {e}")
            return None

    def _parse_product_card(self, card, index: int) -> Optional[ParsedProduct]:
        """Парсинг карточки товара"""
        # Используем тот же метод, что и для элементов
        return self._parse_product_from_element(card, index)

    def _extract_prices_from_element(self, element) -> Optional[Dict[str, Optional[float]]]:
        """Извлечение цен из элемента"""
        try:
            price_info = {'current_price': None, 'old_price': None}
            
            # Селекторы для цен
            price_selectors = {
                'current': [
                    '[data-testid*="price-current"]',
                    '.price-current', '.price__current',
                    'span[class*="price"]:not([class*="old"])',
                    '.product-price__current'
                ],
                'old': [
                    '[data-testid*="price-old"]',
                    '.price-old', '.price__old',
                    'span[class*="price"][class*="old"]',
                    '.product-price__old'
                ]
            }
            
            # Ищем актуальную цену
            for selector in price_selectors['current']:
                elem = element.select_one(selector)
                if elem:
                    price_text = elem.get_text(strip=True)
                    if price_text and (self.currency in price_text):
                        price = self._extract_price_from_text(price_text)
                        if price:
                            price_info['current_price'] = price
                            break
            
            # Ищем старую цену
            for selector in price_selectors['old']:
                elem = element.select_one(selector)
                if elem:
                    price_text = elem.get_text(strip=True)
                    if price_text and (self.currency in price_text):
                        price = self._extract_price_from_text(price_text)
                        if price:
                            price_info['old_price'] = price
                            break
            
            # Fallback: ищем в тексте элемента
            if not price_info['current_price']:
                element_text = element.get_text()
                # Изменен паттерн для поддержки цен с ведущими нулями
                price_matches = re.findall(rf'(\d+(?:\s+\d+)*)\s*{re.escape(self.currency)}', element_text)
                
                if price_matches:
                    prices = []
                    for price_str in price_matches:
                        try:
                            # Убираем пробелы и ведущие нули
                            clean_price = price_str.replace(' ', '').lstrip('0') or '0'
                            price = float(clean_price)
                            if 100 <= price <= 10000000:
                                prices.append(price)
                        except ValueError:
                            continue
                    
                    if prices:
                        prices.sort()
                        price_info['current_price'] = prices[0]
                        if len(prices) > 1:
                            price_info['old_price'] = prices[-1]
            
            return price_info if price_info['current_price'] else None
            
        except Exception as e:
            logger.debug(f"Price extraction error: {e}")
            return None

    def _extract_price_from_text(self, text: str) -> Optional[float]:
        """Извлечение цены из текста"""
        if not text:
            return None
        
        # Очищаем текст
        clean_text = text.replace(self.currency, '').replace('₸', '').replace('₽', '').replace('р.', '').strip()
        
        # Ищем цены с пробелами (включая ведущие нули)
        price_pattern = r'\b(\d+(?:\s+\d+)*)\b'
        matches = re.findall(price_pattern, clean_text)
        
        if matches:
            for match in matches:
                try:
                    # Убираем пробелы и конвертируем в число
                    price_str = match.replace(' ', '')
                    # Убираем ведущие нули
                    price = float(price_str.lstrip('0') or '0')
                    if 100 <= price <= 10000000:
                        return price
                except ValueError:
                    continue
        
        # Fallback: числа без пробелов
        fallback_matches = re.findall(r'\b(\d{3,7})\b', clean_text)
        if fallback_matches:
            for match in fallback_matches:
                try:
                    price = float(match)
                    if 100 <= price <= 10000000:
                        return price
                except ValueError:
                    continue
        
        return None

    def _normalize_brand(self, brand: str) -> str:
        """Нормализация названия бренда"""
        if not brand or brand.lower() in ['unknown', 'none', '']:
            return "Unknown"
        
        # Ищем известные бренды
        brand_lower = brand.lower()
        for known_brand in KNOWN_BRANDS:
            if known_brand.lower() == brand_lower:
                return known_brand
            if known_brand.lower() in brand_lower:
                return known_brand
        
        # Очищаем и возвращаем первое слово
        cleaned = re.sub(r'[^\w\s&\.]', '', brand).strip()
        first_word = cleaned.split()[0] if cleaned.split() else brand
        return first_word.title()

    def _extract_brand_from_name(self, name: str) -> str:
        """Извлечение бренда из названия"""
        if not name:
            return "Unknown"
        
        # Ищем известные бренды в названии
        name_upper = name.upper()
        for brand in KNOWN_BRANDS:
            if brand.upper() in name_upper:
                return brand
        
        # Берем первое слово как потенциальный бренд
        words = name.split()
        if words:
            first_word = words[0]
            if len(first_word) > 2 and first_word.isalpha():
                return first_word.title()
        
        return "Unknown"

    def _extract_clothing_type(self, name: str) -> Optional[str]:
        """Извлечение типа одежды из названия товара с нормализацией под новую систему из 5 категорий"""
        if not name:
            return None
        
        name_lower = name.lower()
        
        # Маппинг ключевых слов на 5 строгих категорий образа
        clothing_patterns = {
            # ВСЁ ДЛЯ ВЕРХА -> top
            'top': [
                'футболка', 'футболки', 't-shirt', 'tshirt', 'майка', 'майки',
                'рубашка', 'рубашки', 'блузка', 'блузки', 'блуза', 'сорочка', 'shirt',
                'худи', 'толстовка', 'толстовки', 'hoodie', 'свитшот', 'свитшоты',
                'свитер', 'свитеры', 'джемпер', 'джемперы', 'пуловер', 'пуловеры', 'кардиган', 'кардиганы',
                'куртка', 'куртки', 'жакет', 'жакеты', 'пиджак', 'пиджаки', 'бомбер', 'ветровка',
                'пальто', 'шуба', 'шубы', 'плащ', 'плащи', 'тренч', 'парка', 'парки',
                'платье', 'платья', 'сарафан', 'сарафаны', 'dress', 'кофта', 'кофты',
                'лонгслив', 'лонгсливы', 'longsleeve', 'поло', 'polo',
                'sweater', 'jacket', 'coat', 'blouse'
            ],
            
            # ВСЁ ДЛЯ НИЗА -> bottom
            'bottom': [
                'брюки', 'штаны', 'леггинсы', 'лосины', 'pants', 'trousers',
                'джинсы', 'jeans', 'denim', 'шорты', 'shorts',
                'юбка', 'юбки', 'skirt', 'капри', 'легинсы'
            ],
            
            # ОБУВЬ -> footwear
            'footwear': [
                'кроссовки', 'ботинки', 'туфли', 'сапоги', 'босоножки', 'сандалии', 
                'кеды', 'мокасины', 'лоферы', 'обувь', 'shoes', 'sneakers', 'boots',
                'балетки', 'слипоны', 'угги'
            ],
            
            # АКСЕССУАРЫ -> accessory
            'accessory': [
                'сумка', 'сумки', 'рюкзак', 'рюкзаки', 'ремень', 'ремни', 'шарф', 'шарфы',
                'платок', 'платки', 'очки', 'часы', 'украшения', 'кольцо', 'серьги',
                'браслет', 'цепочка', 'кулон', 'перчатки', 'варежки', 'шапка', 'шапки',
                'кепка', 'кепки', 'бейсболка', 'панама', 'берет', 'bag', 'watch'
            ],
            
            # АРОМАТЫ -> fragrance
            'fragrance': [
                'духи', 'парфюм', 'туалетная вода', 'одеколон', 'аромат', 'fragrance',
                'perfume', 'eau de toilette', 'eau de parfum', 'дезодорант', 'парфюмерия',
                'масло эфирное', 'эфирное масло', 'спрей ароматический', 'парфюмерная вода'
            ]
        }
        
        # Проверяем каждую категорию
        for clothing_type, keywords in clothing_patterns.items():
            for keyword in keywords:
                if keyword in name_lower:
                    return clothing_type
        
        # Дополнительная логика на основе контекста
        if any(word in name_lower for word in ['мужск', 'женск', 'детск']):
            # Если есть указание на пол/возраст, пытаемся определить по контексту
            if any(word in name_lower for word in ['верх', 'топ']):
                return 'top'  # По умолчанию для верха
            elif any(word in name_lower for word in ['низ', 'bottom']):
                return 'bottom'   # По умолчанию для низа
        
        return None

    def _normalize_category_for_outfits(self, category: Optional[str], clothing_type: Optional[str], name: str) -> str:
        """
        Нормализация категории товара для совместимости с новой системой образов
        
        Возвращает одну из 5 строгих категорий:
        - top (верх) - футболки, рубашки, платья, куртки, свитера
        - bottom (низ) - джинсы, юбки, шорты, брюки, леггинсы
        - footwear (обувь) - кроссовки, туфли, ботинки, сандалии
        - accessory (аксессуары) - сумки, часы, очки, украшения  
        - fragrance (ароматы) - духи, парфюм, туалетная вода
        """
        
        # Сначала пытаемся использовать clothing_type если он уже определен
        if clothing_type:
            # Преобразуем старые категории в новые 5 категорий
            old_to_new_mapping = {
                # Все виды верха -> top
                'tshirt': 'top', 'shirt': 'top', 'hoodie': 'top', 'sweater': 'top', 
                'jacket': 'top', 'coat': 'top', 'dress': 'top',
                # Все виды низа -> bottom  
                'pants': 'bottom', 'jeans': 'bottom', 'shorts': 'bottom', 'skirt': 'bottom',
                # Остальные остаются как есть
                'footwear': 'footwear', 'accessories': 'accessory', 'fragrances': 'fragrance'
            }
            return old_to_new_mapping.get(clothing_type, clothing_type)
        
        # Если есть category, пытаемся ее нормализовать
        if category:
            category_lower = category.lower()
            
            # Прямое соответствие с новыми 5 категориями
            if category_lower in ['top', 'bottom', 'footwear', 'accessory', 'fragrance']:
                return category_lower
            
            # Маппинг всех возможных названий на 5 категорий
            category_mapping = {
                # ВСЁ ДЛЯ ВЕРХА -> top
                'tops': 'top', 'верх': 'top', 'футболка': 'top', 'майка': 'top',
                'рубашка': 'top', 'блузка': 'top', 'блуза': 'top', 'shirt': 'top',
                'толстовка': 'top', 'худи': 'top', 'свитшот': 'top', 'hoodie': 'top',
                'свитер': 'top', 'джемпер': 'top', 'пуловер': 'top', 'sweater': 'top',
                'куртка': 'top', 'жакет': 'top', 'пиджак': 'top', 'jacket': 'top',
                'пальто': 'top', 'плащ': 'top', 'coat': 'top',
                'платье': 'top', 'сарафан': 'top', 'dress': 'top',
                'кофта': 'top', 'кофты': 'top', 'джерси': 'top', 'tshirt': 'top',
                
                # ВСЁ ДЛЯ НИЗА -> bottom  
                'bottoms': 'bottom', 'низ': 'bottom', 'брюки': 'bottom', 'штаны': 'bottom',
                'леггинсы': 'bottom', 'легинсы': 'bottom', 'pants': 'bottom', 'trousers': 'bottom',
                'джинсы': 'bottom', 'jeans': 'bottom', 'denim': 'bottom',
                'шорты': 'bottom', 'shorts': 'bottom',
                'юбка': 'bottom', 'юбки': 'bottom', 'skirt': 'bottom',
                'лосины': 'bottom', 'капри': 'bottom',
                
                # ОБУВЬ -> footwear
                'обувь': 'footwear', 'shoes': 'footwear', 'кроссовки': 'footwear',
                'ботинки': 'footwear', 'туфли': 'footwear', 'сапоги': 'footwear',
                'босоножки': 'footwear', 'сандалии': 'footwear', 'балетки': 'footwear',
                'кеды': 'footwear', 'слипоны': 'footwear', 'мокасины': 'footwear',
                'boots': 'footwear', 'sneakers': 'footwear', 'sandals': 'footwear',
                
                # АКСЕССУАРЫ -> accessory
                'аксессуары': 'accessory', 'accessories': 'accessory', 'сумка': 'accessory',
                'сумки': 'accessory', 'рюкзак': 'accessory', 'рюкзаки': 'accessory',
                'ремень': 'accessory', 'ремни': 'accessory', 'часы': 'accessory',
                'очки': 'accessory', 'украшения': 'accessory', 'кольцо': 'accessory',
                'серьги': 'accessory', 'браслет': 'accessory', 'шарф': 'accessory',
                'платок': 'accessory', 'перчатки': 'accessory', 'шапка': 'accessory',
                'bag': 'accessory', 'watch': 'accessory', 'glasses': 'accessory',
                
                # АРОМАТЫ -> fragrance  
                'духи': 'fragrance', 'парфюм': 'fragrance', 'аромат': 'fragrance',
                'туалетная вода': 'fragrance', 'одеколон': 'fragrance', 'парфюмерия': 'fragrance',
                'fragrance': 'fragrance', 'perfume': 'fragrance', 'cologne': 'fragrance'
            }
            
            if category_lower in category_mapping:
                return category_mapping[category_lower]
        
        # Если ничего не подошло, определяем по названию
        detected_type = self._smart_extract_category_from_name(name)
        return detected_type or 'accessory'  # По умолчанию аксессуары
    
    def _smart_extract_category_from_name(self, name: str) -> Optional[str]:
        """Умное извлечение одной из 5 категорий из названия товара"""
        if not name:
            return None
        
        name_lower = name.lower()
        
        # Проверяем по ключевым словам для каждой из 5 категорий
        category_keywords = {
            'top': [
                'футболка', 'майка', 'рубашка', 'блузка', 'блуза', 'платье',
                'худи', 'толстовка', 'свитшот', 'свитер', 'джемпер', 'пуловер',
                'куртка', 'жакет', 'пиджак', 'пальто', 'плащ', 'кофта',
                'лонгслив', 'лонгсливы', 'поло',
                't-shirt', 'tshirt', 'shirt', 'blouse', 'dress', 'hoodie',
                'sweater', 'jacket', 'coat', 'cardigan', 'longsleeve', 'polo'
            ],
            'bottom': [
                'брюки', 'штаны', 'джинсы', 'шорты', 'юбка', 'леггинсы',
                'лосины', 'капри', 'pants', 'jeans', 'shorts', 'skirt',
                'trousers', 'leggings'
            ],
            'footwear': [
                'кроссовки', 'ботинки', 'туфли', 'сапоги', 'босоножки',
                'сандалии', 'балетки', 'кеды', 'мокасины', 'обувь',
                'sneakers', 'boots', 'shoes', 'sandals', 'flats'
            ],
            'accessory': [
                'сумка', 'рюкзак', 'ремень', 'часы', 'очки', 'шарф',
                'платок', 'перчатки', 'шапка', 'кепка', 'украшения',
                'bag', 'backpack', 'belt', 'watch', 'glasses', 'scarf'
            ],
            'fragrance': [
                'духи', 'парфюм', 'туалетная вода', 'одеколон', 'аромат',
                'масло эфирное', 'эфирное', 'спрей ароматический', 'парфюмерная вода',
                'perfume', 'fragrance', 'cologne', 'eau de toilette', 'essential oil'
            ]
        }
        
        # Ищем совпадения для каждой категории
        for category, keywords in category_keywords.items():
            for keyword in keywords:
                if keyword in name_lower:
                    return category
        
        return None

    def _extract_sku_from_url(self, url: str) -> Optional[str]:
        """Извлечение SKU из URL"""
        try:
            path_parts = urlparse(url).path.strip('/').split('/')
            
            # Ищем часть после /p/
            if len(path_parts) >= 2 and path_parts[0] == 'p':
                sku_candidate = path_parts[1]
                if len(sku_candidate) >= 8 and sku_candidate.replace('-', '').isalnum():
                    return sku_candidate.upper()
            
            # Ищем любую длинную алфавитно-цифровую часть
            for part in path_parts:
                if len(part) >= 8 and part.replace('-', '').replace('_', '').isalnum():
                    return part.upper()
            
            return None
            
        except Exception:
            return None

    def _deduplicate_and_enhance(self, products: List[ParsedProduct]) -> List[ParsedProduct]:
        """Удаление дубликатов и улучшение данных"""
        seen_skus = set()
        seen_names = set()
        unique_products = []
        
        for product in products:
            # Проверяем дубликаты по SKU
            if product.sku in seen_skus:
                continue
            
            # Проверяем дубликаты по названию (для похожих товаров)
            name_key = f"{product.brand}:{product.name}".lower()
            if name_key in seen_names:
                continue
            
            # Улучшаем данные
            enhanced_product = self._enhance_product_data(product)
            
            seen_skus.add(product.sku)
            seen_names.add(name_key)
            unique_products.append(enhanced_product)
        
        return unique_products

    def _enhance_product_data(self, product: ParsedProduct) -> ParsedProduct:
        """Улучшение данных товара"""
        # Улучшаем качество парсинга на основе заполненности полей
        quality_factors = {
            'has_sku': 0.1 if product.sku else 0,
            'has_name': 0.2 if product.name else 0,
            'has_brand': 0.15 if product.brand != "Unknown" else 0,
            'has_price': 0.2 if product.price > 0 else 0,
            'has_url': 0.1 if product.url else 0,
            'has_image': 0.1 if product.image_url else 0,
            'has_description': 0.05 if product.description else 0,
            'has_clothing_type': 0.05 if product.clothing_type else 0,
            'has_multiple_images': 0.05 if len(product.image_urls) > 1 else 0
        }
        
        base_quality = product.parse_quality
        enhancement_factor = sum(quality_factors.values())
        product.parse_quality = min(1.0, base_quality + enhancement_factor)
        
        # Добавляем дополнительные метаданные
        product.parse_metadata.update({
            'enhanced': True,
            'quality_factors': quality_factors,
            'enhancement_factor': enhancement_factor
        })
        
        return product

    def _calculate_quality_score(self, products: List[ParsedProduct]) -> float:
        """Вычисление общего качества парсинга"""
        if not products:
            return 0.0
        
        total_quality = sum(p.parse_quality for p in products)
        avg_quality = total_quality / len(products)
        
        # Бонус за количество товаров
        quantity_bonus = min(0.1, len(products) / 100)
        
        return min(1.0, avg_quality + quantity_bonus)

    async def close(self):
        """Закрытие ресурсов"""
        if self.session:
            await self.session.aclose()
            self.session = None
        
        # Очищаем кэш
        self.cache.clear()
        
        logger.info(f"Parser closed. Stats: {self.stats}")

    def __del__(self):
        """Деструктор"""
        if self.session:
            try:
                asyncio.create_task(self.close())
            except:
                pass

    def _extract_json_products(self, soup: BeautifulSoup) -> List[Dict[str, Any]]:
        """Извлечение товаров из JSON данных в скриптах страницы"""
        products = []
        
        def _find_products_array(text: str) -> Optional[str]:
            """Найти и вернуть JSON-строку массива products с балансировкой скобок"""
            key = '"products"'
            start_key = text.find(key)
            if start_key == -1:
                return None
            # ищем первую открывающую квадратную скобку после ключа
            array_start = text.find('[', start_key)
            if array_start == -1:
                return None
            depth = 0
            for idx in range(array_start, len(text)):
                ch = text[idx]
                if ch == '[':
                    depth += 1
                elif ch == ']':
                    depth -= 1
                    if depth == 0:
                        return text[array_start:idx + 1]
            return None
        
        try:
            script_tags = soup.find_all('script')
            
            for script in script_tags:
                if not script.string:
                    continue
                    
                script_content = script.string.strip()

                # 1) Попытка найти products через helper (поддержка __NUXT__)
                if '"products"' in script_content:
                    products_json_str = _find_products_array(script_content)
                    if products_json_str:
                        try:
                            products_data = json.loads(products_json_str)
                            if isinstance(products_data, list):
                                products.extend(products_data)
                                logger.info(f"Found {len(products_data)} products in JSON")
                                return products
                        except json.JSONDecodeError as e:
                            logger.debug(f"JSON decode error (products array): {e}")
                
                # Паттерны для поиска JSON с товарами
                json_patterns = [
                    r'"products"\s*:\s*(\[[\s\S]*?\])',
                    r'window\.__INITIAL_STATE__\s*=\s*({[\s\S]*?});',
                    r'window\.dataLayer\s*=\s*(\[[\s\S]*?\]);',
                    r'window\.__NEXT_DATA__\s*=\s*({[\s\S]*?});',
                    r'catalogsearch.*?"products"\s*:\s*(\[[\s\S]*?\])',
                    r'"catalog"\s*:\s*{[\s\S]*?"items"\s*:\s*(\[[\s\S]*?\])',
                ]
                
                for pattern in json_patterns:
                    matches = re.findall(pattern, script_content, re.DOTALL)
                    
                    for match in matches:
                        try:
                            # Если это массив товаров
                            if match.strip().startswith('['):
                                products_data = json.loads(match)
                                if isinstance(products_data, list):
                                    products.extend(products_data)
                                    
                            # Если это объект с товарами
                            else:
                                data = json.loads(match)
                                found_products = self._find_products_in_object(data)
                                products.extend(found_products)
                                
                        except json.JSONDecodeError:
                            continue
                        except Exception:
                            continue
                
                if products:
                    break
        
        except Exception as e:
            logger.error(f"Error extracting JSON from scripts: {e}")
        
        return products

    def _find_products_in_object(self, data: dict) -> List[Dict[str, Any]]:
        """Рекурсивный поиск товаров в JSON объекте"""
        products = []
        
        def search_recursive(obj, path=""):
            nonlocal products
                
            if isinstance(obj, dict):
                # Ищем ключи которые могут содержать товары
                product_keys = ['products', 'items', 'catalog', 'results', 'data']
                for key in product_keys:
                    if key in obj and isinstance(obj[key], list):
                        products.extend(obj[key])
                        return
                
                # Рекурсивно проверяем другие ключи
                for key, value in obj.items():
                    if key not in product_keys:
                        search_recursive(value, f"{path}.{key}")
                        
            elif isinstance(obj, list):
                for i, item in enumerate(obj):
                    search_recursive(item, f"{path}[{i}]")
        
        search_recursive(data)
        return products

    def _find_product_elements(self, soup: BeautifulSoup) -> List:
        """Найти блоки товаров в HTML"""
        # Попробуем различные селекторы, начиная с наиболее специфичных
        selectors = [
            # Селекторы для современного Lamoda
            'a[href*="/p/"]',  # Прямые ссылки на товары
            'div[class*="product"] a[href]',  # Ссылки внутри блоков товаров
            'article a[href]',  # Ссылки в article элементах
            '.product-card a[href]',  # Старые селекторы
            '.product-card',
            '.product-item',
            '.catalog-item',
            '.item-card',
            # Селекторы на основе классов
            '[class*="product"]',
            '[class*="item"]',
            '[class*="card"]',
            # Структурные селекторы
            'article',
            '.grid-item',
            'li[class*="item"]',
            # Fallback селекторы
            'div[data-*]',
        ]
        
        for selector in selectors:
            blocks = soup.select(selector)
            if blocks and len(blocks) > 3:  # Должно быть хотя бы несколько товаров
                logger.info(f"Found {len(blocks)} product blocks with selector: {selector}")
                return blocks
        
        return []

    async def _download_image(self, image_url: str, product_sku: str) -> Optional[str]:
        """Скачивает изображение и сохраняет локально для AI обработки"""
        try:
            if not image_url or not product_sku:
                return None
                
            # Создаем уникальное имя файла
            file_extension = self._get_file_extension(image_url)
            filename = f"{product_sku}_{int(time.time())}{file_extension}"
            filepath = self.images_dir / filename
            
            # Скачиваем изображение
            async with httpx.AsyncClient() as client:
                response = await client.get(image_url, headers=self.headers, timeout=30.0)
                if response.status_code == 200:
                    async with aiofiles.open(filepath, 'wb') as f:
                        await f.write(response.content)
                    
                    # Возвращаем относительный путь для сохранения в БД
                    return f"/uploads/items/{filename}"
                    
        except Exception as e:
            logger.error(f"Error downloading image {image_url}: {e}")
            return None
    
    def _get_file_extension(self, url: str) -> str:
        """Определяет расширение файла из URL"""
        parsed = urlparse(url)
        path = parsed.path.lower()
        
        if '.jpg' in path or '.jpeg' in path:
            return '.jpg'
        elif '.png' in path:
            return '.png'
        elif '.webp' in path:
            return '.webp'
        else:
            return '.jpg'  # По умолчанию

    async def _download_product_images(self, product_data: Dict[str, Any]) -> Dict[str, Any]:
        """Скачивает все изображения товара для AI обработки"""
        if not product_data.get('sku'):
            return product_data
            
        sku = product_data['sku']
        downloaded_urls = []
        
        # Скачиваем основное изображение
        if product_data.get('image_url'):
            local_url = await self._download_image(product_data['image_url'], sku)
            if local_url:
                downloaded_urls.append(local_url)
                product_data['image_url'] = local_url
        
        # Скачиваем дополнительные изображения
        if product_data.get('image_urls'):
            for img_url in product_data['image_urls'][:5]:  # Максимум 5 изображений
                local_url = await self._download_image(img_url, f"{sku}_{len(downloaded_urls)}")
                if local_url:
                    downloaded_urls.append(local_url)
            
            product_data['image_urls'] = downloaded_urls
        
        return product_data


# Пример использования
async def main():
    """Тестирование парсера"""
    parser = EnhancedLamodaParser(domain="kz")
    
    try:
        result = await parser.parse_catalog("nike", limit=10)
        
        print(f"\n📊 Parsing Results:")
        print(f"   Products found: {len(result)}")
        print(f"   Quality score: {parser._calculate_quality_score(result):.2f}")
        print(f"   Parsing time: {time.time() - result[0].parsed_at:.2f}s")
        
        for i, product in enumerate(result[:3], 1):
            print(f"\n{i}. {product.name}")
            print(f"   Brand: {product.brand}")
            print(f"   Price: {product.price}₸")
            print(f"   Quality: {product.parse_quality:.2f}")
            print(f"   SKU: {product.sku}")
            
    finally:
        await parser.close()


if __name__ == "__main__":
    asyncio.run(main())
