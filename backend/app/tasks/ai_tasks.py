from celery import shared_task
from app.core.config import get_settings

settings = get_settings()

@shared_task
def evaluate_outfit(outfit_id: int) -> dict:
    """Dummy task to evaluate an outfit (placeholder for Azure OpenAI logic)."""
    # TODO: integrate Azure OpenAI or custom model here
    return {"outfit_id": outfit_id, "score": 0.85, "feedback": "Looks great!"}
