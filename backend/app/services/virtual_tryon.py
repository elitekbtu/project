import replicate
import asyncio
import httpx
from typing import List, Dict, Any, Optional
from pathlib import Path
import os
import logging

from app.core.config import get_settings

logger = logging.getLogger(__name__)

settings = get_settings()

class VirtualTryOnService:
    """Сервис для виртуальной примерки одежды с использованием replicate API"""
    
    def __init__(self):
        self.replicate_api_key = os.getenv("REPLICATE_API_TOKEN")
        self.model_id = "cuuupid/idm-vton:0513734a452173b8173e907e3a59d19a36266e55b48528559432bd21c7d7e985"
        self.fallback_model_id = "cuuupid/idm-vton:latest"
        self.output_path = Path("uploads/virtual_tryon")
        self.output_path.mkdir(parents=True, exist_ok=True)
        
        if not self.replicate_api_key:
            logger.warning("REPLICATE_API_TOKEN не установлен. Виртуальная примерка будет недоступна.")
        elif self.replicate_api_key == "r8_test_token":
            logger.warning("Используется тестовый REPLICATE_API_TOKEN. Виртуальная примерка будет недоступна.")
            self.replicate_api_key = None
    
    async def generate_virtual_tryon_outfit(
        self,
        human_image_url: str,
        outfit_items: List[Dict[str, Any]],
        user_measurements: Optional[Dict[str, float]] = None
    ) -> str:
        """
        Генерирует виртуальную примерку образа, циклично применяя каждый элемент одежды
        
        Args:
            human_image_url: URL фотографии человека
            outfit_items: Список элементов одежды с их данными
            user_measurements: Параметры пользователя
            
        Returns:
            URL итогового изображения с виртуальной примеркой
        """
        
        if not self.replicate_api_key:
            logger.warning("Replicate API недоступен, возвращаю исходное изображение")
            return human_image_url
        
        try:
            logger.info(f"🎯 Начинаю виртуальную примерку для {len(outfit_items)} элементов")
            
            # Сортируем элементы по порядку нанесения (снизу вверх)
            ordered_items = self._sort_items_by_layer_order(outfit_items)
            
            current_image = human_image_url
            
            # Циклично применяем каждый элемент одежды
            for i, item in enumerate(ordered_items):
                logger.info(f"🔄 Применяю элемент {i+1}/{len(ordered_items)}: {item['name']} ({item['category']})")
                
                try:
                    # Применяем виртуальную примерку для текущего элемента
                    current_image = await self._apply_single_garment(
                        human_image=current_image,
                        garment_item=item,
                        step_number=i+1,
                        total_steps=len(ordered_items)
                    )
                    
                    # Небольшая задержка между запросами
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    logger.error(f"❌ Ошибка при применении элемента {item['name']}: {e}")
                    # Продолжаем с текущим изображением
                    continue
            
            logger.info(f"✅ Виртуальная примерка завершена: {current_image}")
            return current_image
            
        except Exception as e:
            logger.error(f"❌ Критическая ошибка виртуальной примерки: {e}")
            return human_image_url
    
    def _sort_items_by_layer_order(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Сортирует элементы по порядку нанесения (снизу вверх)"""
        
        # Приоритет категорий (чем меньше число, тем раньше применяется)
        category_priority = {
            "bottom": 1,    # Сначала низ
            "top": 2,       # Потом верх
            "footwear": 3,  # Обувь
            "accessory": 4, # Аксессуары
            "fragrance": 5  # Ароматы (не применяются в примерке)
        }
        
        # Фильтруем элементы, для которых есть изображения и которые можно примерить
        wearable_items = []
        for item in items:
            if (item.get("image_url") and 
                item.get("category") in category_priority and 
                item.get("category") != "fragrance"):  # Ароматы не примеряем
                wearable_items.append(item)
        
        # Сортируем по приоритету категории
        return sorted(wearable_items, key=lambda x: category_priority.get(x.get("category", ""), 999))
    
    async def _apply_single_garment(
        self,
        human_image: str,
        garment_item: Dict[str, Any],
        step_number: int,
        total_steps: int
    ) -> str:
        """Применяет одну вещь к изображению человека"""
        
        try:
            # Определяем категорию для replicate API
            category = self._map_category_to_replicate(garment_item.get("category"))
            
            # Создаем описание вещи
            garment_description = self._create_garment_description(garment_item)
            
            # Параметры для replicate API
            input_params = {
                "human_img": human_image,
                "garm_img": garment_item["image_url"],
                "garment_des": garment_description,
                "category": category,
                "crop": True,  # Используем кроппинг для лучшего результата
                "steps": 30,   # Количество шагов генерации
                "seed": 42,    # Фиксированный seed для воспроизводимости
                "force_dc": category == "dresses"  # Используем DressCode для платьев
            }
            
            logger.info(f"📝 Параметры для replicate: {input_params}")
            
            # Выполняем запрос к replicate API
            output = await self._run_replicate_async(input_params)
            
            # Сохраняем результат
            result_url = await self._save_replicate_output(output, step_number, garment_item)
            
            logger.info(f"✅ Шаг {step_number}/{total_steps} завершен: {result_url}")
            return result_url
            
        except Exception as e:
            logger.error(f"❌ Ошибка применения вещи {garment_item.get('name', 'Unknown')}: {e}")
            return human_image  # Возвращаем исходное изображение при ошибке
    
    def _map_category_to_replicate(self, category: str) -> str:
        """Преобразует наши категории в категории replicate API"""
        
        mapping = {
            "top": "upper_body",
            "bottom": "lower_body", 
            "footwear": "lower_body",  # Обувь тоже относится к нижней части
            "accessory": "upper_body",  # Аксессуары по умолчанию к верхней части
            "fragrance": "upper_body"   # Не используется в примерке
        }
        
        return mapping.get(category, "upper_body")
    
    def _create_garment_description(self, item: Dict[str, Any]) -> str:
        """Создает описание вещи для replicate API"""
        
        parts = []
        
        # Добавляем основную информацию
        if item.get("name"):
            parts.append(item["name"])
        
        if item.get("color"):
            parts.append(f"{item['color']} color")
        
        if item.get("brand"):
            parts.append(f"by {item['brand']}")
        
        # Добавляем тип вещи
        category_descriptions = {
            "top": "shirt, blouse, sweater, jacket",
            "bottom": "pants, skirt, shorts, jeans",
            "footwear": "shoes, boots, sneakers",
            "accessory": "accessory, jewelry, belt"
        }
        
        category = item.get("category", "")
        if category in category_descriptions:
            parts.append(category_descriptions[category])
        
        # Добавляем описание если есть
        if item.get("description"):
            parts.append(item["description"])
        
        description = ", ".join(parts)
        
        # Ограничиваем длину описания
        if len(description) > 200:
            description = description[:197] + "..."
        
        return description or "clothing item"
    
    async def _run_replicate_async(self, input_params: Dict[str, Any]) -> Any:
        """Асинхронно выполняет запрос к replicate API"""
        
        def run_replicate(model_id: str):
            try:
                return replicate.run(model_id, input=input_params)
            except Exception as e:
                logger.error(f"❌ Ошибка Replicate API с моделью {model_id}: {e}")
                raise e
        
        # Выполняем в отдельном потоке, чтобы не блокировать async loop
        loop = asyncio.get_event_loop()
        
        try:
            # Пробуем основную модель
            return await loop.run_in_executor(None, lambda: run_replicate(self.model_id))
        except Exception as e:
            logger.warning(f"⚠️ Основная модель недоступна, пробуем альтернативную: {e}")
            try:
                # Пробуем альтернативную модель
                return await loop.run_in_executor(None, lambda: run_replicate(self.fallback_model_id))
            except Exception as e2:
                logger.error(f"❌ Обе модели недоступны: {e2}")
                raise e2
    
    async def _save_replicate_output(self, output: Any, step_number: int, item: Dict[str, Any]) -> str:
        """Сохраняет результат из replicate API"""
        
        try:
            # Генерируем имя файла
            timestamp = int(asyncio.get_event_loop().time())
            item_name = item.get("name", "unknown").replace(" ", "_")[:20]
            filename = f"tryon_step_{step_number}_{item_name}_{timestamp}.jpg"
            filepath = self.output_path / filename
            
            # Сохраняем файл
            if hasattr(output, 'read'):
                # Если output это file-like объект
                with open(filepath, "wb") as file:
                    file.write(output.read())
            else:
                # Если output это URL, скачиваем
                async with httpx.AsyncClient() as client:
                    response = await client.get(str(output))
                    response.raise_for_status()
                    with open(filepath, "wb") as file:
                        file.write(response.content)
            
            # Возвращаем URL для доступа
            return f"/uploads/virtual_tryon/{filename}"
            
        except Exception as e:
            logger.error(f"❌ Ошибка сохранения результата: {e}")
            # Возвращаем URL из replicate как есть
            return str(output)

# Создаем единственный экземпляр сервиса
virtual_tryon_service = VirtualTryOnService() 