import os
import secrets
from typing import List, Optional, Union, Dict, Any
from pydantic import AnyHttpUrl, BaseSettings, validator, PostgresDsn


class Settings(BaseSettings):
    """Application settings"""
    # API configuration
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "Data Modeling Studio"
    DESCRIPTION: str = "Enterprise Data Modeling and Schema Design Platform"
    VERSION: str = "1.0.0"
    
    # Security
    SECRET_KEY: str = secrets.token_urlsafe(32)
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    
    # Database
    DATABASE_URL: Optional[PostgresDsn] = None
    
    # CORS
    ORIGINS: List[Union[str, AnyHttpUrl]] = ["http://localhost:3000", "http://localhost:5173"]
    
    # Uploads
    UPLOAD_FOLDER: str = "./uploads"
    MAX_UPLOAD_SIZE_MB: int = 100
    
    # Documentation
    ENABLE_DOCS: bool = True
    
    # Tasks and background jobs
    CELERY_BROKER_URL: Optional[str] = None
    CELERY_RESULT_BACKEND: Optional[str] = None
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Application features
    ENABLE_SCHEMA_DISCOVERY: bool = True
    ENABLE_DATA_PROFILING: bool = True
    
    # Validation
    @validator("DATABASE_URL", pre=True)
    def assemble_db_connection(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        if isinstance(v, str):
            return v
        return PostgresDsn.build(
            scheme="postgresql",
            user=os.getenv("POSTGRES_USER", "postgres"),
            password=os.getenv("POSTGRES_PASSWORD", "postgres"),
            host=os.getenv("POSTGRES_HOST", "localhost"),
            port=os.getenv("POSTGRES_PORT", "5432"),
            path=f"/{os.getenv('POSTGRES_DB', 'data_modeling_studio')}",
        )
    
    class Config:
        case_sensitive = True
        env_file = ".env"


# Create settings instance
settings = Settings()


# Ensure necessary directories exist
def ensure_directories():
    """Create necessary directories for the application."""
    os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)


ensure_directories()