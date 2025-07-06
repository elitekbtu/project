#!/usr/bin/env python3
"""
Test script for image generation service
"""

import asyncio
import os
import sys
from pathlib import Path

# Add the app directory to the Python path
sys.path.insert(0, str(Path(__file__).parent / "app"))

from services.image_generation import image_generation_service

async def test_image_generation():
    """Test image generation with sample data"""
    print("🧪 Testing Image Generation Service")
    print("=" * 50)
    
    # Sample product data
    sample_products = [
        {
            "name": "Черная футболка",
            "brand": "Nike",
            "color": "черный",
            "category": "top",
            "description": "Хлопковая футболка с логотипом",
            "image_url": "https://dummyimage.com/300x300/000000/ffffff.png&text=T-Shirt",
            "price": 2500
        },
        {
            "name": "Джинсы синие",
            "brand": "Levi's",
            "color": "синий",
            "category": "bottom",
            "description": "Классические джинсы из денима",
            "image_url": "https://dummyimage.com/300x300/0000ff/ffffff.png&text=Jeans",
            "price": 8000
        },
        {
            "name": "Белые кроссовки",
            "brand": "Adidas",
            "color": "белый",
            "category": "footwear",
            "description": "Спортивные кроссовки из кожи",
            "image_url": "https://dummyimage.com/300x300/ffffff/000000.png&text=Sneakers",
            "price": 12000
        }
    ]
    
    # User measurements
    user_measurements = {
        "height": 180,
        "weight": 75
    }
    
    style_prompt = "casual streetwear, modern urban style"
    
    print(f"📦 Товары для генерации:")
    for item in sample_products:
        print(f"  - {item['brand']} {item['name']} ({item['color']})")
    
    print(f"\n👤 Параметры пользователя:")
    print(f"  - Рост: {user_measurements['height']} см")
    print(f"  - Вес: {user_measurements['weight']} кг")
    
    print(f"\n🎨 Стиль: {style_prompt}")
    
    print(f"\n🔧 Настройки:")
    print(f"  - Hugging Face API Key: {'✅ Установлен' if os.getenv('HUGGINGFACE_API_KEY') else '❌ Не установлен'}")
    print(f"  - Манекен: {'✅ Найден' if Path('frontend/public/maneken.jpg').exists() else '❌ Не найден'}")
    print(f"  - Папка для генерации: {'✅ Создана' if Path('uploads/generated_outfits').exists() else '❌ Не создана'}")
    
    print(f"\n🚀 Запуск генерации...")
    
    try:
        # Generate image
        result_url = await image_generation_service.generate_outfit_image(
            product_items=sample_products,
            style_prompt=style_prompt,
            user_measurements=user_measurements
        )
        
        print(f"\n✅ Генерация завершена!")
        print(f"📷 Результат: {result_url}")
        
        # Check if file exists
        if result_url.startswith("/uploads/"):
            file_path = Path(result_url.lstrip("/"))
            if file_path.exists():
                file_size = file_path.stat().st_size
                print(f"📁 Файл сохранен: {file_path}")
                print(f"📏 Размер файла: {file_size} байт")
            else:
                print(f"⚠️ Файл не найден: {file_path}")
        else:
            print(f"🔗 Внешний URL: {result_url}")
            
    except Exception as e:
        print(f"\n❌ Ошибка генерации: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_image_generation()) 