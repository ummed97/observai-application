"""
Chat History Router
Handles chat history retrieval and management
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from typing import List
from pydantic import BaseModel
from datetime import datetime

from models.database import ChatHistory, get_db
from auth.jwt_handler import validate_token
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])
security = HTTPBearer()

class ChatMessage(BaseModel):
    id: str
    session_id: str | None = None
    query: str
    response: str
    timestamp: datetime

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Validate JWT token and return user info"""
    return validate_token(credentials.credentials)

@router.get("/history", response_model=List[ChatMessage])
async def get_chat_history(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)
):
    """Get chat history for the current user"""
    try:
        user_id = user.get("user_id")
        
        result = await db.execute(
            select(ChatHistory)
            .where(ChatHistory.user_id == user_id)
            .order_by(ChatHistory.timestamp.desc())
            .limit(limit)
        )
        
        history = result.scalars().all()
        
        return [
            ChatMessage(
                id=chat.id,
                session_id=chat.session_id,
                query=chat.query,
                response=chat.response,
                timestamp=chat.timestamp
            )
            for chat in history
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/history")
async def clear_chat_history(
    db: AsyncSession = Depends(get_db),
    user = Depends(get_current_user)
):
    """Clear all chat history for the current user"""
    try:
        user_id = user.get("user_id")
        
        await db.execute(
            delete(ChatHistory).where(ChatHistory.user_id == user_id)
        )
        await db.commit()
        
        return {"status": "success", "message": "Chat history cleared"}
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
