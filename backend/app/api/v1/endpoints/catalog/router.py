#!/usr/bin/env python3
"""
Catalog Management API

API endpoints для управления каталогом товаров:
- Запуск парсинга и импорта товаров
- Мониторинг прогресса выполнения задач
- Получение статистики каталога
- Управление задачами парсинга
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, status, HTTPException, Query, BackgroundTasks, Form, Request
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field
from celery.result import AsyncResult
from datetime import datetime
import httpx
import asyncio
from urllib.parse import unquote
import logging
from sqlalchemy.orm import Session
from io import BytesIO
from PIL import Image

from app.core.security import require_admin, get_current_user
from app.core.rate_limiting import limiter, RATE_LIMITS
from app.db.models.user import User
from app.tasks.catalog_tasks import (
    parse_catalog_task,
    import_to_catalog_task,
    process_catalog_chain,
    get_catalog_statistics
)
from celery_app import celery_app
from app.agents.parser_agent import EnhancedLamodaParser
from app.core.database import get_db
from app.db.models.item import Item
from app.db.models.item_image import ItemImage

# Настройка логгера
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/catalog", tags=["Catalog Management"])

# Pydantic модели
class ParseRequest(BaseModel):
    """Модель запроса парсинга"""
    query: str = Field(..., description="Поисковый запрос", min_length=1, max_length=100)
    limit: int = Field(20, description="Количество товаров для парсинга", ge=1, le=100)
    domain: str = Field("kz", description="Домен для парсинга", pattern="^(ru|kz|by)$")

class TaskStatus(BaseModel):
    """Модель статуса задачи"""
    task_id: str
    status: str
    current: Optional[int] = None
    total: Optional[int] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    meta: Optional[Dict[str, Any]] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

class CatalogStats(BaseModel):
    """Модель статистики каталога"""
    total_items: int
    recent_items_week: int
    price_range: Dict[str, float]
    top_brands: List[Dict[str, Any]]
    top_categories: List[Dict[str, Any]]
    generated_at: datetime

# API Endpoints

@router.post("/parse", response_model=Dict[str, str], status_code=status.HTTP_202_ACCEPTED, dependencies=[Depends(require_admin)])
@limiter.limit(RATE_LIMITS["api"])
async def start_catalog_parsing(
    request: Request,
    payload: ParseRequest,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user)
):
    """
    Запуск парсинга каталога товаров
    
    Запускает асинхронную задачу парсинга товаров с указанными параметрами.
    Возвращает ID задачи для отслеживания прогресса.
    """
    try:
        # Запускаем цепочку задач в Celery (асинхронно): парсинг -> импорт
        chain_result = process_catalog_chain.delay(
            query=payload.query,
            limit=payload.limit,
            domain=payload.domain
        )
        
        return {
            "message": "Парсинг каталога запущен",
            "task_id": chain_result.id,
            "query": payload.query,
            "limit": str(payload.limit),
            "domain": payload.domain,
            "started_by": user.email,
            "status_url": f"/api/catalog/tasks/{chain_result.id}/status"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка запуска парсинга: {str(e)}"
        )

@router.get("/tasks/{task_id}/status", response_model=TaskStatus)
@limiter.limit(RATE_LIMITS["api"])
async def get_task_status(request: Request, task_id: str):
    """
    Получение статуса задачи
    
    Возвращает текущий статус выполнения задачи Celery с детальной информацией
    о прогрессе выполнения.
    """
    try:
        # Получаем результат задачи из Celery
        task_result = celery_app.AsyncResult(task_id)
        
        # Формируем ответ в зависимости от статуса
        response = TaskStatus(
            task_id=task_id,
            status=task_result.status,
            current=None,
            total=None,
            result=None,
            error=None,
            meta=None
        )
        
        if task_result.state == 'PENDING':
            response.meta = {'status': 'Задача ожидает выполнения...'}
        
        elif task_result.state == 'PROGRESS':
            response.current = task_result.info.get('progress', 0)
            response.total = 100
            response.meta = task_result.info
        
        elif task_result.state == 'SUCCESS':
            response.current = 100
            response.total = 100
            response.result = task_result.info
            response.meta = task_result.info
        
        elif task_result.state == 'FAILURE':
            response.error = str(task_result.info)
            response.meta = {'status': f'Ошибка: {str(task_result.info)}'}
        
        else:
            response.meta = task_result.info if task_result.info else {}
        
        return response
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения статуса задачи: {str(e)}"
        )

@router.get("/tasks/{task_id}/result")
@limiter.limit(RATE_LIMITS["api"])
async def get_task_result(request: Request, task_id: str):
    """
    ВРЕМЕННЫЙ эндпоинт для получения полных результатов задачи парсинга
    
    Возвращает детальные результаты парсинга включая все товары и их изображения.
    """
    try:
        # Получаем результат задачи из Celery
        task_result = celery_app.AsyncResult(task_id)
        
        if task_result.state == 'PENDING':
            return {"status": "pending", "message": "Задача ожидает выполнения"}
        
        elif task_result.state == 'PROGRESS':
            return {"status": "progress", "info": task_result.info}
        
        elif task_result.state == 'SUCCESS':
            # Получаем полный результат задачи - используем result вместо info
            full_result = task_result.result
            return {
                "status": "success",
                "task_id": task_id,
                "result": full_result
            }
        
        elif task_result.state == 'FAILURE':
            return {
                "status": "failure", 
                "error": str(task_result.info),
                "task_id": task_id
            }
        
        else:
            return {
                "status": task_result.state.lower(),
                "info": task_result.info,
                "task_id": task_id
            }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения результата задачи: {str(e)}"
        )

@router.delete("/tasks/{task_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
@limiter.limit(RATE_LIMITS["api"])
async def cancel_task(request: Request, task_id: str):
    """
    Отмена выполняющейся задачи
    
    Останавливает выполнение задачи парсинга каталога.
    """
    try:
        celery_app.control.revoke(task_id, terminate=True)
        return
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка отмены задачи: {str(e)}"
        )

@router.get("/tasks", response_model=List[Dict[str, Any]], dependencies=[Depends(require_admin)])
@limiter.limit(RATE_LIMITS["api"])
async def list_active_tasks(request: Request):
    """
    Получение списка активных задач
    
    Возвращает список всех выполняющихся задач парсинга каталога.
    """
    try:
        # Получаем активные задачи
        inspect = celery_app.control.inspect()
        active_tasks = inspect.active()
        
        if not active_tasks:
            return []
        
        # Формируем список задач
        tasks_list = []
        for worker, tasks in active_tasks.items():
            for task in tasks:
                if 'catalog' in task['name']:  # Фильтруем только задачи каталога
                    tasks_list.append({
                        'task_id': task['id'],
                        'name': task['name'],
                        'worker': worker,
                        'args': task.get('args', []),
                        'kwargs': task.get('kwargs', {}),
                        'time_start': task.get('time_start')
                    })
        
        return tasks_list
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения списка задач: {str(e)}"
        )

@router.get("/stats", response_model=CatalogStats)
@limiter.limit(RATE_LIMITS["api"])
async def get_catalog_stats(request: Request):
    """
    Получение статистики каталога
    
    Возвращает статистику по товарам в каталоге: общее количество,
    топ брендов, категории, ценовые диапазоны и т.д.
    """
    try:
        # Получаем статистику напрямую из базы данных
        from app.core.database import SessionLocal
        from app.db.models.item import Item
        from sqlalchemy import func
        
        db = SessionLocal()
        
        try:
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
            from datetime import timedelta
            recent_date = datetime.now() - timedelta(days=7)
            recent_items = db.query(Item).filter(Item.created_at >= recent_date).count()
            
            return CatalogStats(
                total_items=total_items,
                recent_items_week=recent_items,
                price_range={
                    'min': float(price_stats[0]) if price_stats[0] else 0,
                    'max': float(price_stats[1]) if price_stats[1] else 0,
                    'average': float(price_stats[2]) if price_stats[2] else 0
                },
                top_brands=top_brands,
                top_categories=top_categories,
                generated_at=datetime.now()
            )
            
        finally:
            db.close()
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения статистики каталога: {str(e)}"
        )

@router.post("/parse-simple", response_model=Dict[str, str], dependencies=[Depends(require_admin)])
@limiter.limit(RATE_LIMITS["api"])
async def simple_parse_only(
    request: Request,
    query: str = Query(..., description="Поисковый запрос"),
    limit: int = Query(10, description="Количество товаров", ge=1, le=50),
    domain: str = Query("kz", description="Домен", pattern="^(ru|kz|by)$")
):
    """
    Простой парсинг без импорта в БД
    
    Выполняет только парсинг товаров без сохранения в базу данных.
    Полезно для тестирования и предварительного просмотра результатов.
    """
    try:
        # Запускаем только задачу парсинга
        task = parse_catalog_task.delay(query=query, limit=limit, domain=domain)
        
        return {
            "message": "Парсинг запущен (без импорта)",
            "task_id": task.id,
            "query": query,
            "limit": str(limit),
            "domain": domain,
            "status_url": f"/api/catalog/tasks/{task.id}/status"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка запуска парсинга: {str(e)}"
        )

@router.get("/health")
@limiter.limit(RATE_LIMITS["api"])
async def catalog_health_check(request: Request):
    """
    Проверка здоровья системы каталога
    
    Проверяет доступность Celery, RabbitMQ и других компонентов системы.
    """
    try:
        # Проверяем Celery
        inspect = celery_app.control.inspect()
        stats = inspect.stats()
        
        # Проверяем доступность воркеров
        active_workers = len(stats) if stats else 0
        
        # Проверяем очереди
        active_queues = inspect.active_queues()
        queue_count = len(active_queues) if active_queues else 0
        
        return {
            "status": "healthy",
            "celery_workers": active_workers,
            "active_queues": queue_count,
            "timestamp": datetime.now().isoformat(),
            "services": {
                "celery": "up" if active_workers > 0 else "down",
                "workers": "up" if active_workers > 0 else "down",
                "queues": "up" if queue_count > 0 else "down"
            }
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "error": str(e),
                "timestamp": datetime.now().isoformat(),
                "services": {
                    "celery": "down",
                    "workers": "down", 
                    "queues": "down"
                }
            }
        )

@router.get("/queue-info", dependencies=[Depends(require_admin)])
@limiter.limit(RATE_LIMITS["api"])
async def get_queue_info(request: Request):
    """
    Получение информации о очередях Celery
    
    Возвращает детальную информацию о состоянии очередей задач.
    """
    try:
        inspect = celery_app.control.inspect()
        
        # Получаем различные метрики
        active = inspect.active()
        scheduled = inspect.scheduled()
        reserved = inspect.reserved()
        stats = inspect.stats()
        
        return {
            "active_tasks": active,
            "scheduled_tasks": scheduled,
            "reserved_tasks": reserved,
            "worker_stats": stats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения информации о очередях: {str(e)}"
        )

@router.post("/test-chain", response_model=Dict[str, str], dependencies=[Depends(require_admin)])
@limiter.limit(RATE_LIMITS["api"])
async def test_catalog_chain(request: Request):
    """
    Тестовый запуск цепочки обработки каталога
    
    Запускает тестовый парсинг с ограниченным набором данных
    для проверки работоспособности системы.
    """
    try:
        # Запускаем тестовую цепочку в Celery с минимальными параметрами
        chain_result = process_catalog_chain.delay(
            query="nike test",
            limit=3,
            domain="kz"
        )
        
        return {
            "message": "Тестовая цепочка запущена",
            "task_id": chain_result.id,
            "test_parameters": "query='nike test', limit=3, domain='kz'",
            "status_url": f"/api/catalog/tasks/{chain_result.id}/status"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка запуска тестовой цепочки: {str(e)}"
        )

@router.post("/test-parser", response_model=Dict[str, str])
@limiter.limit(RATE_LIMITS["api"])
async def test_parser_no_auth(
    request: Request,
    query: str = Query("jeans", description="Поисковый запрос"),
    limit: int = Query(5, description="Количество товаров", ge=1, le=10),
    domain: str = Query("kz", description="Домен", pattern="^(ru|kz|by)$")
):
    """
    ВРЕМЕННЫЙ тестовый эндпоинт парсера без аутентификации
    
    Только для тестирования улучшенного парсера изображений.
    Будет удален после завершения тестирования.
    """
    try:
        # Запускаем только задачу парсинга
        task = parse_catalog_task.delay(query=query, limit=limit, domain=domain)
        
        return {
            "message": "Тестовый парсинг запущен",
            "task_id": task.id,
            "query": query,
            "limit": str(limit),
            "domain": domain,
            "status_url": f"/api/catalog/tasks/{task.id}/status",
            "note": "ВРЕМЕННЫЙ эндпоинт для тестирования"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка запуска тестового парсинга: {str(e)}"
        )

@router.get("/image-proxy")
@limiter.limit(RATE_LIMITS["api"])
async def proxy_lamoda_image(request: Request, url: str = Query(..., description="URL изображения Lamoda")):
    """
    Прокси для изображений Lamoda
    
    Обходит CORS и блокировки для отображения изображений в админке.
    Преобразует URL в формат img600x866 для лучшей доступности.
    """
    try:
        # Проверяем что URL от Lamoda
        if not url.startswith('https://a.lmcdn.ru/'):
            return await generate_placeholder_image("Invalid URL")
        
        # Декодируем URL если он закодирован
        decoded_url = unquote(url)
        
        # Преобразуем URL в формат img600x866 если это обычный CDN URL
        if '/img600x866/' not in decoded_url:
            # Извлекаем путь к файлу из URL
            # Например: https://a.lmcdn.ru/R/T/RTLAEF651001_27427936_1_v4_2x.jpg
            # Преобразуем в: https://a.lmcdn.ru/img600x866/R/T/RTLAEF651001_27427936_1_v4_2x.jpg
            url_parts = decoded_url.replace('https://a.lmcdn.ru/', '').split('/')
            if len(url_parts) >= 3:
                # Формируем новый URL с img600x866
                new_path = '/'.join(url_parts)
                decoded_url = f"https://a.lmcdn.ru/img600x866/{new_path}"
                logger.info(f"Transformed URL: {url} -> {decoded_url}")
        
        # Настройки для запроса к Lamoda - имитируем реальный браузер
        headers = {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'image',
            'Sec-Fetch-Mode': 'no-cors',
            'Sec-Fetch-Site': 'cross-site',
            'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Linux"'
        }
        
        # Выполняем запрос к изображению
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            response = await client.get(decoded_url, headers=headers)
            
            if response.status_code == 200:
                # Определяем тип контента
                content_type = response.headers.get('content-type', 'image/jpeg')
                
                # Возвращаем изображение
                return StreamingResponse(
                    iter([response.content]),
                    media_type=content_type,
                    headers={
                        'Cache-Control': 'public, max-age=3600',  # Кэшируем на час
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET',
                        'Access-Control-Allow-Headers': '*'
                    }
                )
            else:
                # Если изображение недоступно, возвращаем плейсхолдер
                logger.warning(f"Image unavailable {decoded_url}: {response.status_code}")
                return await generate_placeholder_image(f"Error {response.status_code}")
                
    except httpx.TimeoutException:
        logger.warning(f"Timeout loading image {url}")
        return await generate_placeholder_image("Timeout")
    except Exception as e:
        logger.warning(f"Error proxying image {url}: {e}")
        return await generate_placeholder_image("Error")

async def generate_placeholder_image(text: str = "No Image"):
    """
    Генерирует простое SVG изображение-плейсхолдер
    """
    svg_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f3f4f6"/>
    <rect x="50" y="50" width="200" height="200" fill="#e5e7eb" stroke="#d1d5db" stroke-width="2"/>
    <text x="150" y="140" font-family="Arial, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">🖼️</text>
    <text x="150" y="170" font-family="Arial, sans-serif" font-size="12" fill="#9ca3af" text-anchor="middle">{text}</text>
</svg>"""
    
    return StreamingResponse(
        iter([svg_content.encode()]),
        media_type="image/svg+xml",
        headers={
            'Cache-Control': 'public, max-age=300',  # Кэшируем плейсхолдер на 5 минут
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET',
            'Access-Control-Allow-Headers': '*'
        }
    )

@router.post("/parse", dependencies=[Depends(require_admin)])
@limiter.limit(RATE_LIMITS["api"])
async def parse_catalog(
    request: Request,
    query: str = Form(...),
    limit: int = Form(20),
    page: int = Form(1),
    db: Session = Depends(get_db)
):
    """Parse catalog with automatic image downloading for AI processing."""
    try:
        parser = EnhancedLamodaParser()
        
        # Parse with image downloading
        products = await parser.parse_catalog(query, limit, page)
        
        # Process and save to database
        saved_count = 0
        for product in products:
            try:
                # Check if product already exists
                existing = db.query(Item).filter(Item.sku == product.sku).first()
                if existing:
                    continue
                
                # Create new item with downloaded images
                new_item = Item(
                    sku=product.sku,
                    name=product.name,
                    brand=product.brand,
                    price=product.price,
                    old_price=product.old_price,
                    url=product.url,
                    image_url=product.image_url,
                    description=product.description,
                    category=product.category,
                    clothing_type=product.clothing_type,
                    color=product.color,
                    style=product.style,
                    rating=product.rating,
                    reviews_count=product.reviews_count
                )
                
                db.add(new_item)
                saved_count += 1
                
                # Save additional images
                if product.image_urls:
                    for i, img_url in enumerate(product.image_urls[:5]):  # Max 5 images
                        item_image = ItemImage(
                            item_id=new_item.id,
                            image_url=img_url,
                            position=i + 1
                        )
                        db.add(item_image)
                
            except Exception as e:
                logger.error(f"Error saving product {product.sku}: {e}")
                continue
        
        db.commit()
        
        return {
            "message": f"Successfully parsed and saved {saved_count} products",
            "total_parsed": len(products),
            "saved_count": saved_count,
            "query": query
        }
        
    except Exception as e:
        logger.error(f"Error parsing catalog: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if 'parser' in locals():
            await parser.close() 

@router.get("/image-resize")
@limiter.limit(RATE_LIMITS["api"])
async def image_resize(
    request: Request,
    url: str = Query(..., description="URL исходного изображения"),
    w: int = Query(..., description="Ширина, px", ge=1, le=2000),
    h: int = Query(..., description="Высота, px", ge=1, le=2000),
    format: str = Query("webp", description="Формат: webp, jpeg, png")
):
    """
    Ресайз и конвертация изображений для оптимизации загрузки на фронте.
    """
    try:
        # Скачиваем изображение
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                logger.warning(f"Image unavailable for resize {url}: {resp.status_code}")
                return await generate_placeholder_image(f"Error {resp.status_code}")
            img_bytes = resp.content

        # Открываем изображение через Pillow
        try:
            img = Image.open(BytesIO(img_bytes))
        except Exception as e:
            logger.warning(f"Pillow open error: {e}")
            return await generate_placeholder_image("Invalid image")

        # Ресайз с сохранением пропорций (вписываем в w x h)
        img = img.convert("RGBA") if format.lower() == "webp" else img.convert("RGB")
        img.thumbnail((w, h), Image.LANCZOS)

        # Сохраняем в нужный формат
        output = BytesIO()
        fmt = format.upper()
        if fmt == "JPG":
            fmt = "JPEG"
        if fmt not in ("WEBP", "JPEG", "PNG"):
            fmt = "WEBP"
        img.save(output, fmt, quality=85, optimize=True)
        output.seek(0)

        # Content-Type
        content_type = {
            "WEBP": "image/webp",
            "JPEG": "image/jpeg",
            "PNG": "image/png"
        }.get(fmt, "image/webp")

        return StreamingResponse(
            output,
            media_type=content_type,
            headers={
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': '*'
            }
        )
    except Exception as e:
        logger.warning(f"Error in image-resize: {e}")
        return await generate_placeholder_image("Resize error") 