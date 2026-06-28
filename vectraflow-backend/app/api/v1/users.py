from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.user import UserResponse, UserUpdate
import uuid

router = APIRouter()

@router.get("/me", response_model=UserResponse)
async def get_me(db: AsyncSession = Depends(get_db)):
    raise HTTPException(status_code=501, detail="Not Implemented")

@router.put("/me", response_model=UserResponse)
async def update_me(user_in: UserUpdate, db: AsyncSession = Depends(get_db)):
    raise HTTPException(status_code=501, detail="Not Implemented")
