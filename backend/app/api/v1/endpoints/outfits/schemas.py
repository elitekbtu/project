from typing import List, Optional
from pydantic import BaseModel, root_validator, conint
from datetime import datetime


class OutfitItemBase(BaseModel):
    id: int
    name: str
    brand: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[float] = None

    class Config:
        orm_mode = True


class OutfitCreate(BaseModel):
    name: str
    style: str
    description: Optional[str] = None
    collection: Optional[str] = None
    top_ids: List[int] = []
    bottom_ids: List[int] = []
    footwear_ids: List[int] = []
    accessories_ids: List[int] = []
    fragrances_ids: List[int] = []

    # Валидатор убран - разрешаем создавать пустые образы как заготовки
    # @root_validator
    # def _at_least_one_category(cls, values):
    #     if not any(values.get(field) for field in ["top_ids", "bottom_ids", "footwear_ids",
    #                                              "accessories_ids", "fragrances_ids"]):
    #         raise ValueError("At least one outfit category must contain items")
    #     return values


class OutfitUpdate(BaseModel):
    name: Optional[str] = None
    style: Optional[str] = None
    description: Optional[str] = None
    collection: Optional[str] = None
    top_ids: Optional[List[int]] = None
    bottom_ids: Optional[List[int]] = None
    footwear_ids: Optional[List[int]] = None
    accessories_ids: Optional[List[int]] = None
    fragrances_ids: Optional[List[int]] = None


class OutfitOut(BaseModel):
    id: int
    name: str
    style: str
    description: Optional[str] = None
    collection: Optional[str] = None
    owner_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    tops: List[OutfitItemBase] = []
    bottoms: List[OutfitItemBase] = []
    footwear: List[OutfitItemBase] = []
    accessories: List[OutfitItemBase] = []
    fragrances: List[OutfitItemBase] = []
    total_price: Optional[float] = None

    class Config:
        orm_mode = True


class OutfitCommentCreate(BaseModel):
    content: str
    rating: Optional[conint(ge=1, le=5)] = None


class OutfitCommentOut(OutfitCommentCreate):
    id: int
    user_id: int
    created_at: Optional[datetime]
    likes: Optional[int] = 0

    class Config:
        orm_mode = True 