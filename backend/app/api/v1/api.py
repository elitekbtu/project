from fastapi import APIRouter, Request

from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.profile import router as profile_router
from app.api.v1.endpoints.user_content import router as user_content_router
from app.api.v1.endpoints.cart import router as cart_router
from app.api.v1.endpoints.outfits import router as outfits_router
from app.api.v1.endpoints.items import router as items_router
from app.api.v1.endpoints.catalog import router as catalog_router
from app.api.v1.endpoints import system 
from app.core.rate_limiting import limiter, RATE_LIMITS

api_router = APIRouter()
api_router.include_router(users_router)
api_router.include_router(auth_router)
api_router.include_router(profile_router)
api_router.include_router(user_content_router)
api_router.include_router(cart_router)
api_router.include_router(outfits_router)
api_router.include_router(items_router)
api_router.include_router(catalog_router)
api_router.include_router(system.router)

# Системный мониторинг
@api_router.get("/system/pool-stats")
@limiter.limit(RATE_LIMITS["api"])
async def get_database_pool_stats(request: Request):
    """Получить статистику пула соединений базы данных."""
    from app.core.database import get_pool_stats
    return get_pool_stats()

@api_router.get("/system/health")
@limiter.limit(RATE_LIMITS["api"])
async def system_health_check(request: Request):
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
async def get_rate_limit_stats(request: Request):
    """Получить статистику rate limiting."""
    from datetime import datetime
    
    # Получаем текущие лимиты
    current_limits = RATE_LIMITS.copy()
    
    return {
        "timestamp": datetime.now().isoformat(),
        "rate_limits": current_limits,
        "message": "DDoS protection statistics are available in logs"
    } 