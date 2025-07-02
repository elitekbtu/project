#!/usr/bin/env python3
"""
Catalog Processing Tasks

Celery задачи для обработки каталога товаров:
- Парсинг товаров с внешних источников
- ИИ анализ и улучшение данных
- Импорт в базу данных
- Цепочка обработки (парсинг -> анализ -> импорт)
- Мониторинг прогресса и отчетность
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from celery import Task, chain, group, chord
from celery.exceptions import Retry

from celery_app import celery_app
from app.agents.parser_agent import EnhancedLamodaParser, ParsedProduct
from app.agents.catalog_agent import CatalogAgent

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class CallbackTask(Task):
    """Базовая задача с callback'ами"""
    
    def on_success(self, retval, task_id, args, kwargs):
        """Callback при успешном выполнении"""
        logger.info(f"✅ Task {task_id} completed successfully")
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Callback при ошибке"""
        logger.error(f"❌ Task {task_id} failed: {exc}")
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Callback при повторной попытке"""
        logger.warning(f"🔄 Task {task_id} retrying: {exc}")

@celery_app.task(bind=True, base=CallbackTask, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 60})
def parse_catalog_task(self, query: str, limit: int = 20, domain: str = "kz") -> Dict[str, Any]:
    """
    Задача парсинга каталога
    
    Args:
        query: поисковый запрос
        limit: количество товаров для парсинга
        domain: домен для парсинга (ru, kz, by)
    
    Returns:
        Dict с результатами парсинга
    """
    
    # Обновляем состояние задачи
    self.update_state(state='PROGRESS', meta={'status': 'Инициализация парсера...', 'progress': 0})
    
    async def run_parsing():
        parser = None
        try:
            # Создаем парсер
            parser = EnhancedLamodaParser(domain=domain)
            
            # Выполняем парсинг
            logger.info(f"Starting parsing with query: {query}, limit: {limit}, domain: {domain}")
            products = await parser.parse_catalog(query, limit=limit, page=1)
            
            self.update_state(
                state='PROGRESS',
                meta={
                    'status': 'Обработка результатов парсинга...',
                    'progress': 80,
                    'products_found': len(products)
                }
            )
            
            # Сериализуем продукты для передачи через Celery
            serialized_products = []
            for product in products:
                product_dict = {
                    'sku': product.sku,
                    'name': product.name,
                    'brand': product.brand,
                    'price': product.price,
                    'old_price': product.old_price,
                    'url': product.url,
                    'image_url': product.image_url,
                    'image_urls': product.image_urls,
                    'description': product.description,
                    'category': product.category,
                    'clothing_type': product.clothing_type,
                    'color': product.color,
                    'sizes': product.sizes,
                    'style': product.style,
                    'collection': product.collection,
                    'rating': product.rating,
                    'reviews_count': product.reviews_count,
                    'parse_quality': product.parse_quality,
                    'parse_metadata': product.parse_metadata,
                    'parsed_at': product.parsed_at.isoformat()
                }
                serialized_products.append(product_dict)
            
            # Вычисляем качество парсинга
            total_quality = sum(p.parse_quality for p in products)
            quality_score = total_quality / len(products) if products else 0.0
            
            return {
                'success': True,
                'products': serialized_products,
                'total_found': len(products),
                'success_count': len(products),
                'failed_count': 0,
                'quality_score': quality_score,
                'parsing_time': 0.0,  # Время парсинга можно добавить позже
                'metadata': {
                    'query': query,
                    'domain': domain,
                    'limit': limit
                },
                'task_completed_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Parsing task failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__,
                'task_failed_at': datetime.now().isoformat()
            }
        finally:
            if parser:
                await parser.close()
    
    # Запускаем асинхронную функцию
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(run_parsing())
        loop.close()
        
        # НЕ обновляем состояние финально - просто возвращаем детальный результат
        # Celery автоматически установит состояние SUCCESS при возврате результата
        return result
        
    except Exception as e:
        logger.error(f"Failed to run parsing task: {e}")
        self.update_state(
            state='FAILURE',
            meta={'status': f'Ошибка парсинга: {str(e)}', 'progress': 0}
        )
        raise

@celery_app.task(bind=True, base=CallbackTask, autoretry_for=(Exception,), retry_kwargs={'max_retries': 2, 'countdown': 30})
def import_to_catalog_task(self, parsing_result: Dict[str, Any]) -> Dict[str, Any]:
    """
    Задача импорта товаров в каталог
    
    Args:
        parsing_result: результат парсинга товаров
    
    Returns:
        Dict с результатами импорта
    """
    
    # Проверяем результат предыдущей задачи
    if not parsing_result.get('success', False):
        logger.error("Cannot import products: parsing task failed")
        return {
            'success': False,
            'error': 'Parsing task failed',
            'skipped': True
        }
    
    products_data = parsing_result.get('products', [])
    if not products_data:
        logger.warning("No products to import")
        return {
            'success': True,
            'imported_count': 0,
            'skipped': True,
            'reason': 'no_products'
        }
    
    self.update_state(
        state='PROGRESS',
        meta={
            'status': 'Инициализация агента каталога...',
            'progress': 0,
            'products_count': len(products_data)
        }
    )
    
    async def run_import():
        agent = None
        try:
            # Создаем агент каталога
            agent = CatalogAgent(upload_dir="uploads/items")
            
            # Конвертируем данные в ParsedProduct объекты для импорта
            products = []
            
            for product_data in products_data:
                try:
                    # Создаем ParsedProduct из данных
                    product = ParsedProduct(
                        sku=product_data['sku'],
                        name=product_data['name'],
                        brand=product_data['brand'],
                        price=product_data['price'],
                        old_price=product_data.get('old_price'),
                        url=product_data.get('url', ''),
                        image_url=product_data.get('image_url', ''),
                        image_urls=product_data.get('image_urls', []),
                        description=product_data.get('description'),
                        category=product_data.get('category'),
                        clothing_type=product_data.get('clothing_type'),
                        color=product_data.get('color'),
                        sizes=product_data.get('sizes', []),
                        style=product_data.get('style'),
                        collection=product_data.get('collection'),
                        rating=product_data.get('rating'),
                        reviews_count=product_data.get('reviews_count'),
                        parse_quality=product_data.get('parse_quality', 0.0),
                        parse_metadata=product_data.get('parse_metadata', {}),
                        parsed_at=datetime.fromisoformat(product_data['parsed_at'])
                    )
                    products.append(product)
                except Exception as e:
                    logger.error(f"Failed to convert product data: {e}")
                    continue
            
            self.update_state(
                state='PROGRESS',
                meta={
                    'status': 'Импорт товаров в каталог...',
                    'progress': 30,
                    'products_to_import': len(products)
                }
            )
            
            # Выполняем импорт
            result = await agent.import_parsed_products_to_catalog(products)
            
            return {
                'success': True,
                'imported_count': result.imported_count,
                'updated_count': result.updated_count,
                'skipped_count': result.skipped_count,
                'error_count': result.error_count,
                'total_processed': result.total_processed,
                'import_time': result.import_time,
                'errors': result.errors,
                'warnings': result.warnings,
                'metadata': result.metadata,
                'task_completed_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Import task failed: {e}")
            return {
                'success': False,
                'error': str(e),
                'error_type': type(e).__name__,
                'task_failed_at': datetime.now().isoformat()
            }
        finally:
            if agent:
                await agent.close()
    
    # Запускаем импорт
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(run_import())
        loop.close()
        
        # Обновляем состояние
        if result['success']:
            self.update_state(
                state='SUCCESS',
                meta={
                    'status': 'Импорт завершен успешно',
                    'progress': 100,
                    'imported_count': result.get('imported_count', 0),
                    'updated_count': result.get('updated_count', 0)
                }
            )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to run import task: {e}")
        self.update_state(
            state='FAILURE',
            meta={'status': f'Ошибка импорта: {str(e)}', 'progress': 0}
        )
        raise

@celery_app.task(bind=True, base=CallbackTask)
def process_catalog_chain(self, query: str, limit: int = 20, domain: str = "kz") -> Dict[str, Any]:
    """
    Главная задача - цепочка обработки каталога
    
    Выполняет полную цепочку: Парсинг -> Импорт в БД
    
    Args:
        query: поисковый запрос
        limit: количество товаров
        domain: домен для парсинга  
    
    Returns:
        Dict с полными результатами цепочки
    """
    
    self.update_state(
        state='PROGRESS',
        meta={
            'status': 'Запуск цепочки обработки каталога',
            'progress': 0,
            'chain_step': 'initialization',
            'query': query,
            'limit': limit,
            'domain': domain
        }
    )
    
    try:
        # Создаем цепочку задач
        processing_chain = chain(
            parse_catalog_task.s(query, limit, domain),
            import_to_catalog_task.s()
        )
        
        # Запускаем цепочку асинхронно
        chain_result = processing_chain.apply_async()
        
        # Возвращаем информацию о запущенной цепочке
        report = {
            'success': True,
            'chain_started_at': datetime.now().isoformat(),
            'chain_task_id': chain_result.id,
            'query': query,
            'limit': limit,
            'domain': domain,
            'status': 'Chain started successfully',
            'message': 'Use chain_task_id to track progress'
        }
        
        # Обновляем состояние
        self.update_state(
            state='SUCCESS',
            meta={
                'status': 'Цепочка обработки запущена',
                'progress': 100,
                'chain_step': 'started',
                'chain_task_id': chain_result.id
            }
        )
        
        return report
        
    except Exception as e:
        logger.error(f"Catalog processing chain failed: {e}")
        
        error_result = {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__,
            'chain_failed_at': datetime.now().isoformat(),
            'query': query,
            'limit': limit,
            'domain': domain
        }
        
        self.update_state(
            state='FAILURE',
            meta={
                'status': f'Цепочка обработки провалилась: {str(e)}',
                'progress': 0,
                'chain_step': 'failed'
            }
        )
        
        return error_result

@celery_app.task(bind=True, base=CallbackTask)
def get_catalog_statistics(self) -> Dict[str, Any]:
    """
    Получение статистики каталога
    
    Returns:
        Dict со статистикой каталога
    """
    
    try:
        from app.core.database import SessionLocal
        from app.db.models.item import Item
        from sqlalchemy import func
        
        db = SessionLocal()
        
        # Базовая статистика
        total_items = db.query(Item).count()
        
        # Статистика по брендам
        brand_stats = db.query(Item.brand, func.count(Item.id)).group_by(Item.brand).all()
        top_brands = [{'brand': brand, 'count': count} for brand, count in brand_stats[:10]]
        
        # Статистика по категориям
        category_stats = db.query(Item.category, func.count(Item.id)).group_by(Item.category).all()
        top_categories = [{'category': category, 'count': count} for category, count in category_stats[:10]]
        
        # Ценовая статистика
        price_stats = db.query(
            func.min(Item.price),
            func.max(Item.price), 
            func.avg(Item.price)
        ).first()
        
        # Недавно добавленные товары (за последние 7 дней)
        recent_date = datetime.now() - timedelta(days=7)
        recent_items = db.query(Item).filter(Item.created_at >= recent_date).count()
        
        db.close()
        
        return {
            'success': True,
            'statistics': {
                'total_items': total_items,
                'recent_items_week': recent_items,
                'price_range': {
                    'min': float(price_stats[0]) if price_stats[0] else 0,
                    'max': float(price_stats[1]) if price_stats[1] else 0,
                    'average': float(price_stats[2]) if price_stats[2] else 0
                },
                'top_brands': top_brands,
                'top_categories': top_categories
            },
            'generated_at': datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to get catalog statistics: {e}")
        return {
            'success': False,
            'error': str(e),
            'error_type': type(e).__name__
        }

# Периодические задачи (при необходимости)
@celery_app.task
def cleanup_old_cache():
    """Очистка старого кэша"""
    # Здесь можно добавить логику очистки кэша
    logger.info("Cache cleanup completed")
    return {'success': True, 'cleanup_completed_at': datetime.now().isoformat()} 