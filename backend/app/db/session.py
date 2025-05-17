from typing import Generator
import uuid

from sqlalchemy import create_engine, Column, DateTime, func, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.dialects.postgresql import UUID

from app.core.config import settings

# Create SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    echo=False,
    pool_size=10,
    max_overflow=20
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create a base class with metadata for all models
metadata = MetaData()
Base = declarative_base(metadata=metadata)

# Define mixin for common model fields
class BaseIdMixin:
    """Mixin for common model fields"""
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=func.now(), nullable=False)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now(), nullable=False)


def get_db() -> Generator[Session, None, None]:
    """
    Database session dependency
    
    Yields:
        Database session that will automatically close after use
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()