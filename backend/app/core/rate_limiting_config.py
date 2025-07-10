import os
from typing import Dict, Any

class RateLimitConfig:
    """Конфигурация для rate limiting"""
    
    def __init__(self):
        # Лимиты по умолчанию
        self.default_limits = {
            "default": "100/minute",
            "auth": "10/minute", 
            "api": "1000/hour",
            "upload": "10/minute",
            "admin": "1000/minute",
        }
        
        # DDoS protection настройки
        self.ddos_config = {
            "max_requests_per_second": 10,
            "max_requests_per_minute": 200,
            "block_duration": 300,  # 5 минут
        }
    
    def get_limits(self) -> Dict[str, str]:
        """Получает лимиты из переменных окружения или использует значения по умолчанию"""
        limits = self.default_limits.copy()
        
        # Переопределяем лимиты из переменных окружения
        env_mapping = {
            "RATE_LIMIT_DEFAULT": "default",
            "RATE_LIMIT_AUTH": "auth", 
            "RATE_LIMIT_API": "api",
            "RATE_LIMIT_UPLOAD": "upload",
            "RATE_LIMIT_ADMIN": "admin",
        }
        
        for env_var, limit_key in env_mapping.items():
            env_value = os.getenv(env_var)
            if env_value:
                limits[limit_key] = env_value
        
        return limits
    
    def get_ddos_config(self) -> Dict[str, Any]:
        """Получает конфигурацию DDoS защиты"""
        config = self.ddos_config.copy()
        
        # Переопределяем из переменных окружения
        env_mapping = {
            "DDOS_MAX_REQUESTS_PER_SECOND": "max_requests_per_second",
            "DDOS_MAX_REQUESTS_PER_MINUTE": "max_requests_per_minute", 
            "DDOS_BLOCK_DURATION": "block_duration",
        }
        
        for env_var, config_key in env_mapping.items():
            env_value = os.getenv(env_var)
            if env_value:
                try:
                    if config_key == "block_duration":
                        config[config_key] = int(env_value)
                    else:
                        config[config_key] = int(env_value)
                except ValueError:
                    pass  # Используем значение по умолчанию
        
        return config

# Глобальный экземпляр конфигурации
rate_limit_config = RateLimitConfig() 