from typing import Optional, Dict, Any, List
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, validator

from app.models.data_source import DataSourceType, DatabaseType, DataFileType

class DataSourceBase(BaseModel):
    """Base data source schema with common fields"""
    name: Optional[str] = None
    description: Optional[str] = None
    source_type: Optional[DataSourceType] = None
    is_active: Optional[bool] = True
    metadata: Optional[Dict[str, Any]] = None


class DataSourceCreate(DataSourceBase):
    """Schema for creating a new data source"""
    name: str = Field(..., min_length=1, max_length=100)
    project_id: UUID
    source_type: DataSourceType
    
    # File source fields
    file_type: Optional[DataFileType] = None
    
    # Database source fields
    database_type: Optional[DatabaseType] = None
    connection_string: Optional[str] = None
    schema_name: Optional[str] = None
    
    # API source fields
    api_url: Optional[str] = None
    api_auth_type: Optional[str] = None
    
    # Credentials (will be encrypted)
    credentials: Optional[Dict[str, Any]] = None


class DataSourceUpdate(DataSourceBase):
    """Schema for updating data source information"""
    connection_string: Optional[str] = None
    schema_name: Optional[str] = None
    api_url: Optional[str] = None
    credentials: Optional[Dict[str, Any]] = None


class DataSourceInDBBase(DataSourceBase):
    """Schema for data source stored in DB"""
    id: UUID
    project_id: UUID
    owner_id: UUID
    created_at: datetime
    updated_at: datetime
    
    # File source fields
    file_path: Optional[str] = None
    file_type: Optional[DataFileType] = None
    file_size: Optional[int] = None
    
    # Database source fields
    database_type: Optional[DatabaseType] = None
    schema_name: Optional[str] = None
    
    # API source fields
    api_url: Optional[str] = None
    api_auth_type: Optional[str] = None
    
    last_sync: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class DataSource(DataSourceInDBBase):
    """Schema for data source returned to client"""
    pass


class DataSourcesResponse(BaseModel):
    """Schema for paginated data sources response"""
    items: List[DataSource]
    total: int


class TestConnectionResponse(BaseModel):
    """Schema for connection test response"""
    success: bool
    message: str
    details: Optional[Dict[str, Any]] = None