from typing import List, Optional

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.db.models.user import User
from . import service
from .schemas import CartStateOut, QuantityUpdate

router = APIRouter(prefix="/cart", tags=["Cart"])


@router.get("/", response_model=CartStateOut)
def get_cart_state(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.get_cart_state(db, user)


@router.post("/{variant_id}", response_model=CartStateOut, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    variant_id: int,
    qty: int = 1,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.add_to_cart(db, user, variant_id, qty)


@router.put("/{variant_id}", response_model=CartStateOut)
def update_cart_item(
    variant_id: int,
    payload: QuantityUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.update_cart_item(db, user, variant_id, payload)


@router.delete("/{variant_id}", response_model=CartStateOut)
def remove_cart_item(variant_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.remove_cart_item(db, user, variant_id)


@router.delete("/", response_model=CartStateOut)
def clear_cart(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.clear_cart(db, user) 