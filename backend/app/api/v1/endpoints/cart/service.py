from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.orm import joinedload

from app.db.models.user import User
from app.db.models.item import Item
from app.db.models.variant import ItemVariant
from app.db.models.cart import CartItem
from .schemas import QuantityUpdate, CartStateOut, CartItemOut


def _cart_state(db: Session, user_id: int) -> CartStateOut:
    """Internal helper to compute cart items and aggregates for given user."""
    cart_items = (
        db.query(CartItem)
        .filter(CartItem.user_id == user_id)
        .options(
            joinedload(CartItem.variant).joinedload(ItemVariant.item)
        )
        .all()
    )

    items_out = []
    total_items = 0
    total_price = 0.0

    for ci in cart_items:
        item = ci.variant.item
        variant_price = ci.variant.price if ci.variant.price is not None else item.price
        
        items_out.append(
            CartItemOut(
                item_id=item.id,
                variant_id=ci.variant_id,
                name=item.name,
                brand=item.brand,
                image_url=item.image_url,
                size=ci.variant.size,
                color=ci.variant.color,
                sku=ci.variant.sku,
                stock=ci.variant.stock,
                quantity=ci.quantity,
                price=variant_price,
            )
        )
        total_items += ci.quantity
        total_price += ci.quantity * (variant_price or 0)

    return CartStateOut(
        items=items_out,
        total_items=total_items,
        total_price=total_price,
    )


def get_cart_state(db: Session, user: User) -> CartStateOut:
    return _cart_state(db, user.id)


def add_to_cart(db: Session, user: User, variant_id: int, qty: int = 1):
    if qty <= 0:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Quantity must be > 0")

    variant = db.get(ItemVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item variant not found")

    cart_item = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.variant_id == variant_id)
        .first()
    )

    current_qty_in_cart = cart_item.quantity if cart_item else 0
    
    if (qty + current_qty_in_cart) > variant.stock:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Not enough stock for variant. Available: {variant.stock}")

    if cart_item:
        cart_item.quantity += qty
    else:
        cart_item = CartItem(user_id=user.id, variant_id=variant_id, quantity=qty)
        db.add(cart_item)
        
    db.commit()
    return _cart_state(db, user.id)


def update_cart_item(db: Session, user: User, variant_id: int, payload: QuantityUpdate):
    cart_item = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.variant_id == variant_id)
        .first()
    )
    if not cart_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not in cart")

    if payload.quantity <= 0:
        db.delete(cart_item)
    else:
        if payload.quantity > cart_item.variant.stock:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=f"Not enough stock. Available: {cart_item.variant.stock}")
        cart_item.quantity = payload.quantity
        
    db.commit()
    return _cart_state(db, user.id)


def remove_cart_item(db: Session, user: User, variant_id: int):
    cart_item = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.variant_id == variant_id)
        .first()
    )
    if not cart_item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not in cart")
    
    db.delete(cart_item)
    db.commit()
    return _cart_state(db, user.id)


def clear_cart(db: Session, user: User):
    db.query(CartItem).filter(CartItem.user_id == user.id).delete()
    db.commit()
    return _cart_state(db, user.id) 