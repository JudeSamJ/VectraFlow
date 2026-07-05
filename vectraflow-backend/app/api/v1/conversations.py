import uuid
<<<<<<< HEAD
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
=======

from fastapi import APIRouter, Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.conversation import (
    ConversationListItem,
    ConversationListResponse,
    ConversationResponse,
    MessageListResponse,
    MessageResponse,
)
from app.services import conversation_service
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f

router = APIRouter()


<<<<<<< HEAD
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
=======
@router.get("", response_model=ConversationListResponse)
async def list_conversations(
    kb_id: uuid.UUID | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conversations = await conversation_service.list_for_user(current_user.id, kb_id, db)
    items = []
    for conv in conversations:
        messages = await conversation_service.list_messages(conv.id, db)
        items.append(
            ConversationListItem(
                id=conv.id,
                title=conv.title,
                knowledge_base_id=conv.knowledge_base_id,
                message_count=len(messages),
                created_at=conv.created_at,
            )
        )
    return ConversationListResponse(items=items, next_cursor=None, total=len(items))
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f


@router.get("/{conv_id}", response_model=ConversationResponse)
async def get_conversation(
    conv_id: uuid.UUID,
<<<<<<< HEAD
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
=======
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await conversation_service.get_or_404(conv_id, current_user.id, db)


@router.get("/{conv_id}/messages", response_model=MessageListResponse)
async def get_messages(
    conv_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await conversation_service.get_or_404(conv_id, current_user.id, db)
    messages = await conversation_service.list_messages(conv_id, db)
    items = [MessageResponse.model_validate(m) for m in messages]
    return MessageListResponse(items=items, next_cursor=None, total=len(items))


@router.delete("/{conv_id}", status_code=204)
async def delete_conversation(
    conv_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    conv = await conversation_service.get_or_404(conv_id, current_user.id, db)
    await conversation_service.delete_conversation(conv, db)
    return Response(status_code=204)
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
