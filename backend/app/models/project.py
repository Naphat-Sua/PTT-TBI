import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, Integer, JSON, Enum, Table
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.base import Base as ModelBase


class ProjectRole(str, enum.Enum):
    """Project role enum for project-level access control"""
    OWNER = "owner"
    ADMIN = "admin"
    CONTRIBUTOR = "contributor"
    VIEWER = "viewer"


# Association table for project members
project_members = Table(
    "project_members",
    Base.metadata,
    Column("project_id", UUID(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
    Column("role", Enum(ProjectRole), default=ProjectRole.VIEWER, nullable=False),
)


class Project(Base, ModelBase):
    """Project model for organizing data models"""
    __tablename__ = "projects"

    name = Column(String, nullable=False, index=True)
    description = Column(String)
    
    # Project status and visibility
    is_active = Column(Boolean, default=True)
    is_public = Column(Boolean, default=False)
    is_template = Column(Boolean, default=False)
    
    # Project metadata
    industry = Column(String)  # e.g., "finance", "healthcare", "retail"
    tags = Column(ARRAY(String))
    
    # Project configuration
    settings = Column(JSON, default={})
    
    # Foreign keys
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="projects", foreign_keys=[owner_id])
    data_models = relationship("DataModel", back_populates="project", cascade="all, delete-orphan")
    members = relationship("User", secondary=project_members, overlaps="project_memberships")
    
    def user_has_access(self, user_id, min_role=ProjectRole.VIEWER):
        """Check if a user has sufficient access to the project"""
        # Owner always has full access
        if str(user_id) == str(self.owner_id):
            return True
            
        # Find user's role in the project
        for member in self.members:
            if str(member.id) == str(user_id):
                # Role check based on hierarchy
                roles_hierarchy = {
                    ProjectRole.OWNER: 4,
                    ProjectRole.ADMIN: 3,
                    ProjectRole.CONTRIBUTOR: 2,
                    ProjectRole.VIEWER: 1
                }
                
                # Get user role (default to viewer if not found)
                user_role = ProjectRole.VIEWER
                for m in self.members:
                    if str(m.id) == str(user_id):
                        user_role = m.role
                        break
                
                # Check if user role is sufficient
                return roles_hierarchy.get(user_role, 0) >= roles_hierarchy.get(min_role, 0)
        
        # User is not a member and not the owner
        return False