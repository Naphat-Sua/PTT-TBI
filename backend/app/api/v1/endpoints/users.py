from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List
from uuid import UUID

from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.user import User as UserSchema, UserUpdate
from app.schemas.project import Project as ProjectSchema
from app.services import user_service
from app.security.deps import get_current_user, get_current_user_with_role, get_admin_user

router = APIRouter()


@router.get("/me", response_model=UserSchema)
def get_current_user_info(current_user: User = Depends(get_current_user)) -> Any:
    """
    Get current user information
    """
    return current_user


@router.put("/me", response_model=UserSchema)
def update_current_user(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update current user
    """
    return user_service.update_user(db, current_user.id, user_data)


@router.get("/", response_model=List[UserSchema])
def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get list of users (admin only)
    """
    return user_service.get_users(db, skip=skip, limit=limit)


@router.get("/{user_id}", response_model=UserSchema)
def get_user(
    user_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get user by ID (admin only)
    """
    user = user_service.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    return user


@router.put("/{user_id}", response_model=UserSchema)
def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update user (admin only)
    """
    return user_service.update_user(db, user_id, user_data)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID,
    current_user: User = Depends(get_admin_user),
    db: Session = Depends(get_db),
) -> None:
    """
    Delete user (admin only)
    """
    # Prevent deleting self
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own user account"
        )
    
    user_service.delete_user(db, user_id)


@router.get("/me/projects", response_model=List[ProjectSchema])
def get_current_user_projects(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get projects for current user
    """
    return current_user.projects