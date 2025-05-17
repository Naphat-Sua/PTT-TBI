import uuid
from datetime import datetime
from sqlalchemy import Column, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.declarative import declared_attr


class Base:
    """Base class for all models with UUID primary key and timestamps"""
    
    @declared_attr
    def __tablename__(cls):
        """Generate __tablename__ automatically from class name"""
        return cls.__name__.lower()
        
    # Primary key as UUID
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Creation and update timestamps
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    def dict(self):
        """Convert model instance to dictionary"""
        return {c.name: getattr(self, c.name) for c in self.__table__.columns}
        
    def update(self, **kwargs):
        """Update model instance with dictionary values"""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        return self