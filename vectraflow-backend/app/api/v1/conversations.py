import uuid
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.database import get_db
from app.models.user import User
from app.models.conversation import Conversation, Message, MessageRole, ConversationStatus
from app.api.deps import get_current_user

router = APIRouter()


class ConversationCreate(BaseModel):
    knowledge_base_id: uuid.UUID
    title: Optional[str] = "New Conversation"


class ConversationResponse(BaseModel):
    id: uuid.UUID
    knowledge_base_id: uuid.UUID
    title: str
    status: ConversationStatus
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MessageResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    role: MessageRole
    content: str
    citations: Optional[dict]
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("", response_model=ConversationResponse)
async def create_conversation(
    conv_in: ConversationCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    conv = Conversation(
        owner_id=current_user.id,
        knowledge_base_id=conv_in.knowledge_base_id,
        title=conv_in.title or "New Conversation",
    )
    db.add(conv)
    await db.commit()
    await db.refresh(conv)
    return conv


@router.get("", response_model=List[ConversationResponse])
async def list_conversations(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.owner_id == current_user.id)
        .order_by(Conversation.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{conv_id}", response_model=ConversationResponse)
async def get_conversation(
    conv_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conv_id,
            Conversation.owner_id == current_user.id,
        )
    )
    conv = result.scalars().first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return conv


@router.get("/{conv_id}/messages", response_model=List[MessageResponse])
async def get_messages(
    conv_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Verify ownership
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conv_id,
            Conversation.owner_id == current_user.id,
        )
    )
    if not result.scalars().first():
        raise HTTPException(status_code=404, detail="Conversation not found")

    result = await db.execute(
        select(Message)
        .where(Message.conversation_id == conv_id)
        .order_by(Message.created_at.asc())
    )
    return result.scalars().all()


@router.delete("/{conv_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conv_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Conversation).where(
            Conversation.id == conv_id,
            Conversation.owner_id == current_user.id,
        )
    )
    conv = result.scalars().first()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    await db.delete(conv)
    await db.commit()
