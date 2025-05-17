from typing import Optional, List, Dict, Any, Set, Tuple
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
import uuid
import re

from app.models.data_model import DataModel, Entity, Attribute, Relationship, ModelType
from app.schemas.data_model import DataModelCreate, DataModelUpdate, EntityCreate, EntityUpdate, AttributeCreate, AttributeUpdate, RelationshipCreate, RelationshipUpdate, DDLGenerationOptions, GeneratedDDL
from app.services import project_service


def get_data_model_by_id(db: Session, model_id: UUID, user_id: UUID = None) -> DataModel:
    """
    Get data model by ID
    
    Args:
        db: Database session
        model_id: Data model ID
        user_id: User ID to check access
        
    Returns:
        Data model object
    """
    data_model = db.query(DataModel).filter(DataModel.id == model_id).first()
    
    if not data_model:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Data model with ID {model_id} not found"
        )
    
    # Check if user has access to the project that owns this data model
    if user_id:
        project_service.get_project_by_id(db, data_model.project_id, user_id)
    
    return data_model


def get_data_models(
    db: Session,
    project_id: UUID,
    user_id: UUID,
    skip: int = 0,
    limit: int = 100,
    model_type: Optional[ModelType] = None,
    only_latest: bool = True,
) -> List[DataModel]:
    """
    Get list of data models for a project
    
    Args:
        db: Database session
        project_id: Project ID
        user_id: User ID to check access
        skip: Skip N models
        limit: Limit number of models
        model_type: Filter by model type
        only_latest: Only return latest versions
        
    Returns:
        List of data models
    """
    # Check if user has access to the project
    project_service.get_project_by_id(db, project_id, user_id)
    
    # Build query
    query = db.query(DataModel).filter(DataModel.project_id == project_id)
    
    # Apply filters
    if model_type:
        query = query.filter(DataModel.model_type == model_type)
    
    if only_latest:
        query = query.filter(DataModel.is_latest_version == True)
        
    return query.order_by(DataModel.updated_at.desc()).offset(skip).limit(limit).all()


def create_data_model(db: Session, model_data: DataModelCreate, user_id: UUID) -> DataModel:
    """
    Create a new data model
    
    Args:
        db: Database session
        model_data: Data model data
        user_id: User ID creating the model
        
    Returns:
        Created data model object
    """
    # Check if user has access to the project
    project_service.get_project_by_id(db, model_data.project_id, user_id)
    
    # Extract model data
    model_dict = model_data.dict(exclude={"entities", "dataset_ids"})
    model_dict["owner_id"] = user_id
    
    # Create new model
    data_model = DataModel(**model_dict)
    db.add(data_model)
    db.flush()  # Get ID without committing transaction
    
    # Add entities if provided
    if model_data.entities:
        for entity_data in model_data.entities:
            create_entity(db, data_model.id, entity_data)
    
    # Associate datasets if provided
    if model_data.dataset_ids:
        for dataset_id in model_data.dataset_ids:
            # This would be implemented in dataset_service.py
            # Associate dataset with model
            pass
    
    db.commit()
    db.refresh(data_model)
    
    return data_model


def update_data_model(db: Session, model_id: UUID, model_data: DataModelUpdate, user_id: UUID) -> DataModel:
    """
    Update data model
    
    Args:
        db: Database session
        model_id: Data model ID
        model_data: Data model data to update
        user_id: User ID updating the model
        
    Returns:
        Updated data model object
    """
    data_model = get_data_model_by_id(db, model_id, user_id)
    
    # Update fields
    model_data_dict = model_data.dict(exclude_unset=True)
    for field, value in model_data_dict.items():
        setattr(data_model, field, value)
    
    db.add(data_model)
    db.commit()
    db.refresh(data_model)
    
    return data_model


def delete_data_model(db: Session, model_id: UUID, user_id: UUID) -> bool:
    """
    Delete data model
    
    Args:
        db: Database session
        model_id: Data model ID
        user_id: User ID deleting the model
        
    Returns:
        True if successful
    """
    data_model = get_data_model_by_id(db, model_id, user_id)
    
    # Delete all entities and their attributes (cascade delete for relationships)
    db.delete(data_model)
    db.commit()
    
    return True


def create_version(db: Session, model_id: UUID, user_id: UUID) -> DataModel:
    """
    Create a new version of a data model
    
    Args:
        db: Database session
        model_id: Data model ID to create version from
        user_id: User ID creating the version
        
    Returns:
        New data model version
    """
    source_model = get_data_model_by_id(db, model_id, user_id)
    
    # Create new version
    new_model = DataModel(
        name=source_model.name,
        description=source_model.description,
        model_type=source_model.model_type,
        project_id=source_model.project_id,
        owner_id=user_id,
        parent_model_id=source_model.id,
        version=_increment_version(source_model.version),
        database_dialect=source_model.database_dialect,
        layout_data=source_model.layout_data,
        metadata=source_model.metadata,
        tags=source_model.tags,
        is_latest_version=True
    )
    
    # Update old version
    source_model.is_latest_version = False
    
    db.add(source_model)
    db.add(new_model)
    db.flush()  # Get ID without committing transaction
    
    # Copy entities and attributes
    entity_id_map = {}  # Maps old entity IDs to new entity IDs
    attribute_id_map = {}  # Maps old attribute IDs to new attribute IDs
    
    # Copy entities
    for source_entity in source_model.entities:
        new_entity = Entity(
            data_model_id=new_model.id,
            name=source_entity.name,
            description=source_entity.description,
            schema_name=source_entity.schema_name,
            table_name=source_entity.table_name,
            is_view=source_entity.is_view,
            position_x=source_entity.position_x,
            position_y=source_entity.position_y,
            color=source_entity.color,
            metadata=source_entity.metadata,
        )
        db.add(new_entity)
        db.flush()
        
        entity_id_map[source_entity.id] = new_entity.id
        
        # Copy attributes
        for source_attr in source_entity.attributes:
            new_attr = Attribute(
                entity_id=new_entity.id,
                name=source_attr.name,
                data_type=source_attr.data_type,
                description=source_attr.description,
                length=source_attr.length,
                precision=source_attr.precision,
                scale=source_attr.scale,
                is_nullable=source_attr.is_nullable,
                is_primary_key=source_attr.is_primary_key,
                is_unique=source_attr.is_unique,
                default_value=source_attr.default_value,
                check_constraint=source_attr.check_constraint,
                position=source_attr.position,
                metadata=source_attr.metadata,
            )
            db.add(new_attr)
            db.flush()
            
            attribute_id_map[source_attr.id] = new_attr.id
    
    # Copy relationships (now that we have all entity and attribute IDs mapped)
    for source_rel in source_model.relationships:
        # Skip if source or target entity was not copied
        if (source_rel.source_entity_id not in entity_id_map or
                source_rel.target_entity_id not in entity_id_map):
            continue
            
        new_rel = Relationship(
            data_model_id=new_model.id,
            name=source_rel.name,
            description=source_rel.description,
            source_entity_id=entity_id_map[source_rel.source_entity_id],
            target_entity_id=entity_id_map[source_rel.target_entity_id],
            relationship_type=source_rel.relationship_type,
            identifying=source_rel.identifying,
            cardinality_source=source_rel.cardinality_source,
            cardinality_target=source_rel.cardinality_target,
            verbalize_source_to_target=source_rel.verbalize_source_to_target,
            verbalize_target_to_source=source_rel.verbalize_target_to_source,
            metadata=source_rel.metadata,
        )
        db.add(new_rel)
        db.flush()
        
        # Copy attribute mappings
        for mapping in source_rel.attribute_mappings:
            # Skip if source or target attribute was not copied
            if (mapping.source_attribute_id not in attribute_id_map or
                    mapping.target_attribute_id not in attribute_id_map):
                continue
                
            new_mapping = RelationshipAttributeMapping(
                relationship_id=new_rel.id,
                source_attribute_id=attribute_id_map[mapping.source_attribute_id],
                target_attribute_id=attribute_id_map[mapping.target_attribute_id],
            )
            db.add(new_mapping)
    
    db.commit()
    db.refresh(new_model)
    
    return new_model


def get_entity_by_id(db: Session, entity_id: UUID, user_id: UUID = None) -> Entity:
    """
    Get entity by ID
    
    Args:
        db: Database session
        entity_id: Entity ID
        user_id: User ID to check access
        
    Returns:
        Entity object
    """
    entity = db.query(Entity).filter(Entity.id == entity_id).first()
    
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Entity with ID {entity_id} not found"
        )
    
    # Check if user has access to the data model that owns this entity
    if user_id:
        data_model = get_data_model_by_id(db, entity.data_model_id, user_id)
    
    return entity


def create_entity(db: Session, model_id: UUID, entity_data: EntityCreate) -> Entity:
    """
    Create a new entity in a data model
    
    Args:
        db: Database session
        model_id: Data model ID
        entity_data: Entity data
        
    Returns:
        Created entity object
    """
    # Extract entity data
    entity_dict = entity_data.dict(exclude={"attributes"})
    entity_dict["data_model_id"] = model_id
    
    # Create entity
    entity = Entity(**entity_dict)
    db.add(entity)
    db.flush()  # Get ID without committing transaction
    
    # Add attributes if provided
    if entity_data.attributes:
        for attr_data in entity_data.attributes:
            create_attribute(db, entity.id, attr_data)
    
    db.commit()
    db.refresh(entity)
    
    return entity


def update_entity(db: Session, entity_id: UUID, entity_data: EntityUpdate, user_id: UUID) -> Entity:
    """
    Update entity
    
    Args:
        db: Database session
        entity_id: Entity ID
        entity_data: Entity data to update
        user_id: User ID updating the entity
        
    Returns:
        Updated entity object
    """
    entity = get_entity_by_id(db, entity_id, user_id)
    
    # Update fields
    entity_data_dict = entity_data.dict(exclude_unset=True)
    for field, value in entity_data_dict.items():
        setattr(entity, field, value)
    
    db.add(entity)
    db.commit()
    db.refresh(entity)
    
    return entity


def delete_entity(db: Session, entity_id: UUID, user_id: UUID) -> bool:
    """
    Delete entity
    
    Args:
        db: Database session
        entity_id: Entity ID
        user_id: User ID deleting the entity
        
    Returns:
        True if successful
    """
    entity = get_entity_by_id(db, entity_id, user_id)
    
    db.delete(entity)
    db.commit()
    
    return True


def get_attribute_by_id(db: Session, attribute_id: UUID, user_id: UUID = None) -> Attribute:
    """
    Get attribute by ID
    
    Args:
        db: Database session
        attribute_id: Attribute ID
        user_id: User ID to check access
        
    Returns:
        Attribute object
    """
    attribute = db.query(Attribute).filter(Attribute.id == attribute_id).first()
    
    if not attribute:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attribute with ID {attribute_id} not found"
        )
    
    # Check if user has access to the entity that owns this attribute
    if user_id:
        entity = get_entity_by_id(db, attribute.entity_id, user_id)
    
    return attribute


def create_attribute(db: Session, entity_id: UUID, attribute_data: AttributeCreate) -> Attribute:
    """
    Create a new attribute for an entity
    
    Args:
        db: Database session
        entity_id: Entity ID
        attribute_data: Attribute data
        
    Returns:
        Created attribute object
    """
    # Create attribute
    attribute_dict = attribute_data.dict()
    attribute_dict["entity_id"] = entity_id
    
    attribute = Attribute(**attribute_dict)
    db.add(attribute)
    db.commit()
    db.refresh(attribute)
    
    return attribute


def update_attribute(db: Session, attribute_id: UUID, attribute_data: AttributeUpdate, user_id: UUID) -> Attribute:
    """
    Update attribute
    
    Args:
        db: Database session
        attribute_id: Attribute ID
        attribute_data: Attribute data to update
        user_id: User ID updating the attribute
        
    Returns:
        Updated attribute object
    """
    attribute = get_attribute_by_id(db, attribute_id, user_id)
    
    # Update fields
    attribute_data_dict = attribute_data.dict(exclude_unset=True)
    for field, value in attribute_data_dict.items():
        setattr(attribute, field, value)
    
    db.add(attribute)
    db.commit()
    db.refresh(attribute)
    
    return attribute


def delete_attribute(db: Session, attribute_id: UUID, user_id: UUID) -> bool:
    """
    Delete attribute
    
    Args:
        db: Database session
        attribute_id: Attribute ID
        user_id: User ID deleting the attribute
        
    Returns:
        True if successful
    """
    attribute = get_attribute_by_id(db, attribute_id, user_id)
    
    db.delete(attribute)
    db.commit()
    
    return True


def get_relationship_by_id(db: Session, relationship_id: UUID, user_id: UUID = None) -> Relationship:
    """
    Get relationship by ID
    
    Args:
        db: Database session
        relationship_id: Relationship ID
        user_id: User ID to check access
        
    Returns:
        Relationship object
    """
    relationship = db.query(Relationship).filter(Relationship.id == relationship_id).first()
    
    if not relationship:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Relationship with ID {relationship_id} not found"
        )
    
    # Check if user has access to the data model that owns this relationship
    if user_id:
        data_model = get_data_model_by_id(db, relationship.data_model_id, user_id)
    
    return relationship


def create_relationship(db: Session, model_id: UUID, relationship_data: RelationshipCreate, user_id: UUID) -> Relationship:
    """
    Create a new relationship between entities
    
    Args:
        db: Database session
        model_id: Data model ID
        relationship_data: Relationship data
        user_id: User ID creating the relationship
        
    Returns:
        Created relationship object
    """
    # Check if source and target entities exist and belong to the model
    source_entity = get_entity_by_id(db, relationship_data.source_entity_id, user_id)
    target_entity = get_entity_by_id(db, relationship_data.target_entity_id, user_id)
    
    if source_entity.data_model_id != model_id or target_entity.data_model_id != model_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Source and target entities must belong to the same data model"
        )
    
    # Extract relationship data
    relationship_dict = relationship_data.dict(exclude={"attribute_mappings"})
    relationship_dict["data_model_id"] = model_id
    
    # Create relationship
    relationship = Relationship(**relationship_dict)
    db.add(relationship)
    db.flush()  # Get ID without committing transaction
    
    # Create attribute mappings
    for mapping_data in relationship_data.attribute_mappings:
        # Check if attributes exist and belong to the respective entities
        source_attr = get_attribute_by_id(db, mapping_data.source_attribute_id, user_id)
        target_attr = get_attribute_by_id(db, mapping_data.target_attribute_id, user_id)
        
        if source_attr.entity_id != relationship_data.source_entity_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Source attribute {mapping_data.source_attribute_id} does not belong to source entity"
            )
            
        if target_attr.entity_id != relationship_data.target_entity_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Target attribute {mapping_data.target_attribute_id} does not belong to target entity"
            )
        
        # Create mapping
        mapping = RelationshipAttributeMapping(
            relationship_id=relationship.id,
            source_attribute_id=mapping_data.source_attribute_id,
            target_attribute_id=mapping_data.target_attribute_id,
        )
        db.add(mapping)
    
    db.commit()
    db.refresh(relationship)
    
    return relationship


def update_relationship(db: Session, relationship_id: UUID, relationship_data: RelationshipUpdate, user_id: UUID) -> Relationship:
    """
    Update relationship
    
    Args:
        db: Database session
        relationship_id: Relationship ID
        relationship_data: Relationship data to update
        user_id: User ID updating the relationship
        
    Returns:
        Updated relationship object
    """
    relationship = get_relationship_by_id(db, relationship_id, user_id)
    
    # Update fields
    relationship_data_dict = relationship_data.dict(exclude_unset=True)
    for field, value in relationship_data_dict.items():
        setattr(relationship, field, value)
    
    db.add(relationship)
    db.commit()
    db.refresh(relationship)
    
    return relationship


def delete_relationship(db: Session, relationship_id: UUID, user_id: UUID) -> bool:
    """
    Delete relationship
    
    Args:
        db: Database session
        relationship_id: Relationship ID
        user_id: User ID deleting the relationship
        
    Returns:
        True if successful
    """
    relationship = get_relationship_by_id(db, relationship_id, user_id)
    
    db.delete(relationship)
    db.commit()
    
    return True


def _increment_version(current_version: Optional[str] = None) -> str:
    """
    Increment version string (e.g. "1.0.0" -> "1.0.1")
    
    Args:
        current_version: Current version string
        
    Returns:
        Incremented version string
    """
    if not current_version:
        return "1.0.0"
    
    # Try to parse semantic versioning (MAJOR.MINOR.PATCH)
    match = re.match(r"^(\d+)\.(\d+)\.(\d+)$", current_version)
    if match:
        major, minor, patch = map(int, match.groups())
        return f"{major}.{minor}.{patch + 1}"
    
    # Try to parse simple integer versioning
    try:
        version_num = int(current_version)
        return str(version_num + 1)
    except ValueError:
        # If all else fails, append "-new" to the version
        return f"{current_version}-new"