from typing import Optional, Dict, Any, List, Union
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field, validator

from app.models.dataset import DatasetStatus
from app.schemas.base import BaseSchema, BaseCreateSchema, BaseUpdateSchema


class ColumnStatistics(BaseModel):
    """Statistics for a column in a dataset"""
    distinct_count: Optional[int] = None
    null_count: Optional[int] = None
    min_value: Optional[str] = None
    max_value: Optional[str] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    std_dev: Optional[float] = None
    quantiles: Optional[Dict[str, Union[float, str]]] = None
    histogram: Optional[Dict[str, Any]] = None
    top_values: Optional[Dict[str, int]] = None


class DataQualityRule(BaseModel):
    """Data quality rule for a column"""
    rule_type: str  # e.g., "not_null", "unique", "regex", "range"
    parameters: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    severity: str = "error"  # "info", "warning", "error", "critical"
    enabled: bool = True


class DatasetColumnBase(BaseModel):
    """Base schema for dataset columns"""
    name: str
    data_type: str
    description: Optional[str] = None
    is_nullable: Optional[bool] = None
    is_primary_key: Optional[bool] = False
    is_foreign_key: Optional[bool] = False
    references_column_id: Optional[UUID] = None


class DatasetColumnCreate(DatasetColumnBase):
    """Schema for creating dataset columns"""
    dataset_id: UUID


class DatasetColumnUpdate(BaseModel):
    """Schema for updating dataset columns"""
    name: Optional[str] = None
    data_type: Optional[str] = None
    description: Optional[str] = None
    is_nullable: Optional[bool] = None
    is_primary_key: Optional[bool] = None
    is_foreign_key: Optional[bool] = None
    references_column_id: Optional[UUID] = None
    data_quality_rules: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None


class DatasetColumnInDB(DatasetColumnBase):
    """Schema for dataset column stored in DB"""
    id: UUID
    dataset_id: UUID
    created_at: datetime
    updated_at: datetime
    
    # Statistics
    distinct_count: Optional[int] = None
    null_count: Optional[int] = None
    min_value: Optional[str] = None
    max_value: Optional[str] = None
    mean: Optional[float] = None
    median: Optional[float] = None
    std_dev: Optional[float] = None
    quantiles: Optional[Dict[str, Any]] = None
    histogram: Optional[Dict[str, Any]] = None
    top_values: Optional[Dict[str, Any]] = None
    
    # Additional metadata
    data_quality_rules: Optional[Dict[str, Any]] = None
    transformations: Optional[Dict[str, Any]] = None
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    
    class Config:
        orm_mode = True


class DatasetColumn(DatasetColumnInDB):
    """Schema for dataset column returned to client"""
    pass


class DatasetBase(BaseModel):
    """Base schema for datasets"""
    name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = True
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None


class DatasetCreate(DatasetBase):
    """Schema for creating a new dataset"""
    name: str = Field(..., min_length=1)
    data_source_id: UUID
    table_name: Optional[str] = None
    original_name: Optional[str] = None


class DatasetUpdate(DatasetBase):
    """Schema for updating dataset information"""
    pass


class DatasetInDBBase(DatasetBase):
    """Schema for dataset stored in DB"""
    id: UUID
    data_source_id: UUID
    created_at: datetime
    updated_at: datetime
    
    # Dataset information
    table_name: Optional[str] = None
    original_name: Optional[str] = None
    row_count: Optional[int] = None
    column_count: Optional[int] = None
    sample_size: Optional[int] = None
    status: DatasetStatus = DatasetStatus.IMPORTING
    
    # Profile information
    quality_score: Optional[float] = None
    missing_data_percentage: Optional[float] = None
    last_profiled_at: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class Dataset(DatasetInDBBase):
    """Schema for dataset returned to client"""
    pass


class DatasetWithColumns(Dataset):
    """Dataset with its columns"""
    columns: List[DatasetColumn] = []


class DatasetPreview(BaseModel):
    """Schema for dataset preview data"""
    columns: List[str]
    rows: List[Dict[str, Any]]
    total_rows: int
    page: int
    page_size: int


class DatasetProfileStats(BaseModel):
    """Schema for dataset profile statistics summary"""
    row_count: int
    column_count: int
    missing_data_percentage: float
    quality_score: float
    completeness_score: float
    uniqueness_score: float
    consistency_score: Optional[float] = None
    numeric_column_count: Optional[int] = None
    categorical_column_count: Optional[int] = None
    datetime_column_count: Optional[int] = None
    text_column_count: Optional[int] = None


class DatasetQualityIssue(BaseModel):
    """Schema for dataset quality issues"""
    column_name: Optional[str] = None  # None if dataset-level issue
    issue_type: str  # "missing_values", "outliers", "format_violation", etc.
    severity: str  # "high", "medium", "low"
    description: str
    recommendation: Optional[str] = None
    affected_rows: Optional[int] = None
    affected_percentage: Optional[float] = None


class DatasetProfile(BaseModel):
    """Schema for complete dataset profile"""
    dataset_id: UUID
    stats: DatasetProfileStats
    column_profiles: Dict[str, Any]  # Detailed stats for each column
    quality_issues: List[DatasetQualityIssue] = []
    correlations: Optional[Dict[str, Dict[str, float]]] = None  # Column correlations


class DatasetsResponse(BaseModel):
    """Schema for paginated datasets response"""
    items: List[Dataset]
    total: int


class ProfileTask(BaseModel):
    """Schema for profile task creation and status"""
    task_id: str
    dataset_id: UUID
    status: str  # "pending", "processing", "completed", "failed"
    progress: Optional[float] = None  # 0-100
    message: Optional[str] = None