from typing import Generator, Optional, List, Union
from fastapi import Depends, HTTPException, status, Security
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.user import TokenPayload
from app.core.config import settings

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login")

# Role hierarchy - higher roles have all permissions of lower roles
ROLE_HIERARCHY = {
    UserRole.ADMIN: 3,
    UserRole.EDITOR: 2, 
    UserRole.VIEWER: 1
}

def get_current_user(
    db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)
) -> User:
    """
    Get current user based on JWT token
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode JWT token
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        user_id_str: str = payload.get("sub")
        if user_id_str is None:
            raise credentials_exception
        
        token_data = TokenPayload(sub=user_id_str, exp=payload.get("exp"), role=payload.get("role"))
        
    except JWTError:
        raise credentials_exception
    
    try:
        user_id = uuid.UUID(token_data.sub)
    except ValueError:
        raise credentials_exception
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise credentials_exception
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user"
        )
    
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Get current active user
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user"
        )
    return current_user


def check_user_role(required_role: UserRole, user_role: UserRole) -> bool:
    """
    Check if user role meets the required role level
    """
    user_level = ROLE_HIERARCHY.get(user_role, 0)
    required_level = ROLE_HIERARCHY.get(required_role, 0)
    return user_level >= required_level


# Role-based dependencies for endpoints
def get_current_user_with_role(required_roles: List[UserRole]):
    """
    Factory function to create a dependency that checks user role against required roles
    """
    
    def current_user_with_role(current_user: User = Depends(get_current_user)) -> User:
        for role in required_roles:
            if check_user_role(role, current_user.role):
                return current_user
                
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required role: {', '.join([r.value for r in required_roles])}",
        )
    
    return current_user_with_role


# Common role-based dependencies
get_admin_user = get_current_user_with_role([UserRole.ADMIN])
get_editor_user = get_current_user_with_role([UserRole.ADMIN, UserRole.EDITOR])
get_viewer_user = get_current_user_with_role([UserRole.ADMIN, UserRole.EDITOR, UserRole.VIEWER])