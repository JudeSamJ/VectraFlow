import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import structlog

from app.config import settings
from app.database import get_db
from app.models.user import User, APIKey
from app.models.password_reset_token import PasswordResetToken
from app.schemas.user import UserCreate, UserResponse, APIKeyCreate, APIKeyCreatedResponse, APIKeyResponse
from app.schemas.token import Token
from app.core.security import get_password_hash, verify_password, create_access_token, create_refresh_token, generate_api_key
from app.services.oauth_service import exchange_google_code, exchange_github_code, OAuthError
from app.services.email_service import send_email

logger = structlog.get_logger(__name__)
router = APIRouter()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


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


# ─────────────────────────────────────────────
# OAuth — Google / GitHub
# ─────────────────────────────────────────────

async def _get_or_create_oauth_user(db: AsyncSession, email: str, name: str, provider: str) -> User:
    result = await db.execute(select(User).where(User.email == email))
    user = result.scalars().first()
    if user:
        return user
    # OAuth accounts still need *some* hashed_password to satisfy the NOT
    # NULL column — a random, never-communicated value means it's simply
    # unusable for a password login, without needing a schema change.
    user = User(
        email=email,
        full_name=name,
        hashed_password=get_password_hash(secrets.token_urlsafe(32)),
        auth_provider=provider,
        is_verified=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


def _oauth_success_redirect(user: User) -> RedirectResponse:
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    params = urlencode({"token": access_token, "refresh": refresh_token})
    return RedirectResponse(f"{settings.FRONTEND_URL}/auth/callback?{params}")


def _oauth_failure_redirect(reason: str) -> RedirectResponse:
    params = urlencode({"error": "oauth_failed", "reason": reason})
    return RedirectResponse(f"{settings.FRONTEND_URL}/login?{params}")


@router.get("/google/login")
async def google_login():
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=501, detail="Google sign-in is not configured on this deployment.")
    redirect_uri = f"{settings.OAUTH_REDIRECT_BASE_URL}/api/v1/auth/google/callback"
    params = urlencode({
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "online",
        "prompt": "select_account",
    })
    return RedirectResponse(f"https://accounts.google.com/o/oauth2/v2/auth?{params}")


@router.get("/google/callback")
async def google_callback(code: str | None = None, error: str | None = None, db: AsyncSession = Depends(get_db)):
    if error or not code:
        return _oauth_failure_redirect(error or "no_code")
    try:
        profile = await exchange_google_code(code)
        user = await _get_or_create_oauth_user(db, profile["email"], profile["name"], "google")
    except OAuthError as exc:
        logger.warning("google_oauth_failed", error=str(exc))
        return _oauth_failure_redirect(str(exc))
    return _oauth_success_redirect(user)


@router.get("/github/login")
async def github_login():
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(status_code=501, detail="GitHub sign-in is not configured on this deployment.")
    redirect_uri = f"{settings.OAUTH_REDIRECT_BASE_URL}/api/v1/auth/github/callback"
    params = urlencode({
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": "read:user user:email",
    })
    return RedirectResponse(f"https://github.com/login/oauth/authorize?{params}")


@router.get("/github/callback")
async def github_callback(code: str | None = None, error: str | None = None, db: AsyncSession = Depends(get_db)):
    if error or not code:
        return _oauth_failure_redirect(error or "no_code")
    try:
        profile = await exchange_github_code(code)
        user = await _get_or_create_oauth_user(db, profile["email"], profile["name"], "github")
    except OAuthError as exc:
        logger.warning("github_oauth_failed", error=str(exc))
        return _oauth_failure_redirect(str(exc))
    return _oauth_success_redirect(user)


# ─────────────────────────────────────────────
# Forgot / reset password
# ─────────────────────────────────────────────

@router.post("/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == req.email))
    user = result.scalars().first()

    # Always the same response regardless of whether the account exists —
    # otherwise this endpoint becomes a way to enumerate registered emails.
    if user:
        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
        db.add(PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        ))
        await db.commit()

        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
        await send_email(
            to=user.email,
            subject="Reset your VectraFlow password",
            html=(
                f"<p>Someone requested a password reset for your VectraFlow account.</p>"
                f"<p><a href=\"{reset_link}\">Reset your password</a> (expires in 1 hour).</p>"
                f"<p>If this wasn't you, you can safely ignore this email.</p>"
            ),
        )

    return {"message": "If that email is registered, a reset link has been sent."}


@router.post("/reset-password")
async def reset_password(req: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    token_hash = hashlib.sha256(req.token.encode()).hexdigest()
    result = await db.execute(select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash))
    reset = result.scalars().first()

    if (
        not reset
        or reset.used_at is not None
        or reset.expires_at < datetime.now(timezone.utc)
    ):
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired.")

    if len(req.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    result = await db.execute(select(User).where(User.id == reset.user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=400, detail="This reset link is invalid or has expired.")

    user.hashed_password = get_password_hash(req.new_password)
    reset.used_at = datetime.now(timezone.utc)
    await db.commit()

    return {"message": "Password reset successfully."}


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
