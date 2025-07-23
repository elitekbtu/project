from typing import Optional
from pydantic import BaseModel, EmailStr, constr


class UserCreateAdmin(BaseModel):
    email: EmailStr
    password: constr(min_length=8)
    is_admin: bool = False
    is_moderator: bool = False
    is_active: bool = True


class UserUpdateAdmin(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    is_admin: Optional[bool] = None
    is_moderator: Optional[bool] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    id: int
    email: EmailStr
    is_admin: bool
    is_moderator: Optional[bool] = False
    is_active: bool

    class Config:
        from_attributes = True 