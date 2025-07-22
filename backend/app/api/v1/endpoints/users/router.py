from typing import List

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin, get_current_user_optional
from app.core.rate_limiting import limiter, RATE_LIMITS
from . import service
from .schemas import UserCreateAdmin, UserUpdateAdmin, UserOut

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("/", response_model=list[UserOut])
@limiter.limit(RATE_LIMITS["api"])
def list_users(
    request: Request,
    page: int = Query(1, ge=1),
    q: str = Query(None, description="Поиск по email"),
    role: str = Query(None, description="Фильтр по роли: admin, moderator, user, all"),
    db: Session = Depends(get_db),
    current_user = Depends(require_admin),
):
    from app.core.pagination import get_pagination
    skip, limit = get_pagination(page)
    return service.list_users(db, skip, limit, q, role)


@router.get("/moderators", response_model=List[dict])
@limiter.limit(RATE_LIMITS["api"])
def list_moderators(request: Request, db: Session = Depends(get_db), current_user = Depends(get_current_user_optional)):
    """Get list of all moderators with their shop information"""
    return service.list_moderators(db)


@router.get("/{user_id}", response_model=UserOut)
@limiter.limit(RATE_LIMITS["api"])
def get_user(request: Request, user_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user_optional)):
    user = service.get_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_LIMITS["api"])
def delete_user(request: Request, user_id: int, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    user = service.delete_user(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return None


@router.get("/{user_id}/outfits")
@limiter.limit(RATE_LIMITS["api"])
def list_user_outfits(request: Request, user_id: int, db: Session = Depends(get_db), current_user = Depends(get_current_user_optional)):
    return service.list_user_outfits(db, user_id)


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMITS["api"])
def create_user_admin(request: Request, body: UserCreateAdmin, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    user = service.create_user_admin(db, body)
    if not user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    return user


@router.patch("/{user_id}", response_model=UserOut)
@limiter.limit(RATE_LIMITS["api"])
def update_user_admin(request: Request, user_id: int, body: UserUpdateAdmin, db: Session = Depends(get_db), current_user = Depends(require_admin)):
    user = service.update_user_admin(db, user_id, body)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user 