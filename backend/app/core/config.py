from functools import lru_cache
from typing import List

from pydantic import BaseSettings, Field, validator


class Settings(BaseSettings):

    PROJECT_NAME: str = "TRC Backend"
    BACKEND_CORS_ORIGINS: List[str] = ["https://trc.works", "https://www.trc.works", "https://164.90.225.127", "http://localhost"]
    DATABASE_URL: str = Field(env="DATABASE_URL")
    REDIS_URL: str = Field(env="REDIS_URL")

    CELERY_BROKER_URL: str = Field("amqp://rabbitmq:5672//", env="CELERY_BROKER_URL")

    OPENAI_API_KEY: str = Field("", env="OPENAI_API_KEY")

    ADMIN_EMAILS: str = Field("", env="ADMIN_EMAILS")
    ADMIN_DEFAULT_PASSWORD: str = Field("", env="ADMIN_DEFAULT_PASSWORD")

    SECRET_KEY: str = Field("", env="SECRET_KEY")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(60, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(14, env="REFRESH_TOKEN_EXPIRE_DAYS")

    GOOGLE_CLIENT_ID: str = Field("", env="GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str = Field("", env="GOOGLE_CLIENT_SECRET")
    GOOGLE_REDIRECT_URI: str = Field("", env="GOOGLE_REDIRECT_URI")

    # Database pool configuration
    DB_POOL_SIZE: int = Field(20, env="DB_POOL_SIZE")
    DB_MAX_OVERFLOW: int = Field(30, env="DB_MAX_OVERFLOW")
    DB_POOL_TIMEOUT: int = Field(60, env="DB_POOL_TIMEOUT")
    DB_POOL_RECYCLE: int = Field(3600, env="DB_POOL_RECYCLE")

    class Config:
        env_file = ".env"
        case_sensitive = True

    # --- Validators -----------------------------------------------------

    @validator("DATABASE_URL")
    def _validate_database_url(cls, v: str) -> str:  # noqa: D401
        """Ensure DATABASE_URL does not use insecure default credentials."""
        if "postgres:postgres@" in v:
            raise ValueError(
                "Insecure default DATABASE_URL detected. "
                "Please set a secure DATABASE_URL environment variable in your .env file."
            )
        return v


@lru_cache
def get_settings() -> Settings:
    """Cached settings to avoid re-reading on each access."""
    return Settings()



