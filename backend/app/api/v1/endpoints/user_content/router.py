from typing import List

from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.rate_limiting import limiter, RATE_LIMITS
from app.db.models.user import User
from app.api.v1.endpoints.items.schemas import ItemOut
from . import service

router = APIRouter(prefix="/users", tags=["UserContent"], dependencies=[Depends(get_current_user)])


@router.post("/{user_id}/favorites/{item_id}", status_code=status.HTTP_200_OK)
@limiter.limit(RATE_LIMITS["api"])
async def toggle_favorite(
    request: Request,
    user_id: int,
    item_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    return await service.toggle_favorite(db, user_id, item_id, current)


@router.get("/{user_id}/favorites", response_model=List[ItemOut])
@limiter.limit(RATE_LIMITS["api"])
async def list_favorites(
    request: Request,
    user_id: int,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    return await service.list_favorites(db, user_id, current)


@router.get("/{user_id}/history", response_model=List[ItemOut])
@limiter.limit(RATE_LIMITS["api"])
async def user_history(
    request: Request,
    user_id: int,
    limit: int = 50,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    return await service.user_history(db, user_id, limit, current) 