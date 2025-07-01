from fastapi import APIRouter

from app.api.v1.endpoints.users import router as users_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.profile import router as profile_router
from app.api.v1.endpoints.user_content import router as user_content_router
from app.api.v1.endpoints.cart import router as cart_router
from app.api.v1.endpoints.outfits import router as outfits_router
from app.api.v1.endpoints.items import router as items_router

api_router = APIRouter()
api_router.include_router(users_router)
api_router.include_router(auth_router)
api_router.include_router(profile_router)
api_router.include_router(user_content_router)
api_router.include_router(cart_router)
api_router.include_router(outfits_router)
api_router.include_router(items_router) 