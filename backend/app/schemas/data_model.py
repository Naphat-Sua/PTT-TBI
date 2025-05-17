from typing import Optional, Dict, Any, List, Union
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, validator

from app.models.data_model import ModelType, RelationshipType
from app.schemas.base import BaseSchema, BaseCreateSchema, BaseUpdateSchema


class AttributeBase(BaseModel):
    """Base schema for entity attributes (columns)"""
    name: str
    data_type: str
    description: Optional[str] = None
    length: Optional[int] = None
    precision: Optional[int] = None
    scale: Optional[int] = None
    is_nullable: bool = True
    is_primary_key: bool = False
    is_unique: bool = False
    default_value: Optional[str] = None
    check_constraint: Optional[str] = None
    position: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class AttributeCreate(BaseCreateSchema, AttributeBase):
    """Schema for creating an entity attribute"""
    pass


class AttributeUpdate(BaseUpdateSchema):
    """Schema for updating an entity attribute"""
    name: Optional[str] = None
    data_type: Optional[str] = None
    description: Optional[str] = None
    length: Optional[int] = None
    precision: Optional[int] = None
    scale: Optional[int] = None
    is_nullable: Optional[bool] = None
    is_primary_key: Optional[bool] = None
    is_unique: Optional[bool] = None
    default_value: Optional[str] = None
    check_constraint: Optional[str] = None
    position: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class Attribute(BaseSchema, AttributeBase):
    """Schema for attribute responses"""
    entity_id: UUID
    
    class Config:
        orm_mode = True


class EntityBase(BaseModel):
    """Base schema for entities (tables)"""
    name: str
    description: Optional[str] = None
    schema_name: Optional[str] = None
    table_name: Optional[str] = None
    is_view: bool = False
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    color: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class EntityCreate(BaseCreateSchema, EntityBase):
    """Schema for creating an entity"""
    attributes: Optional[List[AttributeCreate]] = None


class EntityUpdate(BaseUpdateSchema):
    """Schema for updating an entity"""
    name: Optional[str] = None
    description: Optional[str] = None
    schema_name: Optional[str] = None
    table_name: Optional[str] = None
    is_view: Optional[bool] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None
    color: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class Entity(BaseSchema, EntityBase):
    """Schema for entity responses"""
    data_model_id: UUID
    attributes: List[Attribute] = []
    
    class Config:
        orm_mode = True


class RelationshipAttributeMappingBase(BaseModel):
    """Base schema for mapping attributes in a relationship"""
    source_attribute_id: UUID
    target_attribute_id: UUID


class RelationshipAttributeMappingCreate(BaseCreateSchema, RelationshipAttributeMappingBase):
    """Schema for creating a relationship attribute mapping"""
    pass


class RelationshipAttributeMapping(BaseSchema, RelationshipAttributeMappingBase):
    """Schema for relationship attribute mapping responses"""
    relationship_id: UUID
    
    class Config:
        orm_mode = True


class RelationshipBase(BaseModel):
    """Base schema for relationships between entities"""
    name: Optional[str] = None
    description: Optional[str] = None
    source_entity_id: UUID
    target_entity_id: UUID
    relationship_type: RelationshipType
    identifying: bool = False
    cardinality_source: Optional[str] = None
    cardinality_target: Optional[str] = None
    verbalize_source_to_target: Optional[str] = None
    verbalize_target_to_source: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class RelationshipCreate(BaseCreateSchema, RelationshipBase):
    """Schema for creating a relationship"""
    attribute_mappings: List[RelationshipAttributeMappingCreate]


class RelationshipUpdate(BaseUpdateSchema):
    """Schema for updating a relationship"""
    name: Optional[str] = None
    description: Optional[str] = None
    relationship_type: Optional[RelationshipType] = None
    identifying: Optional[bool] = None
    cardinality_source: Optional[str] = None
    cardinality_target: Optional[str] = None
    verbalize_source_to_target: Optional[str] = None
    verbalize_target_to_source: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class Relationship(BaseSchema, RelationshipBase):
    """Schema for relationship responses"""
    attribute_mappings: List[RelationshipAttributeMapping] = []
    source_entity_name: Optional[str] = None
    target_entity_name: Optional[str] = None
    
    class Config:
        orm_mode = True


class DataModelDatasetBase(BaseModel):
    """Base schema for associating datasets with data models"""
    dataset_id: UUID


class DataModelDatasetCreate(BaseCreateSchema, DataModelDatasetBase):
    """Schema for creating a data model dataset association"""
    pass


class DataModelDataset(BaseSchema, DataModelDatasetBase):
    """Schema for data model dataset association responses"""
    data_model_id: UUID
    dataset_name: Optional[str] = None
    
    class Config:
        orm_mode = True


class DataModelBase(BaseModel):
    """Base schema for data models"""
    name: str
    description: Optional[str] = None
    model_type: ModelType
    version: Optional[str] = None
    database_dialect: Optional[str] = None
    layout_data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    tags: Optional[List[str]] = Field(default_factory=list)


class DataModelCreate(BaseCreateSchema, DataModelBase):
    """Schema for creating a data model"""
    project_id: UUID
    parent_model_id: Optional[UUID] = None
    entities: Optional[List[EntityCreate]] = None
    dataset_ids: Optional[List[UUID]] = None


class DataModelUpdate(BaseUpdateSchema):
    """Schema for updating a data model"""
    name: Optional[str] = None
    description: Optional[str] = None
    model_type: Optional[ModelType] = None
    version: Optional[str] = None
    database_dialect: Optional[str] = None
    layout_data: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    is_latest_version: Optional[bool] = None


class DataModelSummary(BaseSchema, DataModelBase):
    """Summary schema for data model responses"""
    project_id: UUID
    owner_id: UUID
    parent_model_id: Optional[UUID] = None
    is_latest_version: bool = True
    entity_count: int = 0
    relationship_count: int = 0
    
    class Config:
        orm_mode = True


class DataModel(DataModelSummary):
    """Full schema for data model responses"""
    entities: List[Entity] = []
    relationships: List[Relationship] = []
    datasets: List[DataModelDataset] = []
    
    class Config:
        orm_mode = True


class DDLGenerationOptions(BaseModel):
    """Options for DDL generation"""
    dialect: str  # "postgresql", "mysql", etc.
    include_comments: bool = True
    add_timestamps: bool = True
    add_foreign_keys: bool = True
    schema_name: Optional[str] = None


class GeneratedDDL(BaseModel):
    """Schema for generated DDL"""
    ddl_script: str
    dialect: str
    model_id: UUID
    generated_at: datetime = Field(default_factory=datetime.now)
    warnings: List[str] = []