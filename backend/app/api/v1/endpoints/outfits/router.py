from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session
import os
import logging

from app.core.database import get_db
from app.core.security import get_current_user, get_current_user_optional, require_admin
from app.core.config import get_settings
from app.db.models.user import User
from app.db.models.item import Item

from . import service
from .schemas import OutfitCreate, OutfitUpdate, OutfitOut, OutfitCommentCreate, OutfitCommentOut, VirtualTryOnRequest, VirtualTryOnResponse
from .service import _smart_determine_category, _calculate_category_match_score, SMART_CATEGORY_SYSTEM
from app.services.virtual_tryon import virtual_tryon_service

router = APIRouter(prefix="/outfits", tags=["Outfits"])

settings = get_settings()
logger = logging.getLogger(__name__)


@router.post("/", response_model=OutfitOut, status_code=status.HTTP_201_CREATED)
def create_outfit(outfit_in: OutfitCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.create_outfit(db, user, outfit_in)


@router.get("/", response_model=List[OutfitOut])
def list_outfits(
    skip: int = 0,
    limit: int = 100,
    q: Optional[str] = Query(None),
    style: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    sort_by: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user: Optional[User] = Depends(get_current_user_optional)
):
    return service.list_outfits(db, user, skip, limit, q, style, min_price, max_price, sort_by)


@router.get("/favorites", response_model=List[OutfitOut])
def list_favorite_outfits(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.list_favorite_outfits(db, user)


@router.get("/history", response_model=List[OutfitOut])
def viewed_outfits(limit: int = 50, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.viewed_outfits(db, user, limit)


@router.delete("/history", status_code=status.HTTP_204_NO_CONTENT)
def clear_outfit_view_history(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.clear_outfit_view_history(db, user)


@router.get("/trending", response_model=List[OutfitOut])
def trending_outfits(limit: int = 20, db: Session = Depends(get_db)):
    return service.trending_outfits(db, limit)


@router.get("/{outfit_id}", response_model=OutfitOut)
def get_outfit(outfit_id: int, db: Session = Depends(get_db), user: Optional[User] = Depends(get_current_user_optional)):
    return service.get_outfit(db, outfit_id, user)


@router.put("/{outfit_id}", response_model=OutfitOut)
def update_outfit(
    outfit_id: int,
    outfit_in: OutfitUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.update_outfit(db, user, outfit_id, outfit_in)


@router.delete("/{outfit_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_outfit(outfit_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.delete_outfit(db, user, outfit_id)


@router.post("/{outfit_id}/favorite", status_code=status.HTTP_200_OK)
def toggle_favorite_outfit(outfit_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.toggle_favorite_outfit(db, user, outfit_id)


@router.post("/{outfit_id}/comments", response_model=OutfitCommentOut, status_code=status.HTTP_201_CREATED)
def add_outfit_comment(outfit_id: int, payload: OutfitCommentCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.add_outfit_comment(db, user, outfit_id, payload)


@router.get("/{outfit_id}/comments", response_model=List[OutfitCommentOut])
def list_outfit_comments(outfit_id: int, db: Session = Depends(get_db)):
    return service.list_outfit_comments(db, outfit_id)


@router.post("/{outfit_id}/comments/{comment_id}/like", status_code=status.HTTP_200_OK)
def like_outfit_comment(comment_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return service.like_outfit_comment(db, user, comment_id)


@router.delete("/{outfit_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_outfit_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return service.delete_outfit_comment(db, user, comment_id)


@router.post("/analyze-item/{item_id}", dependencies=[Depends(require_admin)])
async def analyze_item_categorization(
    item_id: int,
    db: Session = Depends(get_db)
):
    """
    Анализ умной категоризации товара.
    Показывает как система определяет одну точную категорию из 5 возможных.
    """
    item = db.query(Item).filter(Item.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    item_texts = []
    if item.name:
        item_texts.append(f"Name: {item.name}")
    if item.category:
        item_texts.append(f"Category: {item.category}")
    if item.clothing_type:
        item_texts.append(f"Clothing Type: {item.clothing_type}")
    if item.description:
        item_texts.append(f"Description: {item.description[:100]}...")
    
    combined_text = " ".join([item.name or "", item.category or "", item.clothing_type or "", item.description[:200] if item.description else ""])
    
    # Анализируем соответствие каждой из 5 категорий
    category_analysis = {}
    for category_name, category_data in SMART_CATEGORY_SYSTEM.items():
        score = _calculate_category_match_score(combined_text, category_data)
        category_analysis[category_name] = {
            "score": round(score, 3),
            "suitable": score >= 0.6,
            "keywords_matched": []
        }
        
        item_text_lower = combined_text.lower()
        for keyword in category_data["keywords"]:
            if keyword.lower() in item_text_lower:
                category_analysis[category_name]["keywords_matched"].append(keyword)
        
        # Проверяем приоритетные ключевые слова
        for priority_word in category_data["priority_keywords"]:
            if priority_word.lower() in item_text_lower:
                if priority_word not in category_analysis[category_name]["keywords_matched"]:
                    category_analysis[category_name]["keywords_matched"].append(f"{priority_word} (приоритет)")
    
    # Определяем лучшую категорию
    detected_category = _smart_determine_category(item)
    best_category = max(category_analysis.items(), key=lambda x: x[1]["score"])
    
    return {
        "item_id": item.id,
        "item_data": {
            "name": item.name,
            "category": item.category,
            "clothing_type": item.clothing_type,
            "brand": item.brand,
            "description": item.description[:200] + "..." if item.description and len(item.description) > 200 else item.description
        },
        "text_analysis": item_texts,
        "category_scores": category_analysis,
        "detected_category": detected_category,
        "best_category": best_category[0],
        "confidence_score": round(best_category[1], 3),
        "recommendations": {
            "category_decision": detected_category if detected_category else "Неопределенная категория",
            "confidence_level": "high" if best_category[1] > 1.5 else "medium" if best_category[1] > 0.8 else "low" if best_category[1] > 0.3 else "very_low",
            "needs_manual_review": detected_category is None,
            "explanation": f"Товар определен как '{detected_category}' с уверенностью {round(best_category[1], 2)}" if detected_category else "Категория не может быть автоматически определена"
        }
    }


@router.post("/batch-analyze", dependencies=[Depends(require_admin)])
async def batch_analyze_items(
    limit: int = Query(100, description="Количество товаров для анализа"),
    category_filter: Optional[str] = Query(None, description="Фильтр по категории"),
    db: Session = Depends(get_db)
):
    """
    Массовый анализ умной категоризации товаров.
    Показывает статистику по определению точных категорий образа.
    """
    query = db.query(Item)
    if category_filter:
        query = query.filter(Item.category.ilike(f"%{category_filter}%"))
    
    items = query.limit(limit).all()
    
    analysis_results = {
        "total_analyzed": len(items),
        "categorization_stats": {
            "successfully_categorized": 0,
            "needs_review": 0,
            "high_confidence": 0,
            "medium_confidence": 0,
            "low_confidence": 0,
            "very_low_confidence": 0
        },
        "category_distribution": {
            "top": 0,
            "bottom": 0,
            "footwear": 0,
            "accessory": 0,
            "fragrance": 0,
            "undefined": 0
        },
        "problematic_items": [],
        "confidence_breakdown": {
            "high_confidence_samples": [],
            "low_confidence_samples": []
        }
    }
    
    for item in items:
        detected_category = _smart_determine_category(item)
        
        if detected_category:
            analysis_results["categorization_stats"]["successfully_categorized"] += 1
            analysis_results["category_distribution"][detected_category] += 1
            
            # Определяем уровень уверенности
            combined_text = " ".join([item.name or "", item.category or "", item.clothing_type or "", item.description[:200] if item.description else ""])
            max_score = 0
            for category_name, category_data in SMART_CATEGORY_SYSTEM.items():
                score = _calculate_category_match_score(combined_text, category_data)
                max_score = max(max_score, score)
            
            if max_score > 1.5:
                analysis_results["categorization_stats"]["high_confidence"] += 1
                if len(analysis_results["confidence_breakdown"]["high_confidence_samples"]) < 5:
                    analysis_results["confidence_breakdown"]["high_confidence_samples"].append({
                        "id": item.id,
                        "name": item.name,
                        "detected_category": detected_category,
                        "confidence": round(max_score, 2)
                    })
            elif max_score > 0.8:
                analysis_results["categorization_stats"]["medium_confidence"] += 1
            elif max_score > 0.3:
                analysis_results["categorization_stats"]["low_confidence"] += 1
                if len(analysis_results["confidence_breakdown"]["low_confidence_samples"]) < 5:
                    analysis_results["confidence_breakdown"]["low_confidence_samples"].append({
                        "id": item.id,
                        "name": item.name,
                        "detected_category": detected_category,
                        "confidence": round(max_score, 2),
                        "original_category": item.category
                    })
            else:
                analysis_results["categorization_stats"]["very_low_confidence"] += 1
        else:
            analysis_results["categorization_stats"]["needs_review"] += 1
            analysis_results["category_distribution"]["undefined"] += 1
            analysis_results["problematic_items"].append({
                "id": item.id,
                "name": item.name,
                "original_category": item.category,
                "clothing_type": item.clothing_type,
                "reason": "Категория не может быть автоматически определена"
            })
    
    # Ограничиваем список проблемных товаров
    analysis_results["problematic_items"] = analysis_results["problematic_items"][:20]
    
    # Добавляем процентные соотношения
    total = analysis_results["total_analyzed"]
    analysis_results["success_rate"] = round((analysis_results["categorization_stats"]["successfully_categorized"] / total) * 100, 1) if total > 0 else 0
    analysis_results["high_confidence_rate"] = round((analysis_results["categorization_stats"]["high_confidence"] / total) * 100, 1) if total > 0 else 0
    
    return analysis_results


@router.post("/virtual-tryon", response_model=VirtualTryOnResponse)
async def generate_virtual_tryon(
    request: VirtualTryOnRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user)
):
    """
    Генерирует виртуальную примерку образа на основе фотографии пользователя и выбранных элементов одежды.
    Применяет по одному предмету из каждой категории для создания полного образа.
    """
    try:
        # Логируем информацию о запросе
        category_counts = {}
        for item in request.outfit_items:
            category = item.get('category', 'unknown')
            category_counts[category] = category_counts.get(category, 0) + 1
        
        logger.info(f"🎯 Запрос виртуальной примерки от пользователя {user.id}")
        logger.info(f"📊 Предметы по категориям: {category_counts}")
        logger.info(f"📸 Исходное изображение: {request.human_image_url}")
        
        result_image_url = await virtual_tryon_service.generate_virtual_tryon_outfit(
            human_image_url=request.human_image_url,
            outfit_items=request.outfit_items,
            user_measurements=request.user_measurements
        )
        
        # Формируем сообщение с информацией о примененных предметах
        applied_categories = set()
        for item in request.outfit_items:
            if item.get('category') in ['top', 'bottom', 'footwear', 'accessory']:
                applied_categories.add(item.get('category'))
        
        category_names = {
            'top': 'верх',
            'bottom': 'низ', 
            'footwear': 'обувь',
            'accessory': 'аксессуары'
        }
        
        applied_names = [category_names.get(cat, cat) for cat in applied_categories]
        message = f"Образ собран из {len(applied_categories)} категорий: {', '.join(applied_names)}"
        
        return VirtualTryOnResponse(
            result_image_url=result_image_url,
            success=True,
            message=message
        )
        
    except Exception as e:
        logger.error(f"❌ Ошибка виртуальной примерки: {e}")
        return VirtualTryOnResponse(
            result_image_url=request.human_image_url,
            success=False,
            message=f"Ошибка при генерации виртуальной примерки: {str(e)}"
        )


