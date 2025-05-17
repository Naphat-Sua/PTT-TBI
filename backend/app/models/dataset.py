import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, JSON, Enum, DateTime, Table
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.base import Base as ModelBase


class DatasetStatus(str, enum.Enum):
    """Dataset status enum for tracking dataset processing"""
    DRAFT = "draft"
    IMPORTING = "importing"
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"
    ARCHIVED = "archived"


class DatasetType(str, enum.Enum):
    """Dataset type enum"""
    TABLE = "table"
    TIMESERIES = "timeseries"
    DOCUMENT = "document"
    GRAPH = "graph"
    GEOSPATIAL = "geospatial"
    OTHER = "other"


class Dataset(Base, ModelBase):
    """Dataset model representing imported data tables"""
    __tablename__ = "datasets"

    name = Column(String, nullable=False, index=True)
    description = Column(String)
    status = Column(Enum(DatasetStatus), default=DatasetStatus.DRAFT, nullable=False)
    dataset_type = Column(Enum(DatasetType), default=DatasetType.TABLE, nullable=False)
    
    # Dataset properties
    row_count = Column(Integer)
    size_bytes = Column(Integer)
    
    # For databases: schema.table_name
    # For files: filename or path
    # For APIs: endpoint or resource name
    source_reference = Column(String)
    
    # Dataset schema and metadata
    schema = Column(JSONB)  # JSON schema describing the dataset structure
    sample_data = Column(JSONB)  # Sample records from the dataset
    
    # Processing metadata
    last_imported_at = Column(DateTime, nullable=True)
    last_processed_at = Column(DateTime, nullable=True)
    refresh_frequency = Column(String)  # e.g., "daily", "hourly", "manual"
    error_details = Column(JSON)
    
    # General properties
    tags = Column(ARRAY(String))
    metadata = Column(JSON, default={})
    settings = Column(JSON, default={})
    
    # Foreign keys
    data_source_id = Column(UUID(as_uuid=True), ForeignKey("data_sources.id", ondelete="CASCADE"), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    data_source = relationship("DataSource", back_populates="datasets")
    owner = relationship("User", back_populates="datasets")
    data_models = relationship("DataModel", secondary="dataset_data_models", back_populates="datasets")
    
    def get_field_names(self):
        """Get list of field names from dataset schema"""
        if not self.schema or not isinstance(self.schema, dict) or "fields" not in self.schema:
            return []
            
        return [field.get("name") for field in self.schema.get("fields", []) if "name" in field]
    
    def get_primary_keys(self):
        """Get list of primary key fields from dataset schema"""
        if not self.schema or not isinstance(self.schema, dict) or "fields" not in self.schema:
            return []
            
        return [field.get("name") for field in self.schema.get("fields", []) 
                if "name" in field and field.get("is_primary_key", False)]


class DatasetColumn(Base, ModelBase):
    """Model for dataset columns"""
    __tablename__ = "dataset_columns"

    name = Column(String, nullable=False)
    data_type = Column(String, nullable=False)
    description = Column(String)
    
    # Column properties
    is_nullable = Column(Boolean)
    is_primary_key = Column(Boolean, default=False)
    is_foreign_key = Column(Boolean, default=False)
    references_column_id = Column(UUID(as_uuid=True), ForeignKey("dataset_columns.id", ondelete="SET NULL"))
    
    # Column statistics
    distinct_count = Column(Integer)
    null_count = Column(Integer)
    min_value = Column(String)
    max_value = Column(String)
    mean = Column(Float)
    median = Column(Float)
    std_dev = Column(Float)
    quantiles = Column(JSON)  # e.g., {"25%": 10, "50%": 15, "75%": 20}
    histogram = Column(JSON)  # Histogram data for visualization
    top_values = Column(JSON)  # Most frequent values and counts
    
    # Additional metadata
    data_quality_rules = Column(JSON)  # Rules for data validation
    transformations = Column(JSON)  # Applied transformations
    tags = Column(ARRAY(String))
    metadata = Column(JSON)
    
    # Foreign keys
    dataset_id = Column(UUID(as_uuid=True), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    dataset = relationship("Dataset", back_populates="columns")
    referenced_by = relationship("DatasetColumn", 
                                remote_side=[id],
                                uselist=True,
                                foreign_keys=[references_column_id])