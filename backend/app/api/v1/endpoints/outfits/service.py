from typing import List, Optional
from fastapi import HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, desc
from datetime import datetime, timedelta

from app.db.models.outfit import Outfit, OutfitItem
from app.db.models.item import Item
from app.core.security import is_admin
from app.db.models.user import User
from app.db.models.associations import user_favorite_outfits, OutfitView
from app.db.models.comment import Comment
from .schemas import OutfitCreate, OutfitUpdate, OutfitOut, OutfitCommentCreate, OutfitCommentOut, OutfitItemBase

CATEGORY_MAP = {
    # payload_field: (set_of_acceptable_item_categories, item_category_for_outfit_item)
    "top_ids": (
        {
            "top", "tops", "Top", "Tops",
            "tshirt", "shirt", "hoodie", "sweater", "jacket", "coat", "dress"
        },
        "top",
    ),
    "bottom_ids": (
        {
            "bottom", "bottoms", "Bottom", "Bottoms",
            "pants", "jeans", "shorts", "skirt"
        },
        "bottom",
    ),
    "footwear_ids": ({"footwear", "Footwear"}, "footwear"),
    "accessories_ids": ({"accessories", "Accessories", "accessory"}, "accessory"),
    "fragrances_ids": ({"fragrances", "Fragrances", "fragrance"}, "fragrance"),
}


def _fetch_items_by_category(db: Session, ids: List[int], acceptable_categories: set[str]) -> List[Item]:
    if not ids:
        return []
    # Normalize categories to lower for comparison
    normalized = {c.lower() for c in acceptable_categories}
    items = db.query(Item).filter(Item.id.in_(ids)).all()
    if len(items) != len(ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more items not found")
    for item in items:
        # Allow items with an undefined/blank category. They are considered "universal" and can be
        # used in any slot of the outfit. Only validate when the item actually has a category set.
        if item.category and item.category.lower() not in normalized:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Item {item.id} is not in expected category",
            )
    return items


def _check_owner_or_admin(outfit: Outfit, user: Optional[User]):
    if not user or (outfit.owner_id != str(user.id) and not is_admin(user)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")


def _calculate_outfit_price(outfit: Outfit) -> OutfitOut:
    """Manually construct the OutfitOut response model."""
    categorized_items = outfit.items  # This is the @property that returns a dict of items by category

    all_items = [item for sublist in categorized_items.values() for item in sublist]
    total_price = sum(item.price for item in all_items if item.price is not None)

    return OutfitOut(
        id=outfit.id,
        name=outfit.name,
        style=outfit.style,
        description=outfit.description,
        collection=outfit.collection,
        owner_id=outfit.owner_id,
        created_at=outfit.created_at,
        updated_at=outfit.updated_at,
        tops=categorized_items.get("tops", []),
        bottoms=categorized_items.get("bottoms", []),
        footwear=categorized_items.get("footwear", []),
        accessories=categorized_items.get("accessories", []),
        fragrances=categorized_items.get("fragrances", []),
        total_price=total_price,
    )


def _price_in_range(price: Optional[float], min_price: Optional[float], max_price: Optional[float]) -> bool:
    if price is None:
        return not min_price and not max_price
    if min_price is not None and price < min_price:
        return False
    if max_price is not None and price > max_price:
        return False
    return True


def _comment_with_likes(comment: Comment):
    out_comment = OutfitCommentOut.from_orm(comment)
    out_comment.likes = comment.liked_by.count()
    return out_comment


def create_outfit(db: Session, user: User, outfit_in: OutfitCreate):
    db_outfit = Outfit(
        name=outfit_in.name,
        style=outfit_in.style,
        description=outfit_in.description,
        collection=outfit_in.collection,
        owner_id=str(user.id),
    )

    all_items_for_collection_check = []

    for payload_field, (acceptable_set, item_cat) in CATEGORY_MAP.items():
        ids = getattr(outfit_in, payload_field)
        if not ids:
            continue
        items = _fetch_items_by_category(db, ids, acceptable_set)
        all_items_for_collection_check.extend(items)
        for item in items:
            outfit_item = OutfitItem(item_category=item_cat, item=item)
            db_outfit.outfit_items.append(outfit_item)

    # Validate that items belong to the specified collection only when:
    #   1. Клиент действительно указал коллекцию И
    #   2. У товара тоже явно указана коллекция, отличная от переданной
    # Это позволяет использовать универсальные вещи без коллекции в любом образе.
    if outfit_in.collection:
        for item in all_items_for_collection_check:
            if item.collection and item.collection != outfit_in.collection:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Item {item.id} does not belong to collection '{outfit_in.collection}'",
                )

    db.add(db_outfit)
    db.commit()
    db.refresh(db_outfit)
    return _calculate_outfit_price(db_outfit)


def list_outfits(
    db: Session,
    user: Optional[User],
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    style: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    collection: Optional[str] = None,
    sort_by: Optional[str] = None,
):
    query = db.query(Outfit)

    if user is not None and not is_admin(user):
        query = query.filter(Outfit.owner_id == str(user.id))

    if q:
        search = f"%{q}%"
        query = query.filter(
            or_(
                Outfit.name.ilike(search),
                Outfit.description.ilike(search),
                Outfit.style.ilike(search)
            )
        )

    if style:
        query = query.filter(Outfit.style == style)

    if collection:
        query = query.filter(Outfit.collection == collection)

    if sort_by == "newest":
        query = query.order_by(Outfit.created_at.desc())

    outfits = query.offset(skip).limit(limit).all()
    result = []

    for outfit in outfits:
        outfit_out = _calculate_outfit_price(outfit)
        if _price_in_range(outfit_out.total_price, min_price, max_price):
            result.append(outfit_out)

    if sort_by in ["price_asc", "price_desc"]:
        result.sort(key=lambda x: x.total_price or 0, reverse=(sort_by == "price_desc"))

    return result


def list_favorite_outfits(db: Session, user: User):
    return [_calculate_outfit_price(o) for o in user.favorite_outfits.all()]


def viewed_outfits(db: Session, user: User, limit: int = 50):
    views = (
        db.query(OutfitView)
        .filter(OutfitView.user_id == user.id)
        .order_by(OutfitView.viewed_at.desc())
        .limit(limit)
        .all()
    )
    outfit_ids = [v.outfit_id for v in views]
    if not outfit_ids:
        return []
    outfits = db.query(Outfit).filter(Outfit.id.in_(outfit_ids)).all()
    return [_calculate_outfit_price(o) for o in outfits]


def clear_outfit_view_history(db: Session, user: User):
    db.query(OutfitView).filter(OutfitView.user_id == user.id).delete()
    db.commit()


def get_outfit(db: Session, outfit_id: int, user: Optional[User]):
    outfit = db.query(Outfit).filter(Outfit.id == outfit_id).first()
    if not outfit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outfit not found")

    if user:
        db.add(OutfitView(user_id=user.id, outfit_id=outfit.id))
        db.commit()

    return _calculate_outfit_price(outfit)


def update_outfit(db: Session, user: User, outfit_id: int, outfit_in: OutfitUpdate):
    outfit = db.query(Outfit).filter(Outfit.id == outfit_id).first()
    if not outfit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outfit not found")
    _check_owner_or_admin(outfit, user)

    update_data = outfit_in.dict(exclude_unset=True)

    for field in ["name", "style", "description", "collection"]:
        if field in update_data:
            setattr(outfit, field, update_data[field])

    items_were_updated = False
    for payload_field, (acceptable_set, item_cat) in CATEGORY_MAP.items():
        if payload_field in update_data:
            items_were_updated = True
            # This category is being updated. Remove existing items of this category.
            outfit.outfit_items = [oi for oi in outfit.outfit_items if oi.item_category != item_cat]

            # Add new items for this category
            ids = update_data[payload_field]
            if ids:
                items = _fetch_items_by_category(db, ids, acceptable_set)
                for item in items:
                    outfit.outfit_items.append(OutfitItem(item_category=item_cat, item=item))

    # Validate that items belong to the specified collection only when:
    #   1. Клиент действительно указал коллекцию И
    #   2. У товара тоже явно указана коллекция, отличная от переданной
    # Это позволяет использовать универсальные вещи без коллекции в любом образе.
    if outfit_in.collection:
        for item in outfit.outfit_items:
            if item.item.collection and item.item.collection != outfit_in.collection:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Item {item.item.id} does not belong to collection '{outfit_in.collection}'",
                )

    db.add(outfit)
    db.commit()
    db.refresh(outfit)
    return _calculate_outfit_price(outfit)


def delete_outfit(db: Session, user: User, outfit_id: int):
    outfit = db.query(Outfit).filter(Outfit.id == outfit_id).first()
    if not outfit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outfit not found")
    _check_owner_or_admin(outfit, user)
    db.delete(outfit)
    db.commit()


def trending_outfits(db: Session, limit: int = 20):
    seven_days_ago = datetime.utcnow() - timedelta(days=7)
    results = (
        db.query(Outfit, func.count(OutfitView.id).label("view_count"))
        .join(OutfitView, Outfit.id == OutfitView.outfit_id)
        .filter(OutfitView.viewed_at >= seven_days_ago)
        .group_by(Outfit.id)
        .order_by(desc("view_count"))
        .limit(limit)
        .all()
    )
    return [_calculate_outfit_price(outfit) for outfit, _ in results]


def toggle_favorite_outfit(db: Session, user: User, outfit_id: int):
    outfit = db.get(Outfit, outfit_id)
    if not outfit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outfit not found")

    fav = user.favorite_outfits.filter(user_favorite_outfits.c.outfit_id == outfit_id).first()
    if fav:
        user.favorite_outfits.remove(fav)
        db.commit()
        return {"detail": "Removed from favorites"}
    else:
        user.favorite_outfits.append(outfit)
        db.commit()
        return {"detail": "Added to favorites"}


def add_outfit_comment(db: Session, user: User, outfit_id: int, payload: OutfitCommentCreate):
    outfit = db.get(Outfit, outfit_id)
    if not outfit:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Outfit not found")
    comment = Comment(**payload.dict(), user_id=user.id, outfit_id=outfit_id)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _comment_with_likes(comment)


def list_outfit_comments(db: Session, outfit_id: int):
    comments = db.query(Comment).filter(Comment.outfit_id == outfit_id).all()
    return [_comment_with_likes(c) for c in comments]


def like_outfit_comment(db: Session, user: User, comment_id: int):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    
    like_exists = comment.liked_by.filter_by(id=user.id).first()

    if like_exists:
        comment.liked_by.remove(like_exists)
        message = "Comment unliked"
    else:
        comment.liked_by.append(user)
        message = "Comment liked"
    
    db.commit()
    return {"detail": message}


def delete_outfit_comment(db: Session, user: User, comment_id: int):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    
    if comment.user_id != user.id and not is_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        
    db.delete(comment)
    db.commit() 