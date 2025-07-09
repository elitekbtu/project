from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.security import get_password_hash
from app.db.models.user import User
from app.db.models.outfit import Outfit
from .schemas import UserCreateAdmin, UserUpdateAdmin


def list_users(db: Session) -> List[User]:
    return db.query(User).all()


def get_user(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user


def delete_user(db: Session, user_id: int):
    user = get_user(db, user_id)
    # Cascading delete is now configured in the User model via its relationships.
    # Deleting the user object will automatically trigger deletion of their outfits,
    # cart items, comments, etc., thanks to `cascade="all, delete-orphan"`.
    db.delete(user)
    db.commit()


def list_user_outfits(db: Session, user_id: int):
    user = get_user(db, user_id)
    return user.outfits


def create_user_admin(db: Session, body: UserCreateAdmin) -> User:
    existing = db.query(User).filter(User.email == body.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists",
        )
    user = User(
        email=body.email.lower(),
        hashed_password=get_password_hash(body.password),
        is_admin=body.is_admin,
        is_moderator=body.is_moderator,
        is_active=body.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_admin(db: Session, user_id: int, body: UserUpdateAdmin) -> User:
    user = get_user(db, user_id)

    if body.email is not None and body.email != user.email:
        existing = db.query(User).filter(User.email == body.email.lower()).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists",
            )
        user.email = body.email.lower()

    if body.password is not None:
        user.hashed_password = get_password_hash(body.password)
    if body.is_admin is not None:
        user.is_admin = body.is_admin
    if body.is_moderator is not None:
        user.is_moderator = body.is_moderator
    if body.is_active is not None:
        user.is_active = body.is_active

    db.add(user)
    db.commit()
    db.refresh(user)
    return user 