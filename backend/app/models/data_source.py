import enum
from sqlalchemy import Column, String, Boolean, ForeignKey, JSON, Enum, Table, DateTime
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import relationship

from app.db.session import Base
from app.models.base import Base as ModelBase


class DataSourceType(str, enum.Enum):
    """Data source type enum"""
    DATABASE = "database"
    FILE = "file"
    API = "api"
    STREAMING = "streaming"
    WAREHOUSE = "warehouse"
    OTHER = "other"


class DatabaseDialect(str, enum.Enum):
    """Database dialect enum for database sources"""
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    MARIADB = "mariadb"
    MSSQL = "mssql"
    ORACLE = "oracle"
    SQLITE = "sqlite"
    MONGODB = "mongodb"
    DYNAMODB = "dynamodb"
    SNOWFLAKE = "snowflake"
    BIGQUERY = "bigquery"
    REDSHIFT = "redshift"
    CLICKHOUSE = "clickhouse"
    ELASTICSEARCH = "elasticsearch"
    OTHER = "other"


class FileFormat(str, enum.Enum):
    """File format enum for file sources"""
    CSV = "csv"
    JSON = "json"
    XML = "xml"
    EXCEL = "excel"
    PARQUET = "parquet"
    AVRO = "avro"
    ORC = "orc"
    TEXT = "text"
    OTHER = "other"


class DataSource(Base, ModelBase):
    """Data source model for external data connections"""
    __tablename__ = "data_sources"

    name = Column(String, nullable=False, index=True)
    description = Column(String)
    source_type = Column(Enum(DataSourceType), nullable=False)
    
    # Connection status
    is_active = Column(Boolean, default=True)
    last_connected_at = Column(DateTime, nullable=True)
    connection_status = Column(String)
    
    # Connection security
    requires_auth = Column(Boolean, default=False)
    auth_type = Column(String)  # "basic", "oauth2", "key", etc.
    
    # Secure credentials stored encrypted in the database
    # These should be encrypted at rest
    connection_credentials = Column(JSON)
    
    # Connection properties based on source_type
    # For database sources
    database_dialect = Column(Enum(DatabaseDialect), nullable=True)
    database_name = Column(String)
    host = Column(String)
    port = Column(String)
    
    # For file sources
    file_format = Column(Enum(FileFormat), nullable=True)
    file_path = Column(String)
    
    # For API sources
    api_url = Column(String)
    api_method = Column(String)  # GET, POST, etc.
    headers = Column(JSON)
    
    # General connection properties
    parameters = Column(JSON, default={})
    metadata = Column(JSON, default={})
    tags = Column(ARRAY(String))
    
    # Foreign keys
    owner_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Relationships
    owner = relationship("User", back_populates="data_sources")
    datasets = relationship("Dataset", back_populates="data_source", cascade="all, delete-orphan")