from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import Depends
from fastapi.staticfiles import StaticFiles

from app.api.v1.api import api_router as api_v1_router
from app.api.v1.endpoints.profile.schemas import ProfileOut
from app.core.config import get_settings
from app.core.database import Base, engine
from app.core.security import get_current_user, get_password_hash
from app.db.models.user import User

settings = get_settings()

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_v1_router, prefix="/api")

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.on_event("startup")
def create_default_admin():
    from app.core.database import SessionLocal
    db = SessionLocal()
    admin_emails = settings.ADMIN_EMAILS.split(",") if settings.ADMIN_EMAILS else []
    if not admin_emails:
        db.close()
        return
    admin_email = admin_emails[0].strip().lower()
    if not admin_email:
        db.close()
        return
    try:
        user = db.query(User).filter(User.email == admin_email).first()
        if not user:
            password = settings.dict().get("ADMIN_DEFAULT_PASSWORD", "")
            db.add(User(email=admin_email, hashed_password=get_password_hash(password), is_admin=True))
            db.commit()
    except Exception:
        pass
    db.close()

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Service is running"}

@app.get("/api/health/ready")
async def readiness_check():
    return {"status": "ok", "message": "Service is ready"}

@app.get("/api/me", response_model=ProfileOut)
async def get_me(user: User = Depends(get_current_user)):
    return ProfileOut.from_orm(user)