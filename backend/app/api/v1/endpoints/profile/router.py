from fastapi import APIRouter, Depends, status, UploadFile, File
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models.user import User
from . import service
from .schemas import ProfileOut, ProfileUpdate

router = APIRouter(prefix="/profile", tags=["Profile"])


@router.get("/", response_model=ProfileOut)
def get_profile(user: User = Depends(get_current_user)):
    return service.get_profile(user)


@router.patch("/", response_model=ProfileOut)
def update_profile(
    profile_in: ProfileUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.update_profile(db, user, profile_in)


@router.delete("/", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.delete_profile(db, user)


# ---- Avatar Management ----


@router.post("/avatar", response_model=ProfileOut)
async def upload_avatar(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.upload_avatar(db, user, file)


@router.delete("/avatar", status_code=status.HTTP_204_NO_CONTENT)
def delete_avatar(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.delete_avatar(db, user) 