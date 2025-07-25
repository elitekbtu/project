from fastapi import APIRouter, Request, Depends, HTTPException, status

from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.profile import router as profile_router
from app.api.v1.endpoints.user_content import router as user_content_router
from app.api.v1.endpoints.cart import router as cart_router
from app.api.v1.endpoints.outfits import router as outfits_router
from app.api.v1.endpoints.items import router as items_router
from app.api.v1.endpoints.catalog import router as catalog_router
from app.api.v1.endpoints.chat_stylist import router as chat_stylist_router
from app.api.v1.endpoints import system 
from app.core.rate_limiting import limiter, RATE_LIMITS
from app.core.security import require_admin, get_current_user, is_admin
from app.db.models.user import User

api_router = APIRouter()
api_router.include_router(users_router)
api_router.include_router(auth_router)
api_router.include_router(profile_router)
api_router.include_router(user_content_router)
api_router.include_router(cart_router)
api_router.include_router(outfits_router)
api_router.include_router(items_router)
api_router.include_router(catalog_router)
api_router.include_router(chat_stylist_router)
api_router.include_router(system.router)

def allow_localhost_or_admin(request: Request, user: User = Depends(get_current_user)):
    """Allow localhost access without admin rights, require admin for other IPs"""
    client_ip = request.client.host
    localhost_ips = ['127.0.0.1', '::1', 'localhost']
    
    if client_ip in localhost_ips:
        return user  # Allow access for localhost
    elif is_admin(user):
        return user  # Allow access for admins
    else:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Admin access required for non-localhost requests"
        )

# Системный мониторинг
@api_router.get("/system/pool-stats")
@limiter.limit(RATE_LIMITS["api"])
async def get_database_pool_stats(request: Request, current_user: User = Depends(require_admin)):
    """Получить статистику пула соединений базы данных."""
    from app.core.database import get_pool_stats
    return get_pool_stats()

@api_router.get("/system/health")
@limiter.limit(RATE_LIMITS["api"])
async def system_health_check(request: Request, current_user: User = Depends(allow_localhost_or_admin)):
    """Проверка здоровья системы."""
    from app.core.database import get_pool_stats
    from datetime import datetime
    
    pool_stats = get_pool_stats()
    
    # Проверяем состояние пула соединений
    pool_healthy = (
        pool_stats["checked_out"] < pool_stats["pool_size"] + pool_stats["overflow"] and
        pool_stats["invalid"] == 0
    )
    
    return {
        "status": "healthy" if pool_healthy else "warning",
        "timestamp": datetime.now().isoformat(),
        "database_pool": pool_stats,
        "pool_healthy": pool_healthy
    }

@api_router.get("/system/rate-limits")
@limiter.limit(RATE_LIMITS["api"])
async def get_rate_limit_stats(request: Request, current_user: User = Depends(require_admin)):
    """Получить статистику rate limiting."""
    from datetime import datetime
    
    # Получаем текущие лимиты
    current_limits = RATE_LIMITS.copy()
    
    return {
        "timestamp": datetime.now().isoformat(),
        "rate_limits": current_limits,
        "message": "DDoS protection statistics are available in logs"
    } 