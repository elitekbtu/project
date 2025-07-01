from typing import Optional
from datetime import date
from pydantic import BaseModel, HttpUrl, constr, validator


PHONE_REGEX = r"^\+?[0-9]{7,15}$"


class ProfileOut(BaseModel):
    id: int
    email: str
    avatar: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[constr(regex=PHONE_REGEX)] = None
    date_of_birth: Optional[date] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    chest: Optional[float] = None
    waist: Optional[float] = None
    hips: Optional[float] = None
    favorite_colors: Optional[list[str]] = None
    favorite_brands: Optional[list[str]] = None
    is_admin: bool = False

    class Config:
        orm_mode = True

    # Accept values coming from DB as comma-separated strings and convert to lists
    @validator("favorite_colors", "favorite_brands", pre=True)
    def _split_csv(cls, v):
        if v is None:
            return None
        # Already list of strings or ORM objects
        if isinstance(v, list):
            # Convert list of ORM objects (Color/Brand) to their names
            if v and hasattr(v[0], "name"):
                return [getattr(obj, "name", str(obj)) for obj in v]
            return v
        # Empty string => None / empty list
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            return v.split(",")
        return v


class ProfileUpdate(BaseModel):
    avatar: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[constr(regex=PHONE_REGEX)] = None
    date_of_birth: Optional[date] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    chest: Optional[float] = None
    waist: Optional[float] = None
    hips: Optional[float] = None
    favorite_colors: Optional[list[str]] = None
    favorite_brands: Optional[list[str]] = None

    @validator("height", "weight", "chest", "waist", "hips")
    def positive_values(cls, v):
        if v is not None and v <= 0:
            raise ValueError("Value must be positive")
        return v

    @validator("date_of_birth")
    def check_dob(cls, v: Optional[date]):
        from datetime import date as _date
        if v is not None and v > _date.today():
            raise ValueError("Date of birth cannot be in the future")
        return v

    # Accept raw comma-separated strings as well
    @validator("favorite_colors", "favorite_brands", pre=True)
    def _split_csv_update(cls, v):
        if v is None:
            return None
        if isinstance(v, list):
            return v
        if isinstance(v, str):
            v = v.strip()
            if not v:
                return []
            return [s.strip() for s in v.split(",") if s.strip()]
        return v 