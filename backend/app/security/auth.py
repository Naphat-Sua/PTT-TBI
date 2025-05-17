from datetime import datetime, timedelta
from typing import Any, Optional, Union
from passlib.context import CryptContext
from jose import jwt
from uuid import UUID

from app.core.config import settings
from app.models.user import UserRole

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def create_access_token(subject: Union[str, UUID], role: UserRole, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a JWT access token for the user
    
    Args:
        subject: User ID to encode in the token
        role: User role for authorization
        expires_delta: Optional expiration time delta
        
    Returns:
        JWT token string
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "sub": str(subject),
        "role": role.value if isinstance(role, UserRole) else role,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(subject: Union[str, UUID], role: UserRole) -> str:
    """
    Create a refresh token for the user
    
    Args:
        subject: User ID to encode in the token
        role: User role for authorization
        
    Returns:
        JWT token string
    """
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    
    to_encode = {
        "sub": str(subject),
        "role": role.value if isinstance(role, UserRole) else role,
        "exp": expire,
        "iat": datetime.utcnow(),
        "token_type": "refresh"
    }
    
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a password against a hash
    
    Args:
        plain_password: Password in plain text
        hashed_password: Hashed password from database
        
    Returns:
        True if password matches hash, False otherwise
    """
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """
    Hash a password for storing
    
    Args:
        password: Plain text password
        
    Returns:
        Hashed password
    """
    return pwd_context.hash(password)