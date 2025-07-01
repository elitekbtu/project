from typing import Dict, Any, Optional
from datetime import datetime, timedelta

from fastapi import HTTPException, status, Depends, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.database import get_db
from app.db.models.user import User
from app.core.redis_client import get_redis

settings = get_settings()

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(data: dict, expires_delta: timedelta | None = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


def blacklist_token(token: str, ttl: int | None = None) -> None:
    if not token:
        return
    redis_client = get_redis()
    key = f"token_blacklist:{token}"
    if ttl and ttl > 0:
        redis_client.setex(key, ttl, "1")
    else:
        redis_client.set(key, "1")


def is_token_blacklisted(token: str) -> bool:
    """Return True if the token is present in Redis blacklist."""
    if not token:
        return False
    redis_client = get_redis()
    return redis_client.exists(f"token_blacklist:{token}") == 1


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if is_token_blacklisted(token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    payload = decode_token(token)
    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    user = db.query(User).filter(User.id == int(user_id)).first()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def is_admin(user: User) -> bool:
    if user.is_admin:
        return True
    admin_emails = [e.strip().lower() for e in settings.ADMIN_EMAILS.split(",") if e.strip()]
    return user.email.lower() in admin_emails


def require_admin(user: User = Depends(get_current_user)):
    if not is_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return user



def create_refresh_token(data: dict, expires_delta: timedelta | None = None):
    """Return a signed JWT refresh token."""
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS))
    to_encode.update({"exp": expire, "type": "refresh"})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def blacklist_refresh_token(token: str, ttl: int | None = None) -> None:
    if not token:
        return
    redis_client = get_redis()
    key = f"refresh_token_blacklist:{token}"
    if ttl and ttl > 0:
        redis_client.setex(key, ttl, "1")
    else:
        redis_client.set(key, "1")


def is_refresh_token_blacklisted(token: str) -> bool:
    if not token:
        return False
    redis_client = get_redis()
    return redis_client.exists(f"refresh_token_blacklist:{token}") == 1


def decode_refresh_token(token: str) -> dict:
    if is_refresh_token_blacklisted(token):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token has been revoked")
    payload = decode_token(token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return payload


def get_current_user_optional(request: Request, db: Session = Depends(get_db)) -> Optional[User]:
    authorization: Optional[str] = request.headers.get("Authorization") if request else None
    if not authorization:
        return None

    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None

    if is_token_blacklisted(token):
        return None

    try:
        payload = decode_token(token)
    except HTTPException:
        return None

    user_id: Optional[int] = payload.get("sub")
    if user_id is None:
        return None

    user = db.query(User).filter(User.id == int(user_id)).first()
    return user
