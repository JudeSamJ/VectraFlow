<<<<<<< HEAD
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
=======
from fastapi import APIRouter, Depends
from redis.asyncio import Redis
>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import oauth2_scheme
from app.database import get_db
from app.redis_client import get_redis
from app.schemas.auth import (
    AccessTokenResponse,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)
from app.services import auth_service

router = APIRouter()


<<<<<<< HEAD
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


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
async def login(credentials: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalars().first()

    if not user or not verify_password(credentials.password, user.hashed_password):
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
=======
@router.post("/register", response_model=UserResponse, status_code=201)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    user = await auth_service.register(data, db)
    return user

>>>>>>> 36515d09bd756a4bdcea6bdae0916842b2e73b8f

@router.post("/login", response_model=TokenResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    access_token, refresh_token, expires_in = await auth_service.login(data.email, data.password, db)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token, expires_in=expires_in)


@router.post("/refresh", response_model=AccessTokenResponse)
async def refresh(data: RefreshRequest):
    access_token, expires_in = await auth_service.refresh_access_token(data.refresh_token)
    return AccessTokenResponse(access_token=access_token, expires_in=expires_in)


@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme), redis: Redis = Depends(get_redis)):
    await auth_service.logout(token, redis)
    return {"detail": "Logged out successfully"}
