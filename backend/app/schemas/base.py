from datetime import datetime
from typing import Optional, TypeVar, Generic, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field


class BaseSchema(BaseModel):
    """Base schema with common fields"""
    id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        orm_mode = True


# For pagination responses
T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response schema"""
    items: List[T]
    total: int
    page: int
    size: int
    pages: int


# Response schema for successful operations
class SuccessResponse(BaseModel):
    """Standard success response schema"""
    success: bool = True
    message: str


# Error response schema
class ErrorResponse(BaseModel):
    """Standard error response schema"""
    success: bool = False
    message: str
    errors: Optional[Dict[str, List[str]]] = None
    error_code: Optional[str] = None


# Base model for creating items
class BaseCreateSchema(BaseModel):
    class Config:
        orm_mode = True


# Base model for updating items
class BaseUpdateSchema(BaseModel):
    class Config:
        orm_mode = True