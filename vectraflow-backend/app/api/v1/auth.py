from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.user import User, APIKey
from app.schemas.user import UserCreate, UserResponse, APIKeyCreate, APIKeyCreatedResponse, APIKeyResponse
from app.schemas.token import Token
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, generate_api_key
import uuid

router = APIRouter()

@router.post("/register", response_model=UserResponse)
async def register(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_in.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password)
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalars().first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    return {
        "access_token": create_access_token(user.id),
        "refresh_token": create_refresh_token(user.id),
        "token_type": "bearer"
    }

# Mocked minimal endpoints for api-keys (needs proper auth dependency in real life)
@router.post("/api-keys", response_model=APIKeyCreatedResponse)
async def create_api_key(api_key_in: APIKeyCreate, db: AsyncSession = Depends(get_db)):
    # In a real implementation, get the user from the current token
    # For scaffolding, we just raise NotImplementedError or hardcode
    raise HTTPException(status_code=501, detail="Not Implemented")

@router.get("/api-keys", response_model=list[APIKeyResponse])
async def list_api_keys(db: AsyncSession = Depends(get_db)):
    raise HTTPException(status_code=501, detail="Not Implemented")

@router.delete("/api-keys/{key_id}")
async def delete_api_key(key_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    raise HTTPException(status_code=501, detail="Not Implemented")
