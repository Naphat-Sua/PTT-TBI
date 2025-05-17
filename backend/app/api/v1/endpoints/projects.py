from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Any, List, Dict
from uuid import UUID

from app.db.session import get_db
from app.models.user import User
from app.schemas.project import Project, ProjectCreate, ProjectUpdate, ProjectUserAdd
from app.schemas.base import SuccessResponse
from app.services import project_service
from app.security.deps import get_current_user, get_editor_user

router = APIRouter()


@router.get("/", response_model=List[Project])
def get_projects(
    skip: int = 0,
    limit: int = 100,
    include_public: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get list of projects accessible by current user
    """
    return project_service.get_projects(
        db,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        include_public=include_public
    )


@router.post("/", response_model=Project, status_code=status.HTTP_201_CREATED)
def create_project(
    project_data: ProjectCreate,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Create a new project
    """
    return project_service.create_project(db, project_data, current_user.id)


@router.get("/{project_id}", response_model=Project)
def get_project(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get project by ID
    """
    return project_service.get_project_by_id(db, project_id, current_user.id)


@router.put("/{project_id}", response_model=Project)
def update_project(
    project_id: UUID,
    project_data: ProjectUpdate,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update project
    """
    return project_service.update_project(db, project_id, project_data, current_user.id)


@router.delete("/{project_id}", response_model=SuccessResponse)
def delete_project(
    project_id: UUID,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Delete project
    """
    project_service.delete_project(db, project_id, current_user.id)
    return {"success": True, "message": f"Project {project_id} deleted successfully"}


@router.post("/{project_id}/users", response_model=Project)
def add_user_to_project(
    project_id: UUID,
    user_data: ProjectUserAdd,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Add a user to a project
    """
    return project_service.add_user_to_project(
        db, project_id, user_data.user_id, current_user.id
    )


@router.delete("/{project_id}/users/{user_id}", response_model=Project)
def remove_user_from_project(
    project_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Remove a user from a project
    """
    return project_service.remove_user_from_project(
        db, project_id, user_id, current_user.id
    )


@router.get("/{project_id}/stats", response_model=Dict)
def get_project_stats(
    project_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get project statistics
    """
    return project_service.get_project_stats(db, project_id, current_user.id)