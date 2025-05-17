from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, EmailStr, Field, validator

from app.models.user import UserRole


class UserBase(BaseModel):
    """Base user schema with common fields"""
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = True
    role: Optional[UserRole] = UserRole.VIEWER


class UserCreate(UserBase):
    """Schema for creating a new user"""
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    
    @validator('username')
    def username_alphanumeric(cls, v):
        assert v.isalnum(), 'Username must be alphanumeric'
        return v


class UserUpdate(UserBase):
    """Schema for updating user information"""
    password: Optional[str] = Field(None, min_length=8)


class UserInDBBase(UserBase):
    """Schema for user stored in DB"""
    id: UUID
    
    class Config:
        orm_mode = True


class User(UserInDBBase):
    """Schema for user returned to client (no sensitive data)"""
    pass


class UserInDB(UserInDBBase):
    """Schema for complete user including hashed password (internal use only)"""
    hashed_password: str


class UsersResponse(BaseModel):
    """Schema for paginated users response"""
    items: List[User]
    total: int


class UserProfileUpdate(BaseModel):
    """Schema for updating user profile settings"""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    ui_theme: Optional[str] = None  # "light", "dark", "system"
    notification_settings: Optional[dict] = None


class UserWithProjects(User):
    projects: List["ProjectSummary"] = []


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    refresh_token: str
    expires_in: int


class TokenPayload(BaseModel):
    sub: str
    exp: int
    role: str


class RefreshToken(BaseModel):
    refresh_token: str


# Will be defined after importing project schema
from app.schemas.project import ProjectSummary
UserWithProjects.update_forward_refs()