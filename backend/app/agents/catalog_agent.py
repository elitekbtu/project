#!/usr/bin/env python3
"""
Catalog Management Agent

Агент для записи и управления товарами в каталоге:
- Точное соответствие схеме Item модели
- Интеграция с description_agent для идеальных данных
- Валидация и дедупликация товаров
- Управление изображениями и вариантами
- Отслеживание статистики загрузки
"""

import asyncio
import logging
import os
import hashlib
import uuid
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Union, Tuple
from datetime import datetime
from urllib.parse import urlparse
from pathlib import Path

import httpx
import aiofiles
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import and_, or_

from app.core.database import get_db, SessionLocal
from app.db.models.item import Item
from app.db.models.item_image import ItemImage
from app.db.models.variant import ItemVariant
from .parser_agent import ParsedProduct
from .description_agent import DescriptionAgent, EnhanceResult

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@dataclass
class PerfectItem:
    """Идеальный товар для записи в БД - точно по схеме Item"""
    # Обязательные поля
    name: str
    
    # Опциональные поля по схеме Item
    brand: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    clothing_type: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    article: Optional[str] = None
    style: Optional[str] = None
    # Убрано поле collection - коллекции больше не используются
    image_url: Optional[str] = None  # Основное изображение
    
    # Дополнительные изображения
    image_urls: List[str] = field(default_factory=list)
    
    # Варианты товара
    variants: List[Dict[str, Any]] = field(default_factory=list)
    
    # Метаданные для контроля качества
    source_url: Optional[str] = None
    quality_score: float = 0.0
    ai_enhanced: bool = False
    enhanced_fields: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class ImportResult:
    """Результат импорта товара"""
    success: bool
    item_id: Optional[int] = None
    action: str = 'unknown'  # created, updated, skipped
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    item_data: Optional[Dict[str, Any]] = None


@dataclass
class ImportSummary:
    """Краткая сводка результатов импорта для совместимости с задачами Celery"""
    imported_count: int = 0
    updated_count: int = 0
    skipped_count: int = 0
    error_count: int = 0
    total_processed: int = 0
    import_time: float = 0.0  # seconds
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class CatalogAgent:
    """Агент для управления каталогом товаров"""
    
    def __init__(self, upload_dir: str = "uploads/items"):
        """Создание экземпляра агента

        Args:
            upload_dir: Базовая директория для сохранения изображений (по умолчанию uploads/items)
        """
        self.description_agent = DescriptionAgent()

        # Счётчики и статистика
        self.stats = {
            'processed_items': 0,
            'created_items': 0,
            'updated_items': 0,
            'skipped_items': 0,
            'duplicate_skus': 0,
            'ai_enhanced_items': 0,
            'images_processed': 0,
            'variants_created': 0,
            'database_operations': 0,
            'errors': 0
        }
        
        # Настройки загрузки изображений
        self.image_base_path = Path(upload_dir)
        self.image_base_path.mkdir(parents=True, exist_ok=True)
        
    async def import_parsed_products(self, products: List[ParsedProduct]) -> Dict[str, Any]:
        """
        Импорт списка парсенных товаров в каталог
        
        Args:
            products: Список товаров с парсера
            
        Returns:
            Сводка по импорту
        """
        results = []
        
        try:
            # Обрабатываем товары батчами
            batch_size = 10
            for i in range(0, len(products), batch_size):
                batch = products[i:i + batch_size]
                batch_results = await self._process_batch(batch)
                results.extend(batch_results)
                
                # Небольшая пауза между батчами
                await asyncio.sleep(0.1)
            
            # Подготавливаем итоговый отчет
            summary = self._create_import_summary(results)
            logger.info(f"Импорт завершен: {summary}")
            
            return summary
            
        except Exception as e:
            logger.error(f"Ошибка массового импорта: {e}")
            self.stats['errors'] += 1
            return {
                'success': False,
                'error': str(e),
                'processed': len(results),
                'stats': self.stats
            }
    
    async def _process_batch(self, products: List[ParsedProduct]) -> List[ImportResult]:
        """Обработка батча товаров"""
        tasks = []
        
        for product in products:
            task = self._process_single_product(product)
            tasks.append(task)
        
        # Выполняем параллельно
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Обрабатываем исключения
        processed_results = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Ошибка обработки товара: {result}")
                processed_results.append(ImportResult(
                    success=False,
                    action='error',
                    errors=[str(result)]
                ))
            else:
                processed_results.append(result)
        
        return processed_results
    
    async def _process_single_product(self, product: ParsedProduct) -> ImportResult:
        """Обработка одного товара"""
        try:
            self.stats['processed_items'] += 1
            
            # Шаг 1: Конвертируем ParsedProduct в словарь для description_agent
            raw_data = self._convert_parsed_product(product)
            
            # Шаг 2: Улучшаем данные через AI
            enhanced_data = await self.description_agent.enhance_product_data(raw_data)
            
            # Шаг 3: Создаем идеальный товар
            perfect_item = self._create_perfect_item(enhanced_data, product)
            
            # Шаг 4: Сохраняем в БД
            result = await self._save_to_database(perfect_item)
            
            if enhanced_data.enhanced_fields:
                self.stats['ai_enhanced_items'] += 1
            
            return result
            
        except Exception as e:
            logger.error(f"Ошибка обработки товара {product.sku}: {e}")
            self.stats['errors'] += 1
            return ImportResult(
                success=False,
                action='error',
                errors=[f"Processing error: {str(e)}"]
            )
    
    def _convert_parsed_product(self, product: ParsedProduct) -> Dict[str, Any]:
        """Конвертация ParsedProduct в словарь для description_agent"""
        return {
            'name': product.name,
            'brand': product.brand,
            'price': product.price,
            'old_price': product.old_price,
            'description': product.description,
            'color': product.color,
            'sizes': product.sizes,  # Исправлено: sizes вместо size
            'sku': product.sku,
            'image_urls': product.image_urls,
            'category': product.category,  # Исправлено: category вместо categories
            'clothing_type': product.clothing_type,
            'url': product.url,  # Исправлено: url вместо source_url
            'parse_quality': product.parse_quality  # Исправлено: parse_quality вместо quality_score
        }
    
    def _create_perfect_item(self, enhanced: EnhanceResult, original: ParsedProduct) -> PerfectItem:
        """Создание идеального товара из улучшенных данных"""
        # Основное изображение
        main_image = None
        if original.image_urls:
            main_image = original.image_urls[0]
        elif original.image_url:
            main_image = original.image_url
        
        # Все изображения (добавляем main_image, если его нет в списке)
        all_images = list(original.image_urls) if original.image_urls else []
        if main_image and main_image not in all_images:
            all_images.insert(0, main_image)
        
        perfect_item = PerfectItem(
            # Обязательные поля
            name=enhanced.name,
            
            # Поля по схеме Item
            brand=enhanced.brand,
            color=enhanced.color,
            size=enhanced.size,
            clothing_type=enhanced.clothing_type,
            description=enhanced.description,
            price=enhanced.price,
            category=enhanced.category,
            article=enhanced.article,
            style=enhanced.style,
            # Убрано поле collection - коллекции больше не используются
            image_url=main_image,
            image_urls=all_images,
            
            # Метаданные
            source_url=original.url,
            quality_score=enhanced.quality_score,
            ai_enhanced=bool(enhanced.enhanced_fields),
            enhanced_fields=enhanced.enhanced_fields
        )
        
        # Создаем варианты товара если есть размеры/цвета
        perfect_item.variants = self._create_variants(perfect_item, original)
        
        return perfect_item
    
    def _create_variants(self, item: PerfectItem, original: ParsedProduct) -> List[Dict[str, Any]]:
        """Создание вариантов товара"""
        variants = []
        
        # Базовый вариант
        base_variant = {
            'size': item.size,
            'color': item.color,
            'sku': item.article or original.sku,
            'stock': 10,  # По умолчанию
            'price': item.price
        }
        variants.append(base_variant)
        
        # Дополнительные размеры если есть
        if original.sizes:
            for size in original.sizes:
                if size != item.size:  # Не дублируем базовый
                    variants.append({
                        'size': size,
                        'color': item.color,
                        'sku': f"{item.article or original.sku}_{size}",
                        'stock': 5,
                        'price': item.price
                    })
        
        return variants
    
    async def _save_to_database(self, perfect_item: PerfectItem) -> ImportResult:
        """Сохранение идеального товара в БД"""
        db = SessionLocal()
        
        try:
            # Проверяем существующий товар
            existing_item = self._find_existing_item(db, perfect_item)
            
            if existing_item:
                # Обновляем существующий
                result = await self._update_existing_item(db, existing_item, perfect_item)
                if result['updated']:
                    self.stats['updated_items'] += 1
                    action = 'updated'
                else:
                    self.stats['skipped_items'] += 1
                    action = 'skipped'
            else:
                # Создаем новый
                result = await self._create_new_item(db, perfect_item)
                if result['created']:
                    self.stats['created_items'] += 1
                    action = 'created'
                else:
                    action = 'failed'
            
            db.commit()
            
            return ImportResult(
                success=result.get('created', False) or result.get('updated', False),
                item_id=result.get('item_id'),
                action=action,
                errors=result.get('errors', []),
                warnings=result.get('warnings', []),
                item_data={
                    'name': perfect_item.name,
                    'brand': perfect_item.brand,
                    'price': perfect_item.price,
                    'ai_enhanced': perfect_item.ai_enhanced
                }
            )
            
        except Exception as e:
            db.rollback()
            logger.error(f"Ошибка сохранения товара: {e}")
            return ImportResult(
                success=False,
                action='error',
                errors=[str(e)]
            )
        finally:
            db.close()
    
    def _find_existing_item(self, db: Session, perfect_item: PerfectItem) -> Optional[Item]:
        """Поиск существующего товара"""
        try:
            # Поиск по артикулу
            if perfect_item.article:
                existing = db.query(Item).filter(Item.article == perfect_item.article).first()
                if existing:
                    return existing
            
            # Поиск по комбинации бренд + название
            if perfect_item.brand:
                existing = db.query(Item).filter(
                    and_(
                        Item.brand == perfect_item.brand,
                        Item.name == perfect_item.name
                    )
                ).first()
                if existing:
                    self.stats['duplicate_skus'] += 1
                    return existing
            
            # Поиск только по названию (для товаров без бренда)
            existing = db.query(Item).filter(Item.name == perfect_item.name).first()
            if existing:
                self.stats['duplicate_skus'] += 1
                return existing
            
            return None
            
        except Exception as e:
            logger.error(f"Ошибка поиска товара: {e}")
            return None
    
    async def _create_new_item(self, db: Session, perfect_item: PerfectItem) -> Dict[str, Any]:
        """Создание нового товара - точно по схеме Item"""
        try:
            # Создаем объект Item точно по схеме
            new_item = Item(
                name=perfect_item.name,
                brand=perfect_item.brand,
                color=perfect_item.color,
                size=perfect_item.size,
                clothing_type=perfect_item.clothing_type,
                description=perfect_item.description,
                price=perfect_item.price,
                category=perfect_item.category,
                article=perfect_item.article,
                style=perfect_item.style,
                # Убрано поле collection - коллекции больше не используются
                image_url=perfect_item.image_url
            )
            
            db.add(new_item)
            db.flush()  # Получаем ID
            
            # Обрабатываем дополнительные изображения
            if perfect_item.image_urls:
                await self._process_item_images(db, new_item, perfect_item.image_urls)
            
            # Создаем варианты товара
            if perfect_item.variants:
                await self._process_item_variants(db, new_item, perfect_item.variants)
            
            self.stats['database_operations'] += 1
            
            return {
                'created': True,
                'item_id': new_item.id,
                'warnings': []
            }
            
        except IntegrityError as e:
            logger.error(f"Ошибка целостности при создании товара: {e}")
            return {
                'created': False,
                'errors': [f"Database integrity error: {str(e)}"]
            }
        except Exception as e:
            logger.error(f"Ошибка создания товара: {e}")
            return {
                'created': False,
                'errors': [f"Creation error: {str(e)}"]
            }
    
    async def _update_existing_item(self, db: Session, existing_item: Item, perfect_item: PerfectItem) -> Dict[str, Any]:
        """Умное обновление существующего товара"""
        try:
            updated = False
            warnings = []
            
            # Обновляем поля только если новые данные лучше
            
            # Цена - всегда обновляем
            if perfect_item.price and existing_item.price != perfect_item.price:
                existing_item.price = perfect_item.price
                updated = True
            
            # Описание - обновляем если новое длиннее или AI-улучшенное
            if perfect_item.description and (
                not existing_item.description or 
                len(perfect_item.description) > len(existing_item.description or "") or
                perfect_item.ai_enhanced
            ):
                existing_item.description = perfect_item.description
                updated = True
            
            # Дополняем пустые поля
            fields_to_update = [
                ('brand', 'brand'),
                ('color', 'color'),
                ('size', 'size'),
                ('clothing_type', 'clothing_type'),
                ('category', 'category'),
                ('style', 'style')
                # Убрано поле collection - коллекции больше не используются
            ]
            
            for perfect_field, db_field in fields_to_update:
                perfect_value = getattr(perfect_item, perfect_field)
                db_value = getattr(existing_item, db_field)
                
                if perfect_value and not db_value:
                    setattr(existing_item, db_field, perfect_value)
                    updated = True
            
            # Обновляем главное изображение если его не было
            if perfect_item.image_url and not existing_item.image_url:
                existing_item.image_url = perfect_item.image_url
                updated = True
            
            # Обновляем дополнительные изображения
            if perfect_item.image_urls:
                current_images_count = len(existing_item.images) if existing_item.images else 0
                new_images_count = len(perfect_item.image_urls)
                
                if new_images_count > current_images_count:
                    await self._process_item_images(db, existing_item, perfect_item.image_urls)
                    updated = True
            
            # Обновляем варианты товара
            if perfect_item.variants and len(perfect_item.variants) > len(existing_item.variants or []):
                await self._process_item_variants(db, existing_item, perfect_item.variants)
                updated = True
            
            if updated:
                self.stats['database_operations'] += 1
            
            return {
                'updated': updated,
                'item_id': existing_item.id,
                'warnings': warnings
            }
            
        except Exception as e:
            logger.error(f"Ошибка обновления товара: {e}")
            return {
                'updated': False,
                'errors': [f"Update error: {str(e)}"]
            }
    
    async def _process_item_images(self, db: Session, item: Item, image_urls: List[str]) -> None:
        """Обработка изображений товара"""
        if not image_urls:
            return
        
        # Получаем уже существующие изображения (URL в базе)
        existing_urls = {img.image_url for img in item.images} if item.images else set()

        # Добавляем только новые изображения
        new_urls = [url for url in image_urls if url not in existing_urls]

        # Ограничиваем количество изображений
        max_images = 8
        urls_to_add = new_urls[:max_images]

        for i, src_url in enumerate(urls_to_add):
            try:
                # Мы больше не скачиваем изображения; сохраняем прямой URL Lamoda
                remote_url = src_url

                image_record = ItemImage(
                    item_id=item.id,
                    image_url=remote_url,
                    position=len(existing_urls) + i
                )

                db.add(image_record)
                self.stats['images_processed'] += 1

                # Если у товара нет главного изображения, назначаем первое найденное
                if not item.image_url:
                    item.image_url = remote_url

            except Exception as e:
                logger.error(f"Ошибка добавления URL изображения {src_url}: {e}")
                continue

    async def _process_item_variants(self, db: Session, item: Item, variants_data: List[Dict[str, Any]]) -> None:
        """Обработка вариантов товара"""
        if not variants_data:
            return
        
        # Получаем существующие варианты
        existing_skus = {var.sku for var in item.variants} if item.variants else set()
        
        for variant_data in variants_data:
            try:
                sku = variant_data.get('sku')
                if not sku or sku in existing_skus:
                    continue
                
                # Создаем вариант товара
                variant = ItemVariant(
                    item_id=item.id,
                    size=variant_data.get('size'),
                    color=variant_data.get('color'),
                    sku=sku,
                    stock=variant_data.get('stock', 0),
                    price=variant_data.get('price', item.price)
                )
                
                db.add(variant)
                self.stats['variants_created'] += 1
                
            except Exception as e:
                logger.error(f"Ошибка создания варианта: {e}")
                continue
    
    def _create_import_summary(self, results: List[ImportResult]) -> Dict[str, Any]:
        """Создание сводки по импорту"""
        successful = [r for r in results if r.success]
        failed = [r for r in results if not r.success]
        
        actions_count = {}
        for result in results:
            actions_count[result.action] = actions_count.get(result.action, 0) + 1
        
        return {
            'success': True,
            'total_processed': len(results),
            'successful': len(successful),
            'failed': len(failed),
            'actions': actions_count,
            'stats': self.stats,
            'ai_enhanced_items': self.stats['ai_enhanced_items'],
            'quality_score': sum([r.item_data.get('ai_enhanced', 0) for r in successful if r.item_data]) / max(len(successful), 1),
            'processed_at': datetime.now().isoformat()
        }
    
    def get_stats(self) -> Dict[str, Any]:
        """Получение статистики агента"""
        return {
            **self.stats,
            'description_agent_stats': self.description_agent.get_stats(),
            'uptime': datetime.now().isoformat()
        }

    # ------------------------------------------------------------------
    # Публичный API совместимости с заданием Celery
    # ------------------------------------------------------------------
    async def import_parsed_products_to_catalog(self, products: List[ParsedProduct]) -> "ImportSummary":
        """Адаптер для совместимости со старой сигнатурой Celery-задачи.

        Args:
            products: список распарсенных товаров

        Returns:
            ImportSummary с агрегированными метриками
        """
        start_time = datetime.now()

        summary = await self.import_parsed_products(products)

        actions = summary.get('actions', {}) if isinstance(summary, dict) else {}

        imported = actions.get('created', 0)
        updated = actions.get('updated', 0)
        skipped = actions.get('skipped', 0)
        error_cnt = summary.get('failed', 0) if isinstance(summary, dict) else 0

        import_time = (datetime.now() - start_time).total_seconds()

        return ImportSummary(
            imported_count=imported,
            updated_count=updated,
            skipped_count=skipped,
            error_count=error_cnt,
            total_processed=summary.get('total_processed', 0) if isinstance(summary, dict) else 0,
            import_time=import_time,
            errors=summary.get('errors', []) if isinstance(summary, dict) else [],
            warnings=[],
            metadata=summary
        )

    async def close(self):
        """Закрытие используемых ресурсов (если необходимо)"""
        close_method = getattr(self.description_agent, 'close', None)
        if callable(close_method):
            result = close_method()
            if asyncio.iscoroutine(result):
                await result 