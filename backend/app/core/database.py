from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import logging

from .config import get_settings

settings = get_settings()

# Настройка логирования для SQLAlchemy
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

engine = create_engine(
    settings.DATABASE_URL, 
    pool_pre_ping=True, 
    future=True,
    # Используем настройки из переменных окружения
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_reset_on_return='commit',
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)

Base = declarative_base()


def get_db():
    """Yield database session (dependency)."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_pool_stats():
    """Получить статистику пула соединений для мониторинга."""
    pool = engine.pool
    return {
        "pool_size": pool.size(),
        "checked_in": pool.checkedin(),
        "checked_out": pool.checkedout(),
        "overflow": pool.overflow(),
    }


def log_pool_stats():
    """Логировать статистику пула соединений."""
    stats = get_pool_stats()
    logger.info(f"Database pool stats: {stats}") 