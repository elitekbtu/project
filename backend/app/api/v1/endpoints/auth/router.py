from fastapi import APIRouter, Depends, Body, HTTPException, status, Header
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import Optional, Annotated

from app.core.database import get_db
from app.core.security import get_current_user, oauth2_scheme
from app.db.models.user import User
from . import service
from .schemas import UserCreate, TokensUserOut, TokensOut, RefreshTokenIn

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=TokensUserOut, status_code=status.HTTP_201_CREATED)
def register(body: service.UserCreate, db: Session = Depends(get_db)):
    result = service.register(db, body)
    if not result:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    return result


@router.post("/token", response_model=TokensUserOut)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    result = service.login(db, form_data)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return result


@router.get("/google/login")
async def google_login():
    return service.google_login()


@router.get("/google/callback", response_model=TokensUserOut)
async def google_callback(code: str, db: Session = Depends(get_db)):
    return await service.google_callback(db, code)


@router.post("/refresh", response_model=TokensOut)
def refresh_token_route(body: RefreshTokenIn, db: Session = Depends(get_db)):
    return service.refresh_token(body)


@router.post("/logout")
def logout(
    authorization: Annotated[str | None, Header()] = None,
    body: RefreshTokenIn = Body(..., embed=True),
    db: Session = Depends(get_db),
):
    token = authorization.split(" ")[1] if authorization else ""
    service.logout(token, body.refresh_token)
    return {"message": "Successfully logged out"} 