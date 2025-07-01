from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_optional
from app.db.models.user import User
from . import service
from .schemas import OutfitCreate, OutfitUpdate, OutfitOut, OutfitCommentCreate, OutfitCommentOut

router = APIRouter(prefix="/outfits", tags=["Outfits"])


@router.post("/", response_model=OutfitOut, status_code=status.HTTP_201_CREATED)
def create_outfit(outfit_in: OutfitCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.create_outfit(db, user, outfit_in)


@router.get("/", response_model=List[OutfitOut])
def list_outfits(
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = Query(None),
    style: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    collection: Optional[str] = Query(None),
    sort_by: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    return service.list_outfits(db, user, skip, limit, q, style, min_price, max_price, collection, sort_by)


@router.get("/favorites", response_model=List[OutfitOut])
def list_favorite_outfits(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.list_favorite_outfits(db, user)


@router.get("/history", response_model=List[OutfitOut])
def viewed_outfits(limit: int = 50, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.viewed_outfits(db, user, limit)


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
def clear_outfit_view_history(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.clear_outfit_view_history(db, user)


@router.get("/trending", response_model=List[OutfitOut])
def trending_outfits(limit: int = 20, db: Session = Depends(get_db)):
    return service.trending_outfits(db, limit)


@router.get("/{outfit_id}", response_model=OutfitOut)
def get_outfit(outfit_id: int, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)):
    return service.get_outfit(db, outfit_id, user)


@router.put("/{outfit_id}", response_model=OutfitOut)
def update_outfit(
    outfit_id: int,
    outfit_in: OutfitUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.update_outfit(db, user, outfit_id, outfit_in)


@router.delete("/{outfit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_outfit(outfit_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.delete_outfit(db, user, outfit_id)


@router.post("/{outfit_id}/favorite", status_code=status.HTTP_200_OK)
def toggle_favorite_outfit(outfit_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.toggle_favorite_outfit(db, user, outfit_id)


@router.post("/{outfit_id}/comments", response_model=OutfitCommentOut, status_code=status.HTTP_201_CREATED)
def add_outfit_comment(outfit_id: int, payload: OutfitCommentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.add_outfit_comment(db, user, outfit_id, payload)


@router.get("/{outfit_id}/comments", response_model=List[OutfitCommentOut])
def list_outfit_comments(outfit_id: int, db: Session = Depends(get_db)):
    return service.list_outfit_comments(db, outfit_id)


@router.post("/{outfit_id}/comments/{comment_id}/like", status_code=status.HTTP_200_OK)
def like_outfit_comment(comment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.like_outfit_comment(db, user, comment_id)


@router.delete("/{outfit_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_outfit_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.delete_outfit_comment(db, user, comment_id) 