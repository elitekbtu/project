import os
import uuid
from typing import List, Optional
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, desc

from app.db.models.item import Item
from app.db.models.user import User
from app.db.models.associations import user_favorite_items, UserView
from app.db.models.comment import Comment
from app.db.models.variant import ItemVariant
from app.db.models.item_image import ItemImage
from .schemas import ItemUpdate, VariantCreate, VariantUpdate, CommentCreate


UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads/items")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def _save_upload_file(upload: UploadFile, subdir: str = "") -> str:
    """Save uploaded file and return relative path accessible via /uploads."""
    filename = f"{uuid.uuid4().hex}_{upload.filename}"
    dir_path = os.path.join(UPLOAD_DIR, subdir) if subdir else UPLOAD_DIR
    os.makedirs(dir_path, exist_ok=True)
    file_path = os.path.join(dir_path, filename)
    with open(file_path, "wb") as f:
        f.write(upload.file.read())
    return f"/uploads/items/{subdir + '/' if subdir else ''}{filename}"


def _remove_upload_file(url: str):
    """Remove file from filesystem based on its public URL path."""
    if not url or not url.startswith("/uploads/"):
        return
    # Convert URL path to filesystem path
    # Example: /uploads/items/file.jpg -> uploads/items/file.jpg
    fs_path = url.lstrip("/").replace("/", os.sep)
    if os.path.exists(fs_path):
        try:
            os.remove(fs_path)
        except OSError:
            pass


def _comment_with_likes(comment: Comment):
    # Helper to include likes count in response
    from .schemas import CommentOut
    out_comment = CommentOut.from_orm(comment)
    out_comment.likes = comment.liked_by.count()
    # Compose user display name: prefer first + last, fall back to email
    user = comment.user
    if user:
        if user.first_name or user.last_name:
            out_comment.user_name = f"{user.first_name or ''} {user.last_name or ''}".strip()
        else:
            out_comment.user_name = user.email
    return out_comment


async def create_item(
    db: Session,
    name: str,
    brand: Optional[str],
    color: Optional[str],
    description: Optional[str],
    price: Optional[float],
    category: Optional[str],
    article: Optional[str],
    size: Optional[str],
    style: Optional[str],
    collection: Optional[str],
    images: Optional[List[UploadFile]],
    image_url: Optional[str],
):
    primary_image_url: Optional[str] = None
    image_urls: List[str] = []

    if images:
        for idx, upload in enumerate(images):
            url = _save_upload_file(upload)
            image_urls.append(url)
            if idx == 0:
                primary_image_url = url

    if not primary_image_url and image_url:
        primary_image_url = image_url

    db_item = Item(
        name=name,
        brand=brand,
        color=color,
        image_url=primary_image_url,
        description=description,
        price=price,
        category=category,
        article=article,
        size=size,
        style=style,
        collection=collection,
    )

    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    for position, url in enumerate(image_urls):
        db.add(ItemImage(item_id=db_item.id, image_url=url, position=position))
    db.commit()
    db.refresh(db_item)

    return db_item


def list_items(db: Session, filters: dict, skip: int = 0, limit: int = 100, user_id: Optional[int] = None):
    query = db.query(Item)

    # Dynamically add favorite status if user is logged in
    if user_id:
        # Alias the user_favorite_items table to avoid ambiguity if it's used elsewhere
        favorite_items_alias = user_favorite_items.alias("favorite_items")
        query = query.add_columns(
            func.coalesce(favorite_items_alias.c.item_id.isnot(None), False).label("is_favorite")
        ).outerjoin(
            favorite_items_alias,
            and_(
                favorite_items_alias.c.item_id == Item.id,
                favorite_items_alias.c.user_id == user_id,
            ),
        )

    # Apply filters from the dictionary
    if q := filters.get("q"):
        query = query.filter(
            or_(
                Item.name.ilike(f"%{q}%"),
                Item.description.ilike(f"%{q}%"),
                Item.brand.ilike(f"%{q}%"),
            )
        )
    if category := filters.get("category"):
        query = query.filter(Item.category.ilike(f"%{category}%"))
    if style := filters.get("style"):
        query = query.filter(Item.style.ilike(f"%{style}%"))
    if collection := filters.get("collection"):
        query = query.filter(Item.collection.ilike(f"%{collection}%"))
    if min_price := filters.get("min_price"):
        query = query.filter(Item.price >= min_price)
    if max_price := filters.get("max_price"):
        query = query.filter(Item.price <= max_price)
    if size := filters.get("size"):
        query = query.filter(Item.size.ilike(f"%{size}%"))
    if clothing_type := filters.get("clothing_type"):
        query = query.filter(Item.clothing_type.ilike(f"%{clothing_type}%"))

    # Apply sorting
    if sort_by := filters.get("sort_by"):
        if sort_by == "price_asc":
            query = query.order_by(Item.price.asc())
        elif sort_by == "price_desc":
            query = query.order_by(Item.price.desc())
        elif sort_by == "newest":
            query = query.order_by(Item.created_at.desc())

    # Paginate and format results
    paginated_results = query.offset(skip).limit(limit).all()

    if user_id:
        # If user is logged in, result is a tuple (Item, is_favorite)
        items = []
        for item, is_favorite in paginated_results:
            item.is_favorite = is_favorite
            items.append(item)
        return items
    else:
        # If user is a guest, result is just the Item object
        return paginated_results


def get_item(db: Session, item_id: int, current_user: Optional[User] = None):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    if current_user:
        view = (
            db.query(UserView)
            .filter(UserView.user_id == current_user.id, UserView.item_id == item_id)
            .first()
        )
        if view:
            view.viewed_at = func.now()
        else:
            db.add(UserView(user_id=current_user.id, item_id=item_id))
        db.commit()
    return item


def update_item(db: Session, item_id: int, item_in: ItemUpdate):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    update_data = item_in.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def delete_item(db: Session, item_id: int):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    # The associations to outfits are now handled by the OutfitItem model,
    # which has a CASCADE delete relationship from the Item.
    # The old manual deletion code below was for a previous schema and has been removed.

    # Remove images
    for img in item.images:
        _remove_upload_file(img.image_url)
        db.delete(img)

    db.delete(item)
    db.commit()


def trending_items(db: Session, limit: int = 20):
    sub = (
        db.query(user_favorite_items.c.item_id, func.count(user_favorite_items.c.user_id).label("likes"))
        .group_by(user_favorite_items.c.item_id)
        .subquery()
    )
    query = (
        db.query(Item)
        .join(sub, Item.id == sub.c.item_id)
        .order_by(desc("likes"))
        .limit(limit)
    )
    return query.all()


def items_by_collection(db: Session, name: str):
    items = db.query(Item).filter(Item.collection == name).all()
    return [ItemOut.from_orm(i) for i in items]


def list_favorite_items(db: Session, user: User):
    return user.favorites.all()


def viewed_items(db: Session, user: User, limit: int = 50):
    views = (
        db.query(UserView)
        .filter(UserView.user_id == user.id)
        .order_by(desc(UserView.viewed_at))
        .limit(limit)
        .all()
    )
    item_ids = [v.item_id for v in views]
    if not item_ids:
        return []
    return db.query(Item).filter(Item.id.in_(item_ids)).all()


def clear_view_history(db: Session, user: User):
    db.query(UserView).filter(UserView.user_id == user.id).delete()
    db.commit()


def similar_items(db: Session, item_id: int, limit: int = 10):
    target = db.get(Item, item_id)
    if not target:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    query = db.query(Item).filter(Item.id != item_id)
    if target.category:
        query = query.filter(Item.category == target.category)
    if target.style:
        query = query.filter(Item.style == target.style)

    return query.limit(limit).all()


def toggle_favorite_item(db: Session, user: User, item_id: int):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    
    fav = user.favorites.filter(user_favorite_items.c.item_id == item_id).first()

    if fav:
        user.favorites.remove(fav)
        message = "Removed from favorites"
    else:
        user.favorites.append(item)
        message = "Added to favorites"
    
    db.commit()
    return {"detail": message}


def add_item_comment(db: Session, user: User, item_id: int, payload: CommentCreate):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    comment = Comment(**payload.dict(), user_id=user.id, item_id=item_id)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _comment_with_likes(comment)


def list_item_comments(db: Session, item_id: int):
    comments = db.query(Comment).filter(Comment.item_id == item_id).all()
    return [_comment_with_likes(c) for c in comments]


def like_comment(db: Session, user: User, comment_id: int):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    
    # Check if the user has already liked the comment
    like_exists = comment.liked_by.filter_by(id=user.id).first()

    if like_exists:
        comment.liked_by.remove(like_exists)
        message = "Comment unliked"
    else:
        comment.liked_by.append(user)
        message = "Comment liked"
    
    db.commit()
    return {"detail": message}


def delete_item_comment(db: Session, user: User, comment_id: int):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Comment not found")
    
    from app.core.security import is_admin
    if comment.user_id != user.id and not is_admin(user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")
        
    db.delete(comment)
    db.commit()


def list_variants(db: Session, item_id: int):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")
    return item.variants


def create_variant(db: Session, item_id: int, payload: VariantCreate):
    item = db.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Item not found")

    variant = ItemVariant(**payload.dict(), item_id=item_id)
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant


def update_variant(db: Session, variant_id: int, payload: VariantUpdate):
    variant = db.get(ItemVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")
    
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(variant, key, value)
        
    db.add(variant)
    db.commit()
    db.refresh(variant)
    return variant


def delete_variant(db: Session, variant_id: int):
    variant = db.get(ItemVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Variant not found")
    db.delete(variant)
    db.commit()


# ---------------- Images ----------------


def list_item_images(db: Session, item_id: int):
    from app.db.models.item_image import ItemImage
    images = db.query(ItemImage).filter(ItemImage.item_id == item_id).order_by(ItemImage.position).all()
    return images


def delete_item_image(db: Session, item_id: int, image_id: int):
    from app.db.models.item_image import ItemImage
    img = db.get(ItemImage, image_id)
    if not img or img.item_id != item_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Image not found")

    # Remove physical file if stored locally (uploads path)
    _remove_upload_file(img.image_url)

    # If this image was primary image, clear item.image_url
    item = db.get(Item, item_id)
    if item and item.image_url == img.image_url:
        item.image_url = None
        db.add(item)

    db.delete(img)
    db.commit()

    # Return nothing (204)


# ---------- Collections names ----------

def list_collections(db: Session):
    """Return distinct collection names present in items."""
    names = (
        db.query(Item.collection)
        .filter(Item.collection.isnot(None))
        .distinct()
        .order_by(Item.collection)
        .all()
    )
    return [n[0] for n in names] 