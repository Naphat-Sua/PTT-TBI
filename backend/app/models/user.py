import enum
from sqlalchemy import Column, String, Boolean, Integer, DateTime, JSON, Enum, Table, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.base import Base as ModelBase


class UserRole(str, enum.Enum):
    """User role enum for role-based access control"""
    ADMIN = "admin"
    MANAGER = "manager"
    MODELER = "modeler"
    VIEWER = "viewer"


class User(Base, ModelBase):
    """User model for authentication and authorization"""
    __tablename__ = "users"

    # Identity fields
    email = Column(String, unique=True, index=True, nullable=False)
    username = Column(String, unique=True, index=True, nullable=False)
    
    # Auth fields
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    
    # User information
    first_name = Column(String)
    last_name = Column(String)
    role = Column(Enum(UserRole), default=UserRole.VIEWER)
    
    # Account management
    email_verified = Column(Boolean, default=False)
    last_login = Column(DateTime)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(DateTime, nullable=True)
    
    # Profile information
    profile_picture_url = Column(String)
    bio = Column(String)
    organization = Column(String)
    job_title = Column(String)
    
    # Preferences
    preferences = Column(JSON, default={})
    
    # Relationships
    tokens = relationship("Token", cascade="all, delete-orphan")
    projects = relationship("Project", back_populates="owner")
    data_sources = relationship("DataSource", back_populates="owner")
    data_models = relationship("DataModel", back_populates="owner")
    
    # Many-to-many relationships
    project_memberships = relationship("Project", secondary="project_members", overlaps="members")
    
    @property
    def full_name(self) -> str:
        """Get user's full name"""
        if self.first_name and self.last_name:
            return f"{self.first_name} {self.last_name}"
        return self.username
    
    def is_account_locked(self) -> bool:
        """Check if account is currently locked due to failed login attempts"""
        if not self.locked_until:
            return False
        from datetime import datetime
        return datetime.utcnow() < self.locked_until