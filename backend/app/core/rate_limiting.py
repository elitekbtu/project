from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
import logging
from .rate_limiting_config import rate_limit_config

logger = logging.getLogger(__name__)

# Создаем лимитер с использованием IP адреса клиента
limiter = Limiter(key_func=get_remote_address)

# Получаем настройки лимитов из конфигурации
RATE_LIMITS = rate_limit_config.get_limits()

def get_rate_limit_for_user(user=None):
    """Возвращает лимит в зависимости от роли пользователя"""
    if user and hasattr(user, 'is_admin') and user.is_admin:
        return RATE_LIMITS["admin"]
    return RATE_LIMITS["default"]

def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """Кастомный обработчик превышения лимита"""
    logger.warning(f"Rate limit exceeded for IP {get_remote_address(request)}")
    return _rate_limit_exceeded_handler(request, exc)

def setup_rate_limiting(app):
    """Настройка rate limiting для приложения"""
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)
    
    # Добавляем middleware для логирования запросов
    @app.middleware("http")
    async def log_requests(request: Request, call_next):
        # Логируем информацию о запросе
        logger.info(f"Request: {request.method} {request.url.path} from {get_remote_address(request)}")
        
        response = await call_next(request)
        
        # Логируем статус ответа
        logger.info(f"Response: {response.status_code} for {request.method} {request.url.path}")
        
        return response 