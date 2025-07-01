from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin, get_current_user_optional, get_current_user
from app.db.models.user import User
from . import service
from .schemas import ItemOut, ItemUpdate, VariantOut, VariantCreate, VariantUpdate, CommentOut, CommentCreate, ItemImageOut

router = APIRouter(prefix="/items", tags=["Items"])


@router.post("/", response_model=ItemOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
async def create_item(
    name: str = Form(...),
    brand: Optional[str] = Form(None),
    color: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    price: Optional[float] = Form(None),
    category: Optional[str] = Form(None),
    article: Optional[str] = Form(None),
    size: Optional[str] = Form(None),
    style: Optional[str] = Form(None),
    collection: Optional[str] = Form(None),
    images: Optional[List[UploadFile]] = File(None),
    image_url: Optional[str] = Form(None),
    db: Session = Depends(get_db),
):
    return await service.create_item(
        db, name, brand, color, description, price, category, article, size, style, collection, images, image_url
    )


@router.get("/", response_model=List[ItemOut])
def list_items(
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = None,
    category: Optional[str] = None,
    style: Optional[str] = None,
    collection: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    size: Optional[str] = None,
    sort_by: Optional[str] = None,
    clothing_type: Optional[str] = None,
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional),
):
    filters = {
        "q": q,
        "category": category,
        "style": style,
        "collection": collection,
        "min_price": min_price,
        "max_price": max_price,
        "size": size,
        "sort_by": sort_by,
        "clothing_type": clothing_type,
    }
    return service.list_items(db, filters, skip, limit, user.id if user else None)


@router.get("/trending", response_model=List[ItemOut])
def trending_items(limit: int = 20, db: Session = Depends(get_db)):
    return service.trending_items(db, limit)


@router.get("/collections", response_model=List[ItemOut])
def items_by_collection(name: str, db: Session = Depends(get_db)):
    return service.items_by_collection(db, name)


@router.get("/collections/names", response_model=List[str])
def list_collections(db: Session = Depends(get_db)):
    """Return distinct collection names (non-null) from items."""
    return service.list_collections(db)


@router.get("/favorites", response_model=List[ItemOut])
def list_favorite_items(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.list_favorite_items(db, user)


@router.get("/history", response_model=List[ItemOut])
def viewed_items(limit: int = 50, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.viewed_items(db, user, limit)


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
def clear_view_history(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.clear_view_history(db, user)


@router.get("/{item_id}", response_model=ItemOut)
def get_item(item_id: int, db: Session = Depends(get_db), current: Optional[User] = Depends(get_current_user_optional)):
    return service.get_item(db, item_id, current)


@router.put("/{item_id}", response_model=ItemOut, dependencies=[Depends(require_admin)])
def update_item(item_id: int, item_in: ItemUpdate, db: Session = Depends(get_db)):
    return service.update_item(db, item_id, item_in)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_item(item_id: int, db: Session = Depends(get_db)):
    return service.delete_item(db, item_id)


@router.get("/{item_id}/similar", response_model=List[ItemOut])
def similar_items(item_id: int, limit: int = 10, db: Session = Depends(get_db)):
    return service.similar_items(db, item_id, limit)


@router.post("/{item_id}/favorite", status_code=status.HTTP_200_OK)
def toggle_favorite_item(item_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.toggle_favorite_item(db, user, item_id)


@router.post("/{item_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
def add_item_comment(item_id: int, payload: CommentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.add_item_comment(db, user, item_id, payload)


@router.get("/{item_id}/comments", response_model=List[CommentOut])
def list_item_comments(item_id: int, db: Session = Depends(get_db)):
    return service.list_item_comments(db, item_id)


@router.post("/{item_id}/comments/{comment_id}/like", status_code=status.HTTP_200_OK)
def like_comment(comment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.like_comment(db, user, comment_id)


@router.delete("/{item_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_item_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.delete_item_comment(db, user, comment_id)


@router.get("/{item_id}/variants", response_model=List[VariantOut])
def list_variants(item_id: int, db: Session = Depends(get_db)):
    return service.list_variants(db, item_id)


@router.post("/{item_id}/variants", response_model=VariantOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
def create_variant(item_id: int, payload: VariantCreate, db: Session = Depends(get_db)):
    return service.create_variant(db, item_id, payload)


@router.put("/{item_id}/variants/{variant_id}", response_model=VariantOut, dependencies=[Depends(require_admin)])
def update_variant(variant_id: int, payload: VariantUpdate, db: Session = Depends(get_db)):
    return service.update_variant(db, variant_id, payload)


@router.delete("/{item_id}/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_variant(variant_id: int, db: Session = Depends(get_db)):
    return service.delete_variant(db, variant_id)


# -------- Images --------


@router.get("/{item_id}/images", response_model=List[ItemImageOut])
def list_item_images(item_id: int, db: Session = Depends(get_db)):
    return service.list_item_images(db, item_id)


@router.delete("/{item_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
def delete_item_image(item_id: int, image_id: int, db: Session = Depends(get_db)):
    return service.delete_item_image(db, item_id, image_id) 