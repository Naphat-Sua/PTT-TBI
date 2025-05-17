from typing import Optional, List, Dict, Any, Union
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import func
from fastapi import HTTPException, status
import uuid

from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserUpdate, UserProfileUpdate
from app.security.password import get_password_hash, verify_password
from app.security.auth import create_access_token, create_refresh_token


def get_user(db: Session, user_id: UUID) -> Optional[User]:
    """Get a user by ID"""
    return db.query(User).filter(User.id == user_id).first()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Get a user by email"""
    return db.query(User).filter(func.lower(User.email) == func.lower(email)).first()


def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """Get a user by username"""
    return db.query(User).filter(func.lower(User.username) == func.lower(username)).first()


def get_users(
    db: Session, skip: int = 0, limit: int = 100, query: str = None
) -> List[User]:
    """Get a list of users with optional filtering"""
    users_query = db.query(User)
    
    if query:
        search_term = f"%{query.lower()}%"
        users_query = users_query.filter(
            func.lower(User.email).like(search_term) |
            func.lower(User.username).like(search_term) |
            func.lower(User.full_name).like(search_term)
        )
    
    return users_query.offset(skip).limit(limit).all()


def get_users_count(db: Session, query: str = None) -> int:
    """Get total count of users with optional filtering"""
    users_query = db.query(User)
    
    if query:
        search_term = f"%{query.lower()}%"
        users_query = users_query.filter(
            func.lower(User.email).like(search_term) |
            func.lower(User.username).like(search_term) |
            func.lower(User.full_name).like(search_term)
        )
    
    return users_query.count()


def create_user(db: Session, obj_in: UserCreate) -> User:
    """Create a new user"""
    db_obj = User(
        email=obj_in.email,
        username=obj_in.username,
        hashed_password=get_password_hash(obj_in.password),
        full_name=obj_in.full_name,
        is_active=obj_in.is_active,
        role=obj_in.role or UserRole.VIEWER,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_user(
    db: Session, *, db_obj: User, obj_in: Union[UserUpdate, Dict[str, Any]]
) -> User:
    """Update an existing user"""
    if isinstance(obj_in, dict):
        update_data = obj_in
    else:
        update_data = obj_in.dict(exclude_unset=True)
        
    # Handle password update if provided
    if "password" in update_data:
        hashed_password = get_password_hash(update_data["password"])
        del update_data["password"]
        update_data["hashed_password"] = hashed_password
        
    for field in update_data:
        # Skip setting password directly
        if field == "password":
            continue
        setattr(db_obj, field, update_data[field])
        
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def update_user_profile(db: Session, user_id: UUID, obj_in: UserProfileUpdate) -> User:
    """Update user profile settings"""
    user = get_user(db, user_id)
    if not user:
        return None
    
    update_data = obj_in.dict(exclude_unset=True)
    for field in update_data:
        setattr(user, field, update_data[field])
        
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: UUID) -> bool:
    """Delete a user by ID"""
    user = get_user(db, user_id)
    if not user:
        return False
        
    db.delete(user)
    db.commit()
    return True


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Authenticate a user with email and password"""
    user = get_user_by_email(db, email=email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


def generate_auth_tokens(user: User) -> Dict[str, Any]:
    """
    Generate authentication tokens for user
    
    Args:
        user: User object
        
    Returns:
        Dictionary with tokens
    """
    access_token = create_access_token(user.id, user.role)
    refresh_token = create_refresh_token(user.id, user.role)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "refresh_token": refresh_token,
        "expires_in": 60 * 30  # 30 minutes
    }