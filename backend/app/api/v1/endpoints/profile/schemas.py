from typing import Optional
from datetime import date
from pydantic import BaseModel, HttpUrl, constr, validator, Field


PHONE_REGEX = r"^\+?[0-9]{7,15}$"


class ProfileOut(BaseModel):
    id: int
    email: str
    avatar: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone_number: Optional[constr(pattern=PHONE_REGEX)] = None
    date_of_birth: Optional[date] = None
    height: Optional[float] = None
    weight: Optional[float] = None
    chest: Optional[float] = None
    waist: Optional[float] = None
    hips: Optional[float] = None
    favorite_colors: Optional[list[str]] = None
    favorite_brands: Optional[list[str]] = None
    is_admin: bool = False
    is_moderator: bool = False

    class Config:
        from_attributes = True

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

    @validator("is_moderator", pre=True)
    def _handle_is_moderator(cls, v):
        if v is None:
            return False
        return v


class ProfileUpdate(BaseModel):
    avatar: Optional[str] = Field(None, description="Avatar URL or path")
    first_name: Optional[str] = Field(None, max_length=50, description="First name")
    last_name: Optional[str] = Field(None, max_length=50, description="Last name")
    phone_number: Optional[str] = Field(None, description="Phone number in international format")
    date_of_birth: Optional[date] = Field(None, description="Date of birth")
    height: Optional[float] = Field(None, gt=0, le=300, description="Height in cm")
    weight: Optional[float] = Field(None, gt=0, le=500, description="Weight in kg")
    chest: Optional[float] = Field(None, gt=0, le=200, description="Chest circumference in cm")
    waist: Optional[float] = Field(None, gt=0, le=200, description="Waist circumference in cm")
    hips: Optional[float] = Field(None, gt=0, le=200, description="Hips circumference in cm")
    favorite_colors: Optional[list[str]] = Field(None, description="List of favorite colors")
    favorite_brands: Optional[list[str]] = Field(None, description="List of favorite brands")

    @validator("first_name", "last_name")
    def validate_names(cls, v):
        if v is not None:
            v = v.strip()
            # Разрешаем пустые строки (они будут сохранены как None)
            if v == "":
                return None
            if len(v) > 50:
                raise ValueError("Name cannot exceed 50 characters")
            # Проверяем, что имя содержит только буквы, пробелы и дефисы
            if not all(c.isalpha() or c.isspace() or c == '-' for c in v):
                raise ValueError("Name can only contain letters, spaces and hyphens")
        return v

    @validator("phone_number")
    def validate_phone(cls, v):
        if v is not None:
            v = v.strip()
            # Разрешаем пустые строки (они будут сохранены как None)
            if v == "":
                return None
            # Проверяем формат телефона только если он не пустой
            import re
            if not re.match(PHONE_REGEX, v):
                raise ValueError("Phone number must be in international format (e.g., +77071234567)")
        return v

    @validator("height", "weight", "chest", "waist", "hips")
    def validate_measurements(cls, v):
        if v is not None:
            if v <= 0:
                raise ValueError("Value must be positive")
            # Дополнительные проверки для реалистичных значений
            if v > 300 and v == cls.height:
                raise ValueError("Height cannot exceed 300 cm")
            if v > 500 and v == cls.weight:
                raise ValueError("Weight cannot exceed 500 kg")
            if v > 200 and v in [cls.chest, cls.waist, cls.hips]:
                raise ValueError("Circumference cannot exceed 200 cm")
        return v

    @validator("date_of_birth")
    def check_dob(cls, v: Optional[date]):
        from datetime import date as _date
        if v is not None:
            if v > _date.today():
                raise ValueError("Date of birth cannot be in the future")
            # Проверяем, что возраст не менее 13 лет
            age = (_date.today() - v).days / 365.25
            if age < 13:
                raise ValueError("User must be at least 13 years old")
            if age > 120:
                raise ValueError("Invalid date of birth")
        return v

    @validator("date_of_birth", pre=True)
    def validate_date_string(cls, v):
        if v is not None:
            if isinstance(v, str):
                v = v.strip()
                # Разрешаем пустые строки (они будут сохранены как None)
                if v == "":
                    return None
        return v

    @validator("avatar")
    def validate_avatar(cls, v):
        if v is not None:
            v = v.strip()
            # Разрешаем пустые строки (они будут сохранены как None)
            if v == "":
                return None
            if v:
                # Разрешаем как абсолютные (http/https), так и относительные пути
                if not (v.startswith('http://') or v.startswith('https://') or v.startswith('/')):
                    raise ValueError("Avatar URL must be absolute (http://, https://) or start with /")
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
            items = [s.strip() for s in v.split(",") if s.strip()]
            # Валидация каждого элемента
            for item in items:
                if len(item) > 50:
                    raise ValueError("Each color/brand name cannot exceed 50 characters")
                if not all(c.isalnum() or c.isspace() or c in '-_' for c in item):
                    raise ValueError("Color/brand names can only contain letters, numbers, spaces, hyphens and underscores")
            return items
        return v 