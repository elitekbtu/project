from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from .service import get_stylist_reply
from app.core.security import get_current_user
from app.db.models.user import User

router = APIRouter(prefix="/chat-stylist", tags=["chat-stylist"])

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str
    items: list

@router.post("/", response_model=ChatResponse)
async def chat_stylist(request: ChatRequest, user: User = Depends(get_current_user)):
    try:
        reply, items = await get_stylist_reply(request.message, user)
        return ChatResponse(reply=reply, items=items)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 