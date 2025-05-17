from typing import Optional, List, Dict, Any
from uuid import UUID
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from sqlalchemy import func

from app.models.project import Project
from app.models.user import User
from app.schemas.project import ProjectCreate, ProjectUpdate


def get_project_by_id(db: Session, project_id: UUID, user_id: UUID = None) -> Project:
    """
    Get project by ID
    
    Args:
        db: Database session
        project_id: Project ID
        user_id: User ID to check access
        
    Returns:
        Project object
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID {project_id} not found"
        )
    
    # Check if user has access to this project
    if user_id and not project.is_public and project.owner_id != user_id:
        user_has_access = any(user.id == user_id for user in project.users)
        if not user_has_access:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have access to this project"
            )
    
    return project


def get_projects(
    db: Session, 
    user_id: UUID, 
    skip: int = 0, 
    limit: int = 100,
    include_public: bool = True,
) -> List[Project]:
    """
    Get list of projects accessible by user
    
    Args:
        db: Database session
        user_id: User ID
        skip: Skip N projects
        limit: Limit number of projects
        include_public: Include public projects
        
    Returns:
        List of projects
    """
    query = db.query(Project).filter(
        (Project.owner_id == user_id) |
        (Project.users.any(id=user_id))
    )
    
    if include_public:
        query = query.union(
            db.query(Project).filter(Project.is_public == True)
        )
    
    return query.order_by(Project.created_at.desc()).offset(skip).limit(limit).all()


def create_project(db: Session, project_data: ProjectCreate, owner_id: UUID) -> Project:
    """
    Create a new project
    
    Args:
        db: Database session
        project_data: Project data
        owner_id: Owner user ID
        
    Returns:
        Created project object
    """
    db_project = Project(
        **project_data.dict(),
        owner_id=owner_id
    )
    
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    
    return db_project


def update_project(
    db: Session, 
    project_id: UUID, 
    project_data: ProjectUpdate, 
    user_id: UUID
) -> Project:
    """
    Update project
    
    Args:
        db: Database session
        project_id: Project ID
        project_data: Project data to update
        user_id: User ID (must be owner)
        
    Returns:
        Updated project object
    """
    project = get_project_by_id(db, project_id)
    
    # Only owner can update project
    if project.owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can update this project"
        )
    
    # Update project fields
    project_data_dict = project_data.dict(exclude_unset=True)
    for field, value in project_data_dict.items():
        setattr(project, field, value)
    
    db.add(project)
    db.commit()
    db.refresh(project)
    
    return project


def delete_project(db: Session, project_id: UUID, user_id: UUID) -> bool:
    """
    Delete project
    
    Args:
        db: Database session
        project_id: Project ID
        user_id: User ID (must be owner)
        
    Returns:
        True if successful
    """
    project = get_project_by_id(db, project_id)
    
    # Only owner can delete project
    if project.owner_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can delete this project"
        )
    
    db.delete(project)
    db.commit()
    
    return True


def add_user_to_project(db: Session, project_id: UUID, user_id: UUID, added_by_id: UUID) -> Project:
    """
    Add user to project
    
    Args:
        db: Database session
        project_id: Project ID
        user_id: User ID to add
        added_by_id: User ID adding the user (must be owner)
        
    Returns:
        Updated project object
    """
    project = get_project_by_id(db, project_id)
    
    # Only owner can add users
    if project.owner_id != added_by_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can add users to this project"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    # Check if user already in project
    if any(u.id == user_id for u in project.users):
        return project
    
    # Add user to project
    project.users.append(user)
    db.commit()
    db.refresh(project)
    
    return project


def remove_user_from_project(db: Session, project_id: UUID, user_id: UUID, removed_by_id: UUID) -> Project:
    """
    Remove user from project
    
    Args:
        db: Database session
        project_id: Project ID
        user_id: User ID to remove
        removed_by_id: User ID removing the user (must be owner)
        
    Returns:
        Updated project object
    """
    project = get_project_by_id(db, project_id)
    
    # Only owner can remove users
    if project.owner_id != removed_by_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the owner can remove users from this project"
        )
    
    # Check if user is owner
    if user_id == project.owner_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove owner from project"
        )
    
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    # Remove user from project
    project.users.remove(user)
    db.commit()
    db.refresh(project)
    
    return project


def get_project_stats(db: Session, project_id: UUID, user_id: UUID) -> Dict[str, Any]:
    """
    Get project statistics
    
    Args:
        db: Database session
        project_id: Project ID
        user_id: User ID to check access
        
    Returns:
        Project statistics
    """
    project = get_project_by_id(db, project_id, user_id)
    
    # Count data sources
    data_sources_count = len(project.data_sources)
    
    # Count data models
    data_models_count = len(project.data_models)
    
    # Count users
    users_count = len(project.users) + 1  # +1 for owner
    
    return {
        "id": project.id,
        "name": project.name,
        "data_sources_count": data_sources_count,
        "data_models_count": data_models_count,
        "users_count": users_count,
        "created_at": project.created_at,
        "updated_at": project.updated_at,
    }