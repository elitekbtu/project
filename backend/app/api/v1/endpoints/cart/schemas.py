from typing import List, Optional
from pydantic import BaseModel


class CartItemOut(BaseModel):
    item_id: int
    variant_id: int
    name: str
    brand: Optional[str]
    image_url: Optional[str]
    size: Optional[str]
    color: Optional[str]
    sku: Optional[str]
    quantity: int
    price: Optional[float]
    stock: Optional[int]


class QuantityUpdate(BaseModel):
    quantity: int


class CartStateOut(BaseModel):
    items: List[CartItemOut]
    total_items: int
    total_price: float 