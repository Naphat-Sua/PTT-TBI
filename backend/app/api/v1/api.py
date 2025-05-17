from fastapi import APIRouter

from app.api.v1.endpoints import (
    auth, 
    users,
    projects,
    data_sources, 
    datasets, 
    data_models,
    data_profiling,
    schema_discovery
)

# Create main API router
api_router = APIRouter()

# Include routers for different resource types
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projects"])
api_router.include_router(data_sources.router, prefix="/data-sources", tags=["Data Sources"])
api_router.include_router(datasets.router, prefix="/datasets", tags=["Datasets"])
api_router.include_router(data_models.router, prefix="/data-models", tags=["Data Models"])
api_router.include_router(data_profiling.router, prefix="/data-profiling", tags=["Data Profiling"])
api_router.include_router(schema_discovery.router, prefix="/schema-discovery", tags=["Schema Discovery"])