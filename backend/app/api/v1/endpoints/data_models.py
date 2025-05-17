from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import Any, List, Dict, Optional
from uuid import UUID

from app.db.session import get_db
from app.models.user import User
from app.models.data_model import ModelType
from app.schemas.data_model import (
    DataModel, DataModelCreate, DataModelUpdate,
    Entity, EntityCreate, EntityUpdate,
    Attribute, AttributeCreate, AttributeUpdate,
    Relationship, RelationshipCreate, RelationshipUpdate,
    DDLGenerationOptions, GeneratedDDL
)
from app.schemas.base import SuccessResponse
from app.services import data_model_service
from app.security.deps import get_current_user, get_editor_user

router = APIRouter()


@router.get("/", response_model=List[DataModel])
def get_data_models(
    project_id: UUID,
    skip: int = 0,
    limit: int = 100,
    model_type: Optional[ModelType] = None,
    only_latest: bool = Query(True, description="Only return latest versions"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get list of data models for a project
    """
    return data_model_service.get_data_models(
        db,
        project_id=project_id,
        user_id=current_user.id,
        skip=skip,
        limit=limit,
        model_type=model_type,
        only_latest=only_latest
    )


@router.post("/", response_model=DataModel, status_code=status.HTTP_201_CREATED)
def create_data_model(
    model_data: DataModelCreate,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Create new data model
    """
    return data_model_service.create_data_model(db, model_data, current_user.id)


@router.get("/{model_id}", response_model=DataModel)
def get_data_model(
    model_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Get data model by ID
    """
    return data_model_service.get_data_model_by_id(db, model_id, current_user.id)


@router.put("/{model_id}", response_model=DataModel)
def update_data_model(
    model_id: UUID,
    model_data: DataModelUpdate,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update data model
    """
    return data_model_service.update_data_model(db, model_id, model_data, current_user.id)


@router.delete("/{model_id}", response_model=SuccessResponse)
def delete_data_model(
    model_id: UUID,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Delete data model
    """
    data_model_service.delete_data_model(db, model_id, current_user.id)
    return {"success": True, "message": f"Data model {model_id} deleted successfully"}


@router.post("/{model_id}/version", response_model=DataModel)
def create_data_model_version(
    model_id: UUID,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Create new version of data model
    """
    return data_model_service.create_version(db, model_id, current_user.id)


# Entity endpoints
@router.post("/{model_id}/entities", response_model=Entity, status_code=status.HTTP_201_CREATED)
def create_entity(
    model_id: UUID,
    entity_data: EntityCreate,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Create entity in data model
    """
    # Verify user has access to model first
    data_model_service.get_data_model_by_id(db, model_id, current_user.id)
    return data_model_service.create_entity(db, model_id, entity_data)


@router.put("/entities/{entity_id}", response_model=Entity)
def update_entity(
    entity_id: UUID,
    entity_data: EntityUpdate,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update entity
    """
    return data_model_service.update_entity(db, entity_id, entity_data, current_user.id)


@router.delete("/entities/{entity_id}", response_model=SuccessResponse)
def delete_entity(
    entity_id: UUID,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Delete entity
    """
    data_model_service.delete_entity(db, entity_id, current_user.id)
    return {"success": True, "message": f"Entity {entity_id} deleted successfully"}


# Attribute endpoints
@router.post("/entities/{entity_id}/attributes", response_model=Attribute, status_code=status.HTTP_201_CREATED)
def create_attribute(
    entity_id: UUID,
    attribute_data: AttributeCreate,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Create attribute for entity
    """
    # Verify user has access to entity first
    data_model_service.get_entity_by_id(db, entity_id, current_user.id)
    return data_model_service.create_attribute(db, entity_id, attribute_data)


@router.put("/attributes/{attribute_id}", response_model=Attribute)
def update_attribute(
    attribute_id: UUID,
    attribute_data: AttributeUpdate,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update attribute
    """
    return data_model_service.update_attribute(db, attribute_id, attribute_data, current_user.id)


@router.delete("/attributes/{attribute_id}", response_model=SuccessResponse)
def delete_attribute(
    attribute_id: UUID,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Delete attribute
    """
    data_model_service.delete_attribute(db, attribute_id, current_user.id)
    return {"success": True, "message": f"Attribute {attribute_id} deleted successfully"}


# Relationship endpoints
@router.post("/{model_id}/relationships", response_model=Relationship, status_code=status.HTTP_201_CREATED)
def create_relationship(
    model_id: UUID,
    relationship_data: RelationshipCreate,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Create relationship between entities
    """
    return data_model_service.create_relationship(db, model_id, relationship_data, current_user.id)


@router.put("/relationships/{relationship_id}", response_model=Relationship)
def update_relationship(
    relationship_id: UUID,
    relationship_data: RelationshipUpdate,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Update relationship
    """
    return data_model_service.update_relationship(db, relationship_id, relationship_data, current_user.id)


@router.delete("/relationships/{relationship_id}", response_model=SuccessResponse)
def delete_relationship(
    relationship_id: UUID,
    current_user: User = Depends(get_editor_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Delete relationship
    """
    data_model_service.delete_relationship(db, relationship_id, current_user.id)
    return {"success": True, "message": f"Relationship {relationship_id} deleted successfully"}


# DDL generation endpoint
@router.post("/{model_id}/generate-ddl", response_model=GeneratedDDL)
def generate_ddl(
    model_id: UUID,
    options: DDLGenerationOptions,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    """
    Generate DDL statements for data model
    """
    # This would typically call a DDL generation service
    # For now, we'll return a placeholder
    data_model = data_model_service.get_data_model_by_id(db, model_id, current_user.id)
    
    return {
        "model_id": model_id,
        "ddl": f"-- Generated DDL for model: {data_model.name}\n-- Using dialect: {options.dialect}\n\n-- Placeholder DDL\n\n-- Generated tables would appear here\n",
        "dialect": options.dialect,
        "includes_foreign_keys": options.include_foreign_keys,
        "includes_indexes": options.include_indexes,
        "generated_at": datetime.now()
    }