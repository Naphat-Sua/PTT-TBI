from sqlalchemy import Column, String, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime, timedelta

from app.db.session import Base
from app.models.base import Base as ModelBase
from app.core.config import settings


class Token(Base, ModelBase):
    """Token model for JWT authentication and token revocation tracking"""
    __tablename__ = "tokens"

    access_token = Column(String, index=True)
    refresh_token = Column(String, unique=True, index=True)
    token_type = Column(String, default="bearer")
    
    # Expiration dates
    access_token_expires = Column(DateTime)
    refresh_token_expires = Column(DateTime)
    
    # Status
    is_revoked = Column(Boolean, default=False)
    revoked_at = Column(DateTime, nullable=True)
    
    # Device info for multi-device management
    user_agent = Column(String)
    ip_address = Column(String)
    device_id = Column(String)
    
    # Foreign keys
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    @property
    def is_access_token_expired(self) -> bool:
        """Check if access token is expired"""
        return datetime.utcnow() > self.access_token_expires if self.access_token_expires else True
        
    @property
    def is_refresh_token_expired(self) -> bool:
        """Check if refresh token is expired"""
        return datetime.utcnow() > self.refresh_token_expires if self.refresh_token_expires else True
    
    @classmethod
    def create_expiration_time(cls, is_refresh_token: bool = False) -> datetime:
        """
        Create token expiration datetime
        
        Args:
            is_refresh_token: Whether creating expiration for refresh token
            
        Returns:
            Expiration datetime
        """
        if is_refresh_token:
            return datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        return datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)