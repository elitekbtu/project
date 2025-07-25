import asyncio
from app.agents.style_agent import StyleAgent
from app.core.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from fastapi import Depends
from app.api.v1.endpoints.profile.schemas import ProfileOut

style_agent = StyleAgent()

async def get_stylist_reply(message: str, user, db: Session = None):
    if db is None:
        # Получить сессию вручную (sync для совместимости)
        from app.core.database import SessionLocal
        db = SessionLocal()
        close_db = True
    else:
        close_db = False
    try:
        profile = ProfileOut.from_orm(user)
        result = await style_agent.recommend(db, message, user_profile=profile)
        # items: List[Item] -> List[dict]
        items = [
            {
                "id": i.id,
                "name": i.name,
                "image_url": i.image_url,
                "brand": i.brand,
                "price": i.price,
                "category": i.category
            } for i in result.get("items", [])
        ]
        # Если товаров нет — fallback
        if not items:
            result["reply"] += "\n\nК сожалению, по вашему запросу ничего не найдено. Попробуйте изменить фильтры или уточнить запрос."
        return result.get("reply", ""), items
    finally:
        if close_db:
            db.close() 