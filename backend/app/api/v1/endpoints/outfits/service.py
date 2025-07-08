from typing import List, Optional
from fastapi import HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func, desc
from datetime import datetime, timedelta
import re
from difflib import SequenceMatcher

from app.db.models.outfit import Outfit, OutfitItem
from app.db.models.item import Item
from app.core.security import is_admin
from app.db.models.user import User
from app.db.models.associations import user_favorite_outfits, OutfitView
from app.db.models.comment import Comment
from .schemas import OutfitCreate, OutfitUpdate, OutfitOut, OutfitCommentCreate, OutfitCommentOut, OutfitItemBase

# Упрощенная система категоризации для 5 строгих категорий образа
# Каждая категория содержит исчерпывающий список ключевых слов
SMART_CATEGORY_SYSTEM = {
    "top": {
        "keywords": {
            # Английские термины
            "top", "tops", "tshirt", "t-shirt", "shirt", "blouse", "hoodie", "sweatshirt",
            "sweater", "pullover", "cardigan", "jacket", "blazer", "coat", "vest", "tank",
            "camisole", "crop", "tunic", "dress", "gown", "polo", "jersey", "turtleneck",
            # Русские термины
            "верх", "топ", "топы", "футболка", "майка", "рубашка", "блузка", "блуза",
            "худи", "свитшот", "свитер", "пуловер", "кардиган", "жакет", "пиджак",
            "куртка", "пальто", "жилет", "платье", "туника", "кроп", "поло", "джерси",
            "водолазка", "гольф", "лонгслив", "кофта", "кофты", "джемпер", "безрукавка",
            # Дополнительные термины
            "рубашки", "блузы", "одежда для верха", "верхняя одежда", "топы женские",
            "футболки", "майки", "свитера", "кардиганы", "пиджаки", "жакеты"
        },
        "priority_keywords": {
            # Высокоприоритетные слова для категории "верх"
            "платье": 2.0, "dress": 2.0, "блузка": 1.8, "blouse": 1.8,
            "рубашка": 1.8, "shirt": 1.8, "футболка": 1.8, "t-shirt": 1.8,
            "свитер": 1.8, "sweater": 1.8, "куртка": 1.8, "jacket": 1.8
        }
    },
    "bottom": {
        "keywords": {
            # Английские термины
            "bottom", "bottoms", "pants", "trousers", "jeans", "shorts", "skirt",
            "leggings", "tights", "capri", "joggers", "chinos", "slacks", "cargo",
            # Русские термины
            "низ", "брюки", "штаны", "джинсы", "шорты", "юбка", "леггинсы",
            "легинсы", "колготки", "капри", "джоггеры", "чиносы", "слаксы",
            "карго", "треники", "спортивные штаны", "клеш", "скинни", "мом",
            # Дополнительные термины
            "юбки", "лосины", "одежда для низа", "нижняя часть", "брюки женские",
            "брюки мужские", "джинсы женские", "джинсы мужские", "штаны спортивные"
        },
        "priority_keywords": {
            "джинсы": 2.0, "jeans": 2.0, "брюки": 1.8, "pants": 1.8,
            "юбка": 1.8, "skirt": 1.8, "шорты": 1.8, "shorts": 1.8,
            "леггинсы": 1.8, "leggings": 1.8
        }
    },
    "footwear": {
        "keywords": {
            # Английские термины
            "footwear", "shoes", "sneakers", "boots", "sandals", "flats", "heels",
            "pumps", "loafers", "oxfords", "trainers", "athletics", "slippers",
            "moccasins", "espadrilles", "wedges", "stilettos", "clogs", "flip-flops",
            # Русские термины
            "обувь", "туфли", "кроссовки", "ботинки", "сандалии", "балетки",
            "каблуки", "лодочки", "лоферы", "оксфорды", "кеды", "тапочки",
            "мокасины", "эспадрильи", "слипоны", "угги", "сапоги", "ботильоны",
            "босоножки", "вьетнамки", "шлепанцы", "кроксы", "конверсы", "найки",
            # Дополнительные термины
            "спортивная обувь", "повседневная обувь", "женская обувь", "мужская обувь",
            "обувь на каблуке", "обувь без каблука", "летняя обувь", "зимняя обувь"
        },
        "priority_keywords": {
            "кроссовки": 2.0, "sneakers": 2.0, "туфли": 1.8, "shoes": 1.8,
            "ботинки": 1.8, "boots": 1.8, "сандалии": 1.8, "sandals": 1.8,
            "балетки": 1.8, "flats": 1.8, "каблуки": 1.8, "heels": 1.8
        }
    },
    "accessory": {
        "keywords": {
            # Английские термины
            "accessories", "accessory", "bag", "purse", "handbag", "backpack",
            "belt", "hat", "cap", "scarf", "gloves", "sunglasses", "watch",
            "jewelry", "necklace", "bracelet", "earrings", "ring", "wallet",
            # Русские термины
            "аксессуары", "аксессуар", "сумка", "рюкзак", "ремень", "пояс",
            "шляпа", "кепка", "шарф", "перчатки", "очки", "часы", "украшения",
            "колье", "браслет", "серьги", "кольцо", "бижутерия", "кошелек",
            "портмоне", "клатч", "тоут", "кросс-боди", "месенжер", "шоппер",
            # Дополнительные термины
            "платок", "варежки", "митенки", "бейсболка", "панама", "берет",
            "солнцезащитные очки", "сумки женские", "рюкзаки", "аксессуары женские"
        },
        "priority_keywords": {
            "сумка": 2.0, "bag": 2.0, "рюкзак": 1.8, "backpack": 1.8,
            "часы": 1.8, "watch": 1.8, "очки": 1.8, "sunglasses": 1.8,
            "ремень": 1.8, "belt": 1.8, "украшения": 1.8, "jewelry": 1.8
        }
    },
    "fragrance": {
        "keywords": {
            # Английские термины
            "fragrance", "fragrances", "perfume", "cologne", "scent", "parfum",
            "eau de toilette", "eau de parfum", "aftershave", "body spray",
            "deodorant", "antiperspirant", "mist", "essence", "elixir",
            # Русские термины
            "парфюм", "духи", "одеколон", "аромат", "парфюмерия", "туалетная вода",
            "парфюмерная вода", "после бритья", "спрей для тела", "дезодорант",
            "антиперспирант", "мист", "эссенция", "эликсир", "благовония",
            # Дополнительные термины
            "парфюмированная вода", "ароматы", "женская парфюмерия", "мужская парфюмерия",
            "унисекс парфюм", "нишевая парфюмерия", "селективная парфюмерия"
        },
        "priority_keywords": {
            "духи": 2.0, "perfume": 2.0, "парфюм": 1.8, "fragrance": 1.8,
            "одеколон": 1.8, "cologne": 1.8, "туалетная вода": 1.8, "eau de toilette": 1.8
        }
    }
}

def _calculate_category_match_score(item_text: str, category_data: dict) -> float:
    """
    Вычисляет точность соответствия товара категории
    """
    if not item_text:
        return 0.0
    
    item_text_lower = item_text.lower()
    max_score = 0.0
    
    # Проверяем приоритетные ключевые слова
    for priority_word, weight in category_data["priority_keywords"].items():
        if priority_word.lower() in item_text_lower:
            max_score = max(max_score, weight)
    
    # Проверяем обычные ключевые слова
    for keyword in category_data["keywords"]:
        keyword_lower = keyword.lower()
        
        # Точное совпадение
        if keyword_lower in item_text_lower:
            base_score = 1.5 if len(keyword_lower) > 6 else 1.0
            max_score = max(max_score, base_score)
            continue
        
        # Нечеткое совпадение для длинных слов
        if len(keyword_lower) >= 5:
            for word in item_text_lower.split():
                if len(word) >= 4:
                    similarity = SequenceMatcher(None, keyword_lower, word).ratio()
                    if similarity > 0.8:
                        max_score = max(max_score, similarity * 0.8)
    
    return max_score

def _smart_determine_category(item: Item) -> str:
    """
    Умно определяет категорию товара из 5 возможных
    """
    # Собираем всю текстовую информацию о товаре
    item_texts = []
    if item.name:
        item_texts.append(item.name)
    if item.category:
        item_texts.append(item.category)
    if item.clothing_type:
        item_texts.append(item.clothing_type)
    if item.description:
        item_texts.append(item.description[:200])  # Ограничиваем описание
    
    combined_text = " ".join(item_texts)
    
    # Вычисляем баллы для каждой категории
    category_scores = {}
    for category_name, category_data in SMART_CATEGORY_SYSTEM.items():
        score = _calculate_category_match_score(combined_text, category_data)
        category_scores[category_name] = score
    
    # Находим категорию с максимальным баллом
    best_category = max(category_scores.items(), key=lambda x: x[1])
    
    # Если лучший балл слишком низкий, возвращаем None
    if best_category[1] < 0.3:
        return None
    
    return best_category[0]

def _validate_and_categorize_items(db: Session, item_ids: List[int], expected_category: str) -> List[Item]:
    """
    Проверяет товары и автоматически определяет их категории
    """
    if not item_ids:
        return []
    
    items = db.query(Item).filter(Item.id.in_(item_ids)).all()
    if len(items) != len(item_ids):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more items not found")
    
    validated_items = []
    warnings = []
    
    for item in items:
        # Определяем категорию товара
        detected_category = _smart_determine_category(item)
        
        # Если категория определена и совпадает с ожидаемой - отлично
        if detected_category == expected_category:
            validated_items.append(item)
        # Если категория не определена или не совпадает - добавляем с предупреждением
        else:
            validated_items.append(item)
            if detected_category:
                warnings.append(
                    f"Item '{item.name}' (ID: {item.id}) seems to be '{detected_category}' "
                    f"but was placed in '{expected_category}' category"
                )
            else:
                warnings.append(
                    f"Item '{item.name}' (ID: {item.id}) category could not be determined automatically"
                )
    
    # Логируем предупреждения
    if warnings:
        print("Category validation warnings:", warnings)
    
    return validated_items

def _check_owner_or_admin(outfit: Outfit, user: Optional[User]):
    if not user or (outfit.owner_id != str(user.id) and not is_admin(user)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized")

def _calculate_outfit_price(outfit: Outfit) -> OutfitOut:
    """
    Вычисляет общую стоимость образа и возвращает OutfitOut
    """
    categorized_items = outfit.items

    all_items = [item for sublist in categorized_items.values() for item in sublist]
    total_price = sum(item.price for item in all_items if item.price is not None)

    return OutfitOut(
        id=outfit.id,
        name=outfit.name,
        style=outfit.style,
        description=outfit.description,
        owner_id=outfit.owner_id,
        created_at=outfit.created_at,
        updated_at=outfit.updated_at,
        tops=categorized_items.get("tops", []),
        bottoms=categorized_items.get("bottoms", []),
        footwear=categorized_items.get("footwear", []),
        accessories=categorized_items.get("accessories", []),
        fragrances=categorized_items.get("fragrances", []),
        total_price=total_price,
        tryon_image_url=getattr(outfit, "tryon_image_url", None)
    )

def _price_in_range(price: Optional[float], min_price: Optional[float], max_price: Optional[float]) -> bool:
    if price is None:
        return not min_price and not max_price
    if min_price is not None and price < min_price:
        return False
    if max_price is not None and price > max_price:
        return False
    return True


def create_outfit(db: Session, user: User, outfit_in: OutfitCreate, tryon_image_url: str = None):
    """
    Создаёт образ с умной категоризацией товаров и сохраняет tryon_image_url, если передан
    """
    db_outfit = Outfit(
        name=outfit_in.name,
        style=outfit_in.style,
        description=outfit_in.description,
        owner_id=str(user.id),
    )

    if tryon_image_url:
        db_outfit.tryon_image_url = tryon_image_url

    # Обрабатываем каждую категорию товаров
    category_mapping = {
        "top_ids": "top",
        "bottom_ids": "bottom", 
        "footwear_ids": "footwear",
        "accessories_ids": "accessory",
        "fragrances_ids": "fragrance"
    }

    for field_name, category_name in category_mapping.items():
        item_ids = getattr(outfit_in, field_name)
        if item_ids:
            # Валидируем товары и определяем их реальные категории
            items = _validate_and_categorize_items(db, item_ids, category_name)
            for item in items:
                outfit_item = OutfitItem(item_category=category_name, item=item)
                db_outfit.outfit_items.append(outfit_item)

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

    # Обновляем основные поля
    for field in ["name", "style", "description"]:
        if field in update_data:
            setattr(outfit, field, update_data[field])

    # Обновляем товары по категориям
    category_mapping = {
        "top_ids": "top",
        "bottom_ids": "bottom",
        "footwear_ids": "footwear", 
        "accessories_ids": "accessory",
        "fragrances_ids": "fragrance"
    }
    
    for field_name, category_name in category_mapping.items():
        if field_name in update_data:
            # Удаляем существующие товары этой категории
            outfit.outfit_items = [oi for oi in outfit.outfit_items if oi.item_category != category_name]

            # Добавляем новые товары
            item_ids = update_data[field_name]
            if item_ids:
                items = _validate_and_categorize_items(db, item_ids, category_name)
                for item in items:
                    outfit.outfit_items.append(OutfitItem(item_category=category_name, item=item))

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