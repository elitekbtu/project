#!/usr/bin/env python3
"""
System Analytics API

API endpoints для анализа всей системы:
- Общая статистика пользователей
- Аналитика товаров и образов
- Системные метрики
- Мониторинг производительности
"""

from typing import Dict, Any, List
from fastapi import APIRouter, Depends, status, HTTPException, Request
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from datetime import datetime, timedelta

from app.core.database import get_db
from app.core.security import require_admin
from app.core.rate_limiting import limiter, RATE_LIMITS
from app.db.models.user import User
from app.db.models.item import Item
from app.db.models.outfit import Outfit
from app.db.models.associations import UserView, user_favorite_items, user_favorite_outfits
from app.db.models.comment import Comment

router = APIRouter(prefix="/system", tags=["System Analytics"])


@router.get("/analytics")
@limiter.limit(RATE_LIMITS["api"])
async def get_system_analytics(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Получить полную аналитику системы"""
    
    try:
        # Общая статистика пользователей
        total_users = db.query(User).count()
        active_users = db.query(User).filter(User.is_active == True).count()
        moderators = db.query(User).filter(User.is_moderator == True).count()
        admins = db.query(User).filter(User.is_admin == True).count()
        
        # Статистика за последние 30 дней
        thirty_days_ago = datetime.now() - timedelta(days=30)
        new_users_month = db.query(User).filter(User.created_at >= thirty_days_ago).count()
        
        # Статистика товаров
        total_items = db.query(Item).count()
        items_with_price = db.query(Item).filter(Item.price.isnot(None)).count()
        
        # Ценовая статистика
        price_stats = db.query(
            func.min(Item.price),
            func.max(Item.price),
            func.avg(Item.price)
        ).filter(Item.price.isnot(None)).first()
        
        # Статистика образов
        total_outfits = db.query(Outfit).count()
        public_outfits = db.query(Outfit).filter(Outfit.is_public == True).count()
        
        # Статистика активности
        total_views = db.query(UserView).count()
        total_favorites = db.query(user_favorite_items).count()
        total_outfit_favorites = db.query(user_favorite_outfits).count()
        total_comments = db.query(Comment).count()
        
        # Топ категорий товаров
        top_categories = db.query(
            Item.category,
            func.count(Item.id).label('count')
        ).filter(Item.category.isnot(None)).group_by(Item.category).order_by(desc('count')).limit(10).all()
        
        # Топ брендов
        top_brands = db.query(
            Item.brand,
            func.count(Item.id).label('count')
        ).filter(Item.brand.isnot(None)).group_by(Item.brand).order_by(desc('count')).limit(10).all()
        
        # Активность по дням (последние 7 дней)
        daily_activity = []
        for i in range(7):
            date = datetime.now() - timedelta(days=i)
            start_date = date.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = start_date + timedelta(days=1)

            daily_views = db.query(UserView).filter(
                and_(
                    UserView.viewed_at >= start_date,
                    UserView.viewed_at < end_date
                )
            ).count()

            # Если в user_favorite_items нет записей за этот день, будет 0
            daily_favorites = db.query(user_favorite_items).filter(
                and_(
                    user_favorite_items.c.created_at >= start_date,
                    user_favorite_items.c.created_at < end_date
                )
            ).count() if hasattr(user_favorite_items.c, 'created_at') else 0

            daily_activity.append({
                'date': start_date.strftime('%Y-%m-%d'),
                'views': daily_views,
                'favorites': daily_favorites
            })
        
        # Популярные товары
        popular_items = db.query(
            Item.id,
            Item.name,
            Item.brand,
            func.count(user_favorite_items.c.user_id).label('likes')
        ).outerjoin(user_favorite_items, Item.id == user_favorite_items.c.item_id).group_by(
            Item.id, Item.name, Item.brand
        ).order_by(desc('likes')).limit(10).all()
        
        # Популярные образы
        popular_outfits = db.query(
            Outfit.id,
            Outfit.name,
            func.count(user_favorite_outfits.c.user_id).label('likes')
        ).outerjoin(user_favorite_outfits, Outfit.id == user_favorite_outfits.c.outfit_id).group_by(
            Outfit.id, Outfit.name
        ).order_by(desc('likes')).limit(10).all()
        
        # Статистика модераторов
        moderator_stats = []
        moderators_list = db.query(User).filter(User.is_moderator == True).all()
        
        for moderator in moderators_list:
            items_count = db.query(Item).filter(Item.owner_id == moderator.id).count()
            moderator_stats.append({
                'user_id': moderator.id,
                'name': f"{moderator.first_name or ''} {moderator.last_name or ''}".strip() or moderator.email,
                'items_count': items_count,
                'is_active': moderator.is_active
            })
        
        return {
            "system_info": {
                "total_users": total_users,
                "active_users": active_users,
                "moderators": moderators,
                "admins": admins,
                "new_users_month": new_users_month
            },
            "content_stats": {
                "total_items": total_items,
                "items_with_price": items_with_price,
                "total_outfits": total_outfits,
                "public_outfits": public_outfits
            },
            "price_analysis": {
                "min_price": float(price_stats[0]) if price_stats and price_stats[0] else 0,
                "max_price": float(price_stats[1]) if price_stats and price_stats[1] else 0,
                "average_price": float(price_stats[2]) if price_stats and price_stats[2] else 0
            },
            "activity_stats": {
                "total_views": total_views,
                "total_favorites": total_favorites,
                "total_outfit_favorites": total_outfit_favorites,
                "total_comments": total_comments
            },
            "top_categories": [
                {"category": category, "count": count}
                for category, count in top_categories
            ],
            "top_brands": [
                {"brand": brand, "count": count}
                for brand, count in top_brands
            ],
            "daily_activity": daily_activity,
            "popular_items": [
                {
                    "id": item_id,
                    "name": name,
                    "brand": brand,
                    "likes": likes
                }
                for item_id, name, brand, likes in popular_items
            ],
            "popular_outfits": [
                {
                    "id": outfit_id,
                    "name": name,
                    "likes": likes
                }
                for outfit_id, name, likes in popular_outfits
            ],
            "moderator_stats": moderator_stats,
            "generated_at": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения системной аналитики: {str(e)}"
        )


@router.get("/health")
@limiter.limit(RATE_LIMITS["api"])
async def get_system_health(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Получить состояние здоровья системы"""
    
    try:
        # Проверка базы данных
        db_healthy = True
        try:
            db.execute("SELECT 1")
        except Exception:
            db_healthy = False
        
        # Проверка количества пользователей
        users_count = db.query(User).count()
        
        # Проверка количества товаров
        items_count = db.query(Item).count()
        
        # Проверка последней активности
        last_activity = db.query(UserView).order_by(desc(UserView.viewed_at)).first()
        
        return {
            "status": "healthy" if db_healthy else "unhealthy",
            "database": "connected" if db_healthy else "disconnected",
            "users_count": users_count,
            "items_count": items_count,
            "last_activity": last_activity.viewed_at.isoformat() if last_activity else None,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }


@router.get("/performance")
@limiter.limit(RATE_LIMITS["api"])
async def get_system_performance(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    """Получить метрики производительности системы"""
    
    try:
        # Статистика по времени загрузки (пример)
        # В реальном проекте здесь можно добавить метрики из мониторинга
        
        # Количество запросов за последний час
        hour_ago = datetime.now() - timedelta(hours=1)
        recent_views = db.query(UserView).filter(UserView.viewed_at >= hour_ago).count()
        
        # Активные пользователи за последний час
        active_users_hour = db.query(UserView.user_id).filter(
            UserView.viewed_at >= hour_ago
        ).distinct().count()
        
        return {
            "requests_per_hour": recent_views,
            "active_users_hour": active_users_hour,
            "database_connections": "healthy",  # В реальном проекте - реальные метрики
            "memory_usage": "normal",
            "cpu_usage": "normal",
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка получения метрик производительности: {str(e)}"
        ) 