from typing import List

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.security import is_admin
from app.db.models.user import User
from app.db.models.item import Item
from app.db.models.associations import user_favorite_items, UserView


def _check_access(target_user_id: int, current: User):
    if current.id != target_user_id and not is_admin(current):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")


async def toggle_favorite(db: Session, user_id: int, item_id: int, current_user: User):
    _check_access(user_id, current_user)

    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    association_exists = db.query(user_favorite_items).filter(
        user_favorite_items.c.user_id == user_id,
        user_favorite_items.c.item_id == item_id,
    ).first()

    if association_exists:
        db.execute(
            user_favorite_items.delete().where(
                user_favorite_items.c.user_id == user_id,
                user_favorite_items.c.item_id == item_id,
            )
        )
        db.commit()
        return {"detail": "Removed from favorites"}
    else:
        db.execute(user_favorite_items.insert().values(user_id=user_id, item_id=item_id))
        db.commit()
        return {"detail": "Added to favorites"}


async def list_favorites(db: Session, user_id: int, skip: int, limit: int, current_user: User) -> List[Item]:
    _check_access(user_id, current_user)
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    query = user.favorites.order_by(desc(Item.created_at))  # type: ignore
    return query.offset(skip).limit(limit).all()


async def user_history(db: Session, user_id: int, skip: int, limit: int, current_user: User) -> List[Item]:
    _check_access(user_id, current_user)

    views_query = (
        db.query(UserView.item_id, UserView.viewed_at)
        .filter(UserView.user_id == user_id)
        .order_by(desc(UserView.viewed_at))
    )
    views = views_query.offset(skip).limit(limit).all()
    item_ids = [v.item_id for v in views]
    if not item_ids:
        return []
    items_map = {i.id: i for i in db.query(Item).filter(Item.id.in_(item_ids)).all()}
    return [items_map[iid] for iid in item_ids if iid in items_map] 