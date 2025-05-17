from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
from pydantic import BaseModel, Field

class ProjectBase(BaseModel):
    """Base project schema with common fields"""
    name: Optional[str] = None
    description: Optional[str] = None
    is_public: Optional[bool] = False
    metadata: Optional[Dict[str, Any]] = None


class ProjectCreate(ProjectBase):
    """Schema for creating a new project"""
    name: str = Field(..., min_length=1, max_length=100)


class ProjectUpdate(ProjectBase):
    """Schema for updating project information"""
    pass


class ProjectInDBBase(ProjectBase):
    """Schema for project stored in DB"""
    id: UUID
    owner_id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        orm_mode = True


class Project(ProjectInDBBase):
    """Schema for project returned to client"""
    pass


class ProjectSummary(BaseModel):
    """Summary schema for project (used in lists)"""
    id: UUID
    name: str
    description: Optional[str] = None
    is_public: bool
    updated_at: datetime
    
    class Config:
        orm_mode = True


class ProjectsResponse(BaseModel):
    """Schema for paginated projects response"""
    items: List[ProjectSummary]
    total: int


class ProjectMember(BaseModel):
    """Schema for project member information"""
    user_id: UUID
    username: str
    full_name: Optional[str] = None
    email: str
    role: str
    
    class Config:
        orm_mode = True


class ProjectStats(BaseModel):
    """Schema for project statistics"""
    total_data_sources: int
    total_datasets: int
    total_models: int
    total_entities: int
    last_updated: Optional[datetime] = None


class ProjectWithStats(Project):
    """Project with additional statistics"""
    stats: ProjectStats
    owner_name: str
    member_count: int