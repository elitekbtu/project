from celery import shared_task

@shared_task
def evaluate_outfit(outfit_id: int) -> dict:
    """Dummy task to evaluate an outfit (placeholder for AI logic)."""
    # TODO: integrate OpenAI or custom model here
    return {"outfit_id": outfit_id, "score": 0.85, "feedback": "Looks great!"}
