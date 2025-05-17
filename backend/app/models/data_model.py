import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, JSON, Enum, DateTime, Table
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.base import Base as ModelBase


class ModelType(str, enum.Enum):
    """Enum for data model types"""
    LOGICAL = "logical"      # Conceptual data model
    PHYSICAL = "physical"    # Physical data model with database details
    DIMENSIONAL = "dimensional"  # Star or snowflake schema
    HYBRID = "hybrid"        # Mixed modeling approach


class RelationshipType(str, enum.Enum):
    """Enum for relationship types between entities"""
    ONE_TO_ONE = "one_to_one"
    ONE_TO_MANY = "one_to_many"
    MANY_TO_ONE = "many_to_one"
    MANY_TO_MANY = "many_to_many"
    INHERITANCE = "inheritance"


# Association table for linking datasets to data models
data_model_dataset = Table(
    "data_model_datasets",
    Base.metadata,
    Column("data_model_id", UUID(as_uuid=True), ForeignKey("data_models.id", ondelete="CASCADE"), primary_key=True),
    Column("dataset_id", UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), primary_key=True),
)


class DataModel(Base, ModelBase):
    """Data model for organizing entities and relationships"""
    __tablename__ = "data_models"

    name = Column(String, nullable=False, index=True)
    description = Column(String)
    model_type = Column(Enum(ModelType), nullable=False)
    
    # Versioning
    version = Column(String)
    is_latest_version = Column(Boolean, default=True)
    parent_model_id = Column(UUID(as_uuid=True), ForeignKey("data_models.id"), nullable=True)
    
    # Database information for physical models
    database_dialect = Column(String)  # postgresql, mysql, etc.
    
    # Layout information for diagram
    layout_data = Column(JSON)
    
    # Tags for categorization
    tags = Column(ARRAY(String))
    
    # JSON field for flexible metadata
    metadata = Column(JSON, default={})
    
    # Foreign keys
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    project = relationship("Project", back_populates="data_models")
    owner = relationship("User", back_populates="data_models")
    entities = relationship("Entity", back_populates="data_model", cascade="all, delete-orphan")
    relationships = relationship("Relationship", back_populates="data_model", cascade="all, delete-orphan", foreign_keys="Relationship.data_model_id")
    datasets = relationship("DataModelDataset", back_populates="data_model")
    
    # Version relationships
    parent_model = relationship("DataModel", remote_side=[id], backref="child_models")


class DataModelDataset(Base, ModelBase):
    """Association model between data models and datasets with additional metadata"""
    __tablename__ = "data_model_datasets"
    
    data_model_id = Column(UUID(as_uuid=True), ForeignKey("data_models.id", ondelete="CASCADE"), primary_key=True)
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), primary_key=True)
    
    # Metadata about the association
    role = Column(String)  # What role this dataset plays in the model
    mapping_info = Column(JSON)  # Custom mapping information
    
    # Relationships
    data_model = relationship("DataModel", back_populates="datasets")
    dataset = relationship("Dataset", back_populates="data_model_datasets")


class Entity(Base, ModelBase):
    """Entity (table) in a data model"""
    __tablename__ = "entities"

    name = Column(String, nullable=False)
    description = Column(String)
    
    # Physical information
    schema_name = Column(String)
    table_name = Column(String)
    is_view = Column(Boolean, default=False)
    
    # Diagram information
    position_x = Column(Integer)
    position_y = Column(Integer)
    color = Column(String)
    
    # Metadata
    metadata = Column(JSON)
    
    # Foreign keys
    data_model_id = Column(UUID(as_uuid=True), ForeignKey("data_models.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    data_model = relationship("DataModel", back_populates="entities")
    attributes = relationship("Attribute", back_populates="entity", cascade="all, delete-orphan")
    source_relationships = relationship("Relationship", foreign_keys="Relationship.source_entity_id", back_populates="source_entity")
    target_relationships = relationship("Relationship", foreign_keys="Relationship.target_entity_id", back_populates="target_entity")


class Attribute(Base, ModelBase):
    """Attribute (column) in an entity"""
    __tablename__ = "attributes"

    name = Column(String, nullable=False)
    description = Column(String)
    data_type = Column(String, nullable=False)
    
    # Data type details
    length = Column(Integer)
    precision = Column(Integer)
    scale = Column(Integer)
    
    # Column properties
    is_nullable = Column(Boolean, default=True)
    is_primary_key = Column(Boolean, default=False)
    is_unique = Column(Boolean, default=False)
    default_value = Column(String)
    check_constraint = Column(String)
    position = Column(Integer)  # Order in the entity
    
    # Metadata
    metadata = Column(JSON)
    
    # Foreign keys
    entity_id = Column(UUID(as_uuid=True), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    entity = relationship("Entity", back_populates="attributes")
    source_mappings = relationship("RelationshipAttribute", foreign_keys="RelationshipAttribute.source_attribute_id", back_populates="source_attribute")
    target_mappings = relationship("RelationshipAttribute", foreign_keys="RelationshipAttribute.target_attribute_id", back_populates="target_attribute")


class Relationship(Base, ModelBase):
    """Relationship between entities in a data model"""
    __tablename__ = "relationships"

    name = Column(String)
    description = Column(String)
    relationship_type = Column(Enum(RelationshipType), nullable=False)
    
    # Physical properties
    identifying = Column(Boolean, default=False)  # Whether the relationship is identifying (affects primary key)
    
    # Cardinality
    cardinality_source = Column(String)  # e.g., "0..1", "1", "0..*", "1..*"
    cardinality_target = Column(String)
    
    # Verbalization
    verbalize_source_to_target = Column(String)  # e.g., "Customer has Orders"
    verbalize_target_to_source = Column(String)  # e.g., "Order belongs to Customer"
    
    # Metadata
    metadata = Column(JSON)
    
    # Foreign keys
    data_model_id = Column(UUID(as_uuid=True), ForeignKey("data_models.id", ondelete="CASCADE"), nullable=False)
    source_entity_id = Column(UUID(as_uuid=True), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    target_entity_id = Column(UUID(as_uuid=True), ForeignKey("entities.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    data_model = relationship("DataModel", back_populates="relationships", foreign_keys=[data_model_id])
    source_entity = relationship("Entity", foreign_keys=[source_entity_id], back_populates="source_relationships")
    target_entity = relationship("Entity", foreign_keys=[target_entity_id], back_populates="target_relationships")
    attribute_mappings = relationship("RelationshipAttribute", back_populates="relationship", cascade="all, delete-orphan")


class RelationshipAttribute(Base, ModelBase):
    """Mapping between attributes in a relationship"""
    __tablename__ = "relationship_attributes"

    # Foreign keys
    relationship_id = Column(UUID(as_uuid=True), ForeignKey("relationships.id", ondelete="CASCADE"), nullable=False)
    source_attribute_id = Column(UUID(as_uuid=True), ForeignKey("attributes.id", ondelete="CASCADE"), nullable=False)
    target_attribute_id = Column(UUID(as_uuid=True), ForeignKey("attributes.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    relationship = relationship("Relationship", back_populates="attribute_mappings")
    source_attribute = relationship("Attribute", foreign_keys=[source_attribute_id], back_populates="source_mappings")
    target_attribute = relationship("Attribute", foreign_keys=[target_attribute_id], back_populates="target_mappings")