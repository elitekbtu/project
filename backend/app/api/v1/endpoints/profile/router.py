from fastapi import APIRouter, Depends, status, UploadFile, File, Request
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.rate_limiting import limiter, RATE_LIMITS
from app.db.models.user import User
from . import service
from .schemas import ProfileOut, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["Profile"], dependencies=[Depends(get_current_user)])


@router.get("/", response_model=ProfileOut)
@limiter.limit(RATE_LIMITS["api"])
async def get_profile(request: Request, user: User = Depends(get_current_user)):
    return service.get_profile(user)


@router.put("/", response_model=ProfileOut)
@limiter.limit(RATE_LIMITS["api"])
async def update_profile(
    request: Request,
    profile_update: ProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.update_profile(db, user, profile_update)


@router.get("/outfits")
@limiter.limit(RATE_LIMITS["api"])
async def get_user_outfits(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.get_user_outfits(db, user)


# ---- Avatar Management ----


@router.post("/avatar", response_model=ProfileOut)
@limiter.limit(RATE_LIMITS["upload"])
async def upload_avatar(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.upload_avatar(db, user, file)


@router.delete("/avatar", response_model=ProfileOut)
@limiter.limit(RATE_LIMITS["api"])
async def remove_avatar(
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.remove_avatar(db, user)


@router.post("/upload-photo", response_model=dict)
@limiter.limit(RATE_LIMITS["upload"])
async def upload_photo(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Загружает фото пользователя для виртуальной примерки"""
    photo_url = service.upload_photo_for_tryon(db, user, file)
    return {"photo_url": photo_url} 