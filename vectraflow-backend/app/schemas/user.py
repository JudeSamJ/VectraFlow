from pydantic import BaseModel, EmailStr, ConfigDict
import uuid
from datetime import datetime
from app.models.user import UserRole

class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: uuid.UUID
    is_active: bool
    is_verified: bool
    role: UserRole
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class UserUpdate(BaseModel):
    full_name: str | None = None
    email: EmailStr | None = None
    password: str | None = None

class APIKeyCreate(BaseModel):
    name: str

class APIKeyResponse(BaseModel):
    id: uuid.UUID
    name: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class APIKeyCreatedResponse(APIKeyResponse):
    api_key: str
