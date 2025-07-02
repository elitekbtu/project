from celery import Celery
import os

from app.core.config import get_settings

settings = get_settings()

celery = Celery(
    "trcapp",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.REDIS_URL,
)

# Autodiscover tasks inside the "app" package
celery.autodiscover_tasks(["app"])

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,

    # Performance & reliability tweaks (override via env vars if needed)
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=int(os.getenv("CELERY_PREFETCH", 1)),
    worker_concurrency=int(os.getenv("CELERY_CONCURRENCY", os.cpu_count() or 2)),
    broker_pool_limit=int(os.getenv("CELERY_BROKER_POOL_LIMIT", 10)),
)

# Alias for backward compatibility
celery_app = celery
