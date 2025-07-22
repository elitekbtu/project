from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query, UploadFile, File, Form, Request, Response
import json
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import require_admin, get_current_user_optional, get_current_user
from app.core.security import require_admin_or_moderator
from app.core.rate_limiting import limiter, RATE_LIMITS
from app.db.models.user import User
from . import service
from .schemas import ItemOut, ItemUpdate, VariantOut, VariantCreate, VariantUpdate, CommentOut, CommentCreate, ItemImageOut

router = APIRouter(prefix="/items", tags=["Items"])


@router.post("/", response_model=ItemOut, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMITS["upload"])
async def create_item(
    request: Request,
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
    current_user: User = Depends(require_admin_or_moderator),
):
    return await service.create_item(
        db,
        name,
        brand,
        color,
        description,
        price,
        category,
        article,
        size,
        style,
        collection,
        images,
        image_url,
        current_user,
    )


@router.get("/", response_model=List[ItemOut])
@limiter.limit(RATE_LIMITS["api"])
def list_items(
    request: Request,
    page: int = Query(1, ge=1),
    q: Optional[str] = None,
    category: Optional[str] = None,
    style: Optional[str] = None,
    collection: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    size: Optional[str] = None,
    sort_by: Optional[str] = None,
    clothing_type: Optional[str] = None,
    moderator_id: Optional[int] = None,
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
        "moderator_id": moderator_id,
    }
    from app.core.pagination import get_pagination
    skip, limit = get_pagination(page)
    items = service.list_items(db, filters, skip, limit, user.id if user else None, user)
    
    # Add total count header for pagination
    total_count = service.get_items_count(db, filters, user)
    
    # Convert items to dict format
    items_dict = []
    for item in items:
        item_dict = {
            "id": item.id,
            "name": item.name,
            "brand": item.brand,
            "color": item.color,
            "image_url": item.image_url,
            "description": item.description,
            "price": item.price,
            "category": item.category,
            "article": item.article,
            "size": item.size,
            "style": item.style,
            "collection": item.collection,
            "created_at": item.created_at.isoformat() if item.created_at else None,
            "updated_at": item.updated_at.isoformat() if item.updated_at else None,
            "images": [{"id": img.id, "url": img.image_url, "position": img.position} for img in item.images] if hasattr(item, 'images') else [],
            "image_urls": [img.image_url for img in item.images] if hasattr(item, 'images') and item.images else [],
            "variants": [
                {
                    "id": var.id,
                    "size": var.size,
                    "color": var.color,
                    "sku": var.sku,
                    "stock": var.stock,
                    "price": var.price
                } for var in item.variants
            ] if hasattr(item, 'variants') and item.variants else [],
            "is_favorite": getattr(item, 'is_favorite', False)
        }
        items_dict.append(item_dict)
    
    response = Response(content=json.dumps(items_dict), media_type="application/json")
    response.headers["X-Total-Count"] = str(total_count)
    return response


@router.get("/trending", response_model=List[ItemOut])
@limiter.limit(RATE_LIMITS["api"])
def trending_items(request: Request, limit: int = 20, db: Session = Depends(get_db)):
    return service.trending_items(db, limit)


@router.get("/collections", response_model=List[ItemOut])
@limiter.limit(RATE_LIMITS["api"])
def items_by_collection(request: Request, name: str, db: Session = Depends(get_db)):
    return service.items_by_collection(db, name)


@router.get("/collections/names", response_model=List[str])
@limiter.limit(RATE_LIMITS["api"])
def list_collections(request: Request, db: Session = Depends(get_db)):
    """Return distinct collection names (non-null) from items."""
    return service.list_collections(db)


@router.get("/favorites", response_model=List[ItemOut])
@limiter.limit(RATE_LIMITS["api"])
def list_favorite_items(
    request: Request,
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.core.pagination import get_pagination
    skip, limit = get_pagination(page)
    return service.list_favorite_items(db, user, skip, limit)


@router.get("/history", response_model=List[ItemOut])
@limiter.limit(RATE_LIMITS["api"])
def viewed_items(
    request: Request,
    page: int = Query(1, ge=1),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from app.core.pagination import get_pagination
    skip, limit = get_pagination(page)
    return service.viewed_items(db, user, skip, limit)


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_LIMITS["api"])
def clear_view_history(request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.clear_view_history(db, user)


@router.get("/{item_id}", response_model=ItemOut)
@limiter.limit(RATE_LIMITS["api"])
def get_item(request: Request, item_id: int, db: Session = Depends(get_db), current: Optional[User] = Depends(get_current_user_optional)):
    return service.get_item(db, item_id, current)


@router.put("/{item_id}", response_model=ItemOut, dependencies=[Depends(require_admin)])
@limiter.limit(RATE_LIMITS["api"])
def update_item(request: Request, item_id: int, item_in: ItemUpdate, db: Session = Depends(get_db)):
    return service.update_item(db, item_id, item_in)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_LIMITS["api"])
def delete_item(
    request: Request,
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_moderator),
):
    return service.delete_item(db, item_id, current_user)


@router.get("/{item_id}/similar", response_model=List[ItemOut])
@limiter.limit(RATE_LIMITS["api"])
def similar_items(request: Request, item_id: int, limit: int = 10, db: Session = Depends(get_db)):
    return service.similar_items(db, item_id, limit)


@router.post("/{item_id}/favorite", status_code=status.HTTP_200_OK)
@limiter.limit(RATE_LIMITS["api"])
def toggle_favorite_item(request: Request, item_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.toggle_favorite_item(db, user, item_id)


@router.post("/{item_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
@limiter.limit(RATE_LIMITS["api"])
def add_item_comment(request: Request, item_id: int, payload: CommentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.add_item_comment(db, user, item_id, payload)


@router.get("/{item_id}/comments", response_model=List[CommentOut])
@limiter.limit(RATE_LIMITS["api"])
def list_item_comments(request: Request, item_id: int, db: Session = Depends(get_db)):
    return service.list_item_comments(db, item_id)


@router.post("/{item_id}/comments/{comment_id}/like", status_code=status.HTTP_200_OK)
@limiter.limit(RATE_LIMITS["api"])
def like_comment(request: Request, comment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.like_comment(db, user, comment_id)


@router.delete("/{item_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
@limiter.limit(RATE_LIMITS["api"])
def delete_item_comment(
    request: Request,
    comment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.delete_item_comment(db, user, comment_id)


@router.get("/{item_id}/variants", response_model=List[VariantOut])
@limiter.limit(RATE_LIMITS["api"])
def list_variants(request: Request, item_id: int, db: Session = Depends(get_db)):
    return service.list_variants(db, item_id)


@router.post("/{item_id}/variants", response_model=VariantOut, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_admin)])
@limiter.limit(RATE_LIMITS["api"])
def create_variant(request: Request, item_id: int, payload: VariantCreate, db: Session = Depends(get_db)):
    return service.create_variant(db, item_id, payload)


@router.put("/{item_id}/variants/{variant_id}", response_model=VariantOut, dependencies=[Depends(require_admin)])
@limiter.limit(RATE_LIMITS["api"])
def update_variant(request: Request, variant_id: int, payload: VariantUpdate, db: Session = Depends(get_db)):
    return service.update_variant(db, variant_id, payload)


@router.delete("/{item_id}/variants/{variant_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
@limiter.limit(RATE_LIMITS["api"])
def delete_variant(request: Request, variant_id: int, db: Session = Depends(get_db)):
    return service.delete_variant(db, variant_id)


# -------- Images --------


@router.get("/{item_id}/images", response_model=List[ItemImageOut])
@limiter.limit(RATE_LIMITS["api"])
def list_item_images(request: Request, item_id: int, db: Session = Depends(get_db)):
    return service.list_item_images(db, item_id)


@router.delete("/{item_id}/images/{image_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(require_admin)])
@limiter.limit(RATE_LIMITS["api"])
def delete_item_image(request: Request, item_id: int, image_id: int, db: Session = Depends(get_db)):
    return service.delete_item_image(db, item_id, image_id) 


@router.get("/moderator/analytics")
@limiter.limit(RATE_LIMITS["api"])
def get_moderator_analytics(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin_or_moderator),
):
    """Получить аналитику товаров модератора"""
    return service.get_moderator_analytics(db, current_user) 