#!/usr/bin/env python3
"""
Image Generation Service

Сервис для генерации изображений образов методом image-to-image:
- Использует Hugging Face Inference API (бесплатный)
- Stable Diffusion + ControlNet для точной генерации
- Работает с локальными изображениями продуктов и манекена
- Качественная генерация реалистичных образов
"""

import asyncio
import logging
import os
import base64
import io
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import httpx
import aiofiles
from fastapi import HTTPException

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Hugging Face API настройки
HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY")
HUGGINGFACE_API_URL = "https://api-inference.huggingface.co/models"

# Обновленные, проверенные модели для image-to-image
MODELS = {
    "main": "stabilityai/stable-diffusion-2-1",          # Основная модель
    "alternative": "runwayml/stable-diffusion-v1-5",     # Альтернативная модель
    "inpainting": "runwayml/stable-diffusion-inpainting" # Для маскирования/заполнения (если понадобится)
}

class ImageGenerationService:
    """Сервис для генерации изображений образов"""
    
    def __init__(self):
        self.api_key = HUGGINGFACE_API_KEY
        self.base_path = Path("uploads")
        self.mannequin_path = Path("frontend/public/maneken.png")
        self.items_path = Path("uploads/items")
        self.output_path = Path("uploads/generated_outfits")
        self.items_path.mkdir(parents=True, exist_ok=True)
        self.output_path.mkdir(parents=True, exist_ok=True)
        
        # Проверяем наличие API ключа
        if not self.api_key:
            logger.warning("HUGGINGFACE_API_KEY не установлен. Будет использоваться заглушка.")
    
    async def generate_outfit_image(
        self,
        product_items: List[Dict[str, Any]],
        style_prompt: str = "",
        user_measurements: Optional[Dict[str, float]] = None
    ) -> str:
        """
        Генерирует изображение образа методом image-to-image
        
        Args:
            product_items: Список товаров с их данными и локальными изображениями
            style_prompt: Дополнительный стилистический промпт
            user_measurements: Параметры пользователя для подгонки
            
        Returns:
            URL сгенерированного изображения
        """
        try:
            logger.info(f"🎨 Начинаю генерацию образа для {len(product_items)} товаров")
            
            # Если нет API ключа Hugging Face, генерируем локальный композит и возвращаем его
            if not self.api_key:
                mannequin_image = await self._load_mannequin_image()
                product_images = await self._load_product_images(product_items)

                if not product_images:
                    # Нет изображений товаров – вернём простой placeholder
                    return await self._generate_placeholder_image(product_items)

                reference_image = await self._create_reference_composition(
                    mannequin_image, product_images, product_items
                )

                # Сохраняем композицию как итоговый результат
                buffer = io.BytesIO()
                reference_image.save(buffer, format="PNG")
                image_url = await self._save_generated_image_bytes(buffer.getvalue(), product_items)
                logger.info(f"✅ Локальный композит сохранён: {image_url}")
                return image_url
            
            # Подготавливаем изображения
            mannequin_image = await self._load_mannequin_image()
            product_images = await self._load_product_images(product_items)
            
            if not product_images:
                logger.warning("Не найдено изображений товаров для генерации")
                return await self._generate_placeholder_image(product_items)
            
            # Создаем композитное изображение для reference
            reference_image = await self._create_reference_composition(
                mannequin_image, product_images, product_items
            )
            
            # Генерируем детальный промпт
            detailed_prompt = self._create_detailed_prompt(product_items, style_prompt, user_measurements)
            
            try:
                # Генерируем изображение через Hugging Face
                generated_image_url = await self._generate_with_huggingface(
                    reference_image, detailed_prompt, product_items
                )
                logger.info(f"✅ Образ успешно сгенерирован: {generated_image_url}")
                return generated_image_url
            except Exception as e:
                logger.error(f"❌ Ошибка генерации через Hugging Face: {e}. Будет использован локальный композит.")
                # Сохраняем reference_image как итоговый результат
                buffer = io.BytesIO()
                reference_image.save(buffer, format="PNG")
                image_url = await self._save_generated_image_bytes(buffer.getvalue(), product_items)
                logger.info(f"✅ Локальный композит сохранён после ошибки HF: {image_url}")
                return image_url
            
        except Exception as e:
            logger.error(f"❌ Необработанная ошибка генерации образа: {e}")
            # В самом крайнем случае создаём текстовый placeholder
            return await self._generate_placeholder_image(product_items)
    
    async def _load_mannequin_image(self) -> Image.Image:
        """Загружает изображение манекена"""
        try:
            if self.mannequin_path.exists():
                async with aiofiles.open(self.mannequin_path, 'rb') as f:
                    content = await f.read()
                    return Image.open(io.BytesIO(content)).convert("RGB")
            else:
                # Создаем простое изображение манекена как заглушку
                mannequin = Image.new("RGB", (512, 1024), color=(240, 240, 240))
                draw = ImageDraw.Draw(mannequin)
                
                # Рисуем простой силуэт манекена
                # Голова
                draw.ellipse([200, 50, 312, 150], fill=(220, 220, 220))
                # Тело
                draw.rectangle([180, 150, 332, 600], fill=(220, 220, 220))
                # Руки
                draw.rectangle([120, 200, 180, 500], fill=(220, 220, 220))
                draw.rectangle([332, 200, 392, 500], fill=(220, 220, 220))
                # Ноги
                draw.rectangle([200, 600, 250, 950], fill=(220, 220, 220))
                draw.rectangle([262, 600, 312, 950], fill=(220, 220, 220))
                
                return mannequin
        except Exception as e:
            logger.error(f"Ошибка загрузки манекена: {e}")
            # Возвращаем простое изображение
            return Image.new("RGB", (512, 1024), color=(240, 240, 240))
    
    async def _load_product_images(self, product_items: List[Dict[str, Any]]) -> List[Tuple[Image.Image, Dict[str, Any]]]:
        """Загружает изображения товаров"""
        product_images = []
        
        for item in product_items:
            try:
                image_url = item.get("image_url", "")
                if not image_url:
                    continue
                
                # Проверяем, это локальный файл или URL
                if image_url.startswith("/uploads/"):
                    # Локальный файл 
                    local_path = Path(image_url.lstrip("/"))
                    if local_path.exists():
                        async with aiofiles.open(local_path, 'rb') as f:
                            content = await f.read()
                            image = Image.open(io.BytesIO(content)).convert("RGB")
                            product_images.append((image, item))
                            logger.info(f"📸 Загружено локальное изображение: {item['name']}")
                    else:
                        logger.warning(f"❌ Локальный файл не найден: {local_path}")
                else:
                    # Внешний URL - скачиваем
                    async with httpx.AsyncClient() as client:
                        response = await client.get(image_url, timeout=30)
                        if response.status_code == 200:
                            image = Image.open(io.BytesIO(response.content)).convert("RGB")
                            product_images.append((image, item))
                            logger.info(f"📸 Загружено внешнее изображение: {item['name']}")
                        
            except Exception as e:
                logger.error(f"Ошибка загрузки изображения товара {item.get('name', 'Unknown')}: {e}")
                continue
        
        return product_images
    
    async def _create_reference_composition(
        self,
        mannequin: Image.Image,
        product_images: List[Tuple[Image.Image, Dict[str, Any]]],
        product_items: List[Dict[str, Any]]
    ) -> Image.Image:
        """
        Создает композитное изображение-чертёж для AI,
        точно располагая одежду на манекене.
        """
        try:
            base_width, base_height = 512, 1024
            composition = mannequin.resize((base_width, base_height))

            # Точные координаты для размещения одежды на манекене 512x1024
            # (x_start, y_start, width, height)
            positions = {
                "top": (130, 150, 252, 300),      # Центрировано на торсе
                "bottom": (146, 450, 220, 450),   # Центрировано на ногах
                "footwear": (156, 900, 200, 124),  # В области ступней
                "accessory": (30, 50, 100, 100),   # Сбоку, для справки
                "fragrance": (382, 50, 100, 150)  # С другого боку
            }

            for image, item in product_images:
                category = item.get("category", "accessory")
                if category in positions:
                    pos = positions[category]
                    
                    # Сохраняем пропорции, вписывая в область pos
                    resized_item = image.copy()
                    resized_item.thumbnail((pos[2], pos[3]), Image.Resampling.LANCZOS)
                    
                    # Вычисляем позицию для центрирования
                    paste_x = pos[0] + (pos[2] - resized_item.width) // 2
                    paste_y = pos[1] + (pos[3] - resized_item.height) // 2

                    # Накладываем изображение без маски для большей четкости
                    composition.paste(resized_item, (paste_x, paste_y))

            return composition

        except Exception as e:
            logger.error(f"Ошибка создания композиции: {e}")
            return mannequin
    
    def _create_detailed_prompt(
        self,
        product_items: List[Dict[str, Any]],
        style_prompt: str = "",
        user_measurements: Optional[Dict[str, float]] = None
    ) -> str:
        """Создает детальный промпт для генерации."""
        
        # Обновленный базовый промпт
        base_prompt = [
            "ultra-realistic photo of clothes on a white mannequin, professional studio shot, fashion catalog style,",
            "hyper-detailed, sharp focus, clean white background, photorealistic textures,",
            "perfect fit, natural shadows, 8k, no blur, no text, no watermarks."
        ]
        
        # Описание товаров
        item_descriptions = []
        colors = []
        materials = []
        brands = []
        
        for item in product_items:
            # Добавляем описание товара
            item_desc = []
            if item.get("brand"):
                item_desc.append(item["brand"])
                brands.append(item["brand"])
            if item.get("name"):
                item_desc.append(item["name"])
            if item.get("color"):
                item_desc.append(f"in {item['color']}")
                colors.append(item["color"])
            
            category = item.get("category", "clothing")
            if item_desc:
                item_descriptions.append(f"{category}: {' '.join(item_desc)}")
            
            # Извлекаем материалы
            if item.get("description"):
                desc_lower = item["description"].lower()
                material_keywords = ["cotton", "polyester", "wool", "silk", "denim", "leather", "suede", "knit"]
                for material in material_keywords:
                    if material in desc_lower:
                        materials.append(material)
        
        # Собираем полный промпт
        full_prompt = " ".join(base_prompt)
        
        if item_descriptions:
            full_prompt += f" Outfit consists of: {', '.join(item_descriptions)}."
        
        if colors:
            unique_colors = list(set(colors))
            full_prompt += f" Color palette: {', '.join(unique_colors)}."
        
        if materials:
            unique_materials = list(set(materials))
            full_prompt += f" Materials: {', '.join(unique_materials)}."
        
        if brands:
            unique_brands = list(set(brands))
            full_prompt += f" Brands: {', '.join(unique_brands)}."
        
        # Добавляем пользовательские параметры
        if user_measurements:
            if user_measurements.get("height"):
                full_prompt += f" Mannequin height: {user_measurements['height']}cm."
            if user_measurements.get("weight"):
                full_prompt += f" Proportions for {user_measurements['weight']}kg."
        
        # Добавляем стилистический промпт
        if style_prompt:
            full_prompt += f" Style: {style_prompt}."
        
        return full_prompt
    
    async def _generate_with_huggingface(
        self,
        reference_image: Image.Image,
        prompt: str,
        product_items: List[Dict[str, Any]]
    ) -> str:
        """
        Генерирует изображение, пробуя основную и альтернативную модели.
        """
        try:
            # Сначала пробуем основную модель
            logger.info(f"🚀 Попытка генерации с основной моделью: {MODELS['main']}")
            return await self._try_model(MODELS['main'], reference_image, prompt, product_items)
        except Exception as e:
            logger.warning(f"⚠️ Ошибка основной модели ({MODELS['main']}): {e}. Пробуем альтернативную.")
            try:
                # Если основная модель не удалась, пробуем альтернативную
                logger.info(f"🚀 Попытка генерации с альтернативной моделью: {MODELS['alternative']}")
                return await self._try_model(MODELS['alternative'], reference_image, prompt, product_items)
            except Exception as e2:
                logger.error(f"❌ Ошибка альтернативной модели ({MODELS['alternative']}): {e2}")
                raise e2  # Пробрасываем ошибку выше, чтобы сработал fallback на композит

    async def _try_model(
        self,
        model_id: str,
        reference_image: Image.Image,
        prompt: str,
        product_items: List[Dict[str, Any]]
    ) -> str:
        """Пытается сгенерировать изображение с использованием указанной модели."""
        headers = {"Authorization": f"Bearer {self.api_key}"}
        api_url = f"{HUGGINGFACE_API_URL}/{model_id}"

        # Конвертируем изображение в base64
        buffer = io.BytesIO()
        reference_image.save(buffer, format="PNG")
        img_base64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        # Параметры для image-to-image
        payload = {
            "inputs": f"data:image/png;base64,{img_base64}",
            "parameters": {
                "prompt": prompt,
                "negative_prompt": "blurry, low quality, deformed, text, watermark, ugly",
                "strength": 0.85,  # Сила влияния референса (0.8-0.9 хорошо)
                "guidance_scale": 7.5,
                "num_inference_steps": 30, # Увеличено для лучшего качества
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(api_url, headers=headers, json=payload, timeout=120.0)

            if response.status_code == 200:
                # Сохраняем полученное изображение
                image_bytes = response.content
                return await self._save_generated_image_bytes(image_bytes, product_items)
            else:
                error_info = response.text
                logger.error(f"Ошибка API Hugging Face ({model_id}): {response.status_code} - {error_info}")
                raise HTTPException(status_code=response.status_code, detail=f"Hugging Face API error: {error_info}")
    
    async def _save_generated_image(self, image_base64: str, product_items: List[Dict[str, Any]]) -> str:
        """Сохраняет сгенерированное изображение из base64"""
        try:
            # Декодируем base64
            image_data = base64.b64decode(image_base64)
            
            # Генерируем имя файла
            timestamp = int(asyncio.get_event_loop().time())
            filename = f"outfit_{timestamp}.png"
            filepath = self.output_path / filename
            
            # Сохраняем файл
            async with aiofiles.open(filepath, 'wb') as f:
                await f.write(image_data)
            
            # Возвращаем URL для доступа
            return f"/uploads/generated_outfits/{filename}"
            
        except Exception as e:
            logger.error(f"Ошибка сохранения изображения: {e}")
            return await self._generate_placeholder_image(product_items)
    
    async def _save_generated_image_bytes(self, image_data: bytes, product_items: List[Dict[str, Any]]) -> str:
        """Сохраняет сгенерированное изображение из bytes"""
        try:
            # Генерируем имя файла
            timestamp = int(asyncio.get_event_loop().time())
            filename = f"outfit_{timestamp}.png"
            filepath = self.output_path / filename
            
            # Сохраняем файл
            async with aiofiles.open(filepath, 'wb') as f:
                await f.write(image_data)
            
            # Возвращаем URL для доступа
            return f"/uploads/generated_outfits/{filename}"
            
        except Exception as e:
            logger.error(f"Ошибка сохранения изображения: {e}")
            return await self._generate_placeholder_image(product_items)
    
    async def _generate_placeholder_image(self, product_items: List[Dict[str, Any]]) -> str:
        """Генерирует placeholder изображение с информацией о товарах"""
        try:
            # Создаем изображение-заглушку
            width, height = 512, 1024
            image = Image.new("RGB", (width, height), color=(245, 245, 245))
            draw = ImageDraw.Draw(image)
            
            # Заголовок
            draw.text((20, 20), "AI Outfit Generation", fill=(100, 100, 100))
            draw.text((20, 50), "Временно недоступно", fill=(150, 150, 150))
            
            # Информация о товарах
            y_offset = 100
            for i, item in enumerate(product_items[:8]):  # Максимум 8 товаров
                text = f"• {item.get('brand', 'Unknown')} - {item.get('name', 'Product')[:30]}"
                draw.text((20, y_offset), text, fill=(80, 80, 80))
                y_offset += 30
            
            # Сохраняем placeholder
            timestamp = int(asyncio.get_event_loop().time())
            filename = f"placeholder_{timestamp}.png"
            filepath = self.output_path / filename
            
            image.save(filepath)
            
            return f"/uploads/generated_outfits/{filename}"
            
        except Exception as e:
            logger.error(f"Ошибка создания placeholder: {e}")
            return "https://dummyimage.com/512x1024/eeeeee/000000.png&text=Outfit+Generation+Error"

# Глобальный экземпляр сервиса
image_generation_service = ImageGenerationService() 