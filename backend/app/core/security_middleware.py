import time
import logging
from collections import defaultdict, deque
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from typing import Dict, Deque
import asyncio
from .rate_limiting_config import rate_limit_config

logger = logging.getLogger(__name__)

class DDoSProtectionMiddleware(BaseHTTPMiddleware):
    def __init__(self, app):
        super().__init__(app)
        # Получаем конфигурацию DDoS защиты
        ddos_config = rate_limit_config.get_ddos_config()
        
        # Хранилище для отслеживания запросов по IP
        self.request_history: Dict[str, Deque] = defaultdict(lambda: deque(maxlen=100))
        self.blocked_ips: Dict[str, float] = {}
        self.block_duration = ddos_config["block_duration"]
        self.max_requests_per_minute = ddos_config["max_requests_per_minute"]
        self.max_requests_per_second = ddos_config["max_requests_per_second"]
        
    async def dispatch(self, request: Request, call_next):
        client_ip = self._get_client_ip(request)
        current_time = time.time()
        
        # Проверяем, не заблокирован ли IP
        if client_ip in self.blocked_ips:
            if current_time - self.blocked_ips[client_ip] < self.block_duration:
                logger.warning(f"Blocked request from IP: {client_ip}")
                return Response(
                    content="Too many requests. Please try again later.",
                    status_code=429,
                    headers={"Retry-After": str(self.block_duration)}
                )
            else:
                # Разблокируем IP
                del self.blocked_ips[client_ip]
        
        # Добавляем текущий запрос в историю
        self.request_history[client_ip].append(current_time)
        
        # Проверяем лимиты
        if self._is_rate_limit_exceeded(client_ip, current_time):
            self.blocked_ips[client_ip] = current_time
            logger.warning(f"Rate limit exceeded for IP: {client_ip}")
            return Response(
                content="Rate limit exceeded. Please try again later.",
                status_code=429,
                headers={"Retry-After": str(self.block_duration)}
            )
        
        # Продолжаем обработку запроса
        response = await call_next(request)
        
        # Добавляем заголовки для мониторинга
        response.headers["X-RateLimit-Remaining"] = str(self._get_remaining_requests(client_ip))
        response.headers["X-RateLimit-Reset"] = str(int(current_time + 60))
        
        return response
    
    def _get_client_ip(self, request: Request) -> str:
        """Получает реальный IP клиента с учетом прокси"""
        forwarded_for = request.headers.get("X-Forwarded-For")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        return request.client.host if request.client else "unknown"
    
    def _is_rate_limit_exceeded(self, client_ip: str, current_time: float) -> bool:
        """Проверяет, превышен ли лимит запросов"""
        history = self.request_history[client_ip]
        
        # Проверяем лимит в секунду
        requests_last_second = sum(1 for t in history if current_time - t < 1)
        if requests_last_second > self.max_requests_per_second:
            return True
        
        # Проверяем лимит в минуту
        requests_last_minute = sum(1 for t in history if current_time - t < 60)
        if requests_last_minute > self.max_requests_per_minute:
            return True
        
        return False
    
    def _get_remaining_requests(self, client_ip: str) -> int:
        """Возвращает количество оставшихся запросов в минуту"""
        current_time = time.time()
        history = self.request_history[client_ip]
        requests_last_minute = sum(1 for t in history if current_time - t < 60)
        return max(0, self.max_requests_per_minute - requests_last_minute) 