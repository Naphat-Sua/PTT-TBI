from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, List, Optional, Any
from uuid import UUID
import pandas as pd
import numpy as np
import json
from datetime import datetime

from app.models.dataset import Dataset, DatasetColumn, DataProfile
from app.models.data_source import DataSource
from app.models.project import Project
from app.schemas.dataset import DatasetCreate, DatasetUpdate, DataProfileCreate, DatasetColumnCreate
from app.services import data_source_service, project_service


def get_datasets(
    db: Session,
    project_id: UUID,
    user_id: UUID,
    skip: int = 0,
    limit: int = 100
) -> List[Dataset]:
    """
    Get all datasets in a project
    """
    # Verify user has access to project
    project = project_service.get_project_by_id(db, project_id, user_id)
    
    return db.query(Dataset)\
        .filter(Dataset.project_id == project_id)\
        .offset(skip)\
        .limit(limit)\
        .all()


def get_dataset_by_id(db: Session, dataset_id: UUID, user_id: UUID) -> Dataset:
    """
    Get dataset by ID, ensuring user has access
    """
    dataset = db.query(Dataset).filter(Dataset.id == dataset_id).first()
    if not dataset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dataset with id {dataset_id} not found"
        )
    
    # Verify user has access to project
    project_service.get_project_by_id(db, dataset.project_id, user_id)
    
    return dataset


def create_dataset(
    db: Session, 
    dataset_data: DatasetCreate,
    user_id: UUID
) -> Dataset:
    """
    Create a new dataset
    """
    # Verify user has access to project and data source
    project = project_service.get_project_by_id(db, dataset_data.project_id, user_id)
    data_source = data_source_service.get_data_source_by_id(db, dataset_data.data_source_id, user_id)
    
    # Create dataset
    dataset = Dataset(
        name=dataset_data.name,
        description=dataset_data.description,
        project_id=dataset_data.project_id,
        data_source_id=dataset_data.data_source_id,
        connection_details=dataset_data.connection_details,
        created_by=user_id,
        updated_by=user_id
    )
    
    db.add(dataset)
    db.commit()
    db.refresh(dataset)
    
    # Create dataset columns if provided
    if dataset_data.columns:
        for column_data in dataset_data.columns:
            column = DatasetColumn(
                dataset_id=dataset.id,
                name=column_data.name,
                data_type=column_data.data_type,
                is_nullable=column_data.is_nullable,
                description=column_data.description,
                ordinal_position=column_data.ordinal_position
            )
            db.add(column)
        
        db.commit()
    
    return dataset


def update_dataset(
    db: Session,
    dataset_id: UUID,
    dataset_data: DatasetUpdate,
    user_id: UUID
) -> Dataset:
    """
    Update dataset
    """
    dataset = get_dataset_by_id(db, dataset_id, user_id)
    
    # Update dataset fields
    for key, value in dataset_data.model_dump(exclude_unset=True).items():
        setattr(dataset, key, value)
    
    dataset.updated_by = user_id
    dataset.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(dataset)
    
    return dataset


def delete_dataset(db: Session, dataset_id: UUID, user_id: UUID) -> None:
    """
    Delete dataset
    """
    dataset = get_dataset_by_id(db, dataset_id, user_id)
    
    # Delete all related dataset columns and profiles
    db.query(DatasetColumn).filter(DatasetColumn.dataset_id == dataset_id).delete()
    db.query(DataProfile).filter(DataProfile.dataset_id == dataset_id).delete()
    
    db.delete(dataset)
    db.commit()


def get_dataset_columns(db: Session, dataset_id: UUID, user_id: UUID) -> List[DatasetColumn]:
    """
    Get columns for a dataset
    """
    # Verify user has access to dataset
    dataset = get_dataset_by_id(db, dataset_id, user_id)
    
    return db.query(DatasetColumn)\
        .filter(DatasetColumn.dataset_id == dataset_id)\
        .order_by(DatasetColumn.ordinal_position)\
        .all()


def create_dataset_profile(
    db: Session,
    dataset_id: UUID,
    profile_data: Dict[str, Any],
    user_id: UUID
) -> DataProfile:
    """
    Create or update dataset profile
    """
    # Verify user has access to dataset
    dataset = get_dataset_by_id(db, dataset_id, user_id)
    
    # Check if profile already exists
    existing_profile = db.query(DataProfile)\
        .filter(DataProfile.dataset_id == dataset_id)\
        .first()
    
    if existing_profile:
        existing_profile.profile_data = profile_data
        existing_profile.updated_by = user_id
        existing_profile.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_profile)
        return existing_profile
    
    # Create new profile
    profile = DataProfile(
        dataset_id=dataset_id,
        profile_data=profile_data,
        created_by=user_id,
        updated_by=user_id
    )
    
    db.add(profile)
    db.commit()
    db.refresh(profile)
    
    return profile


def get_dataset_profile(db: Session, dataset_id: UUID, user_id: UUID) -> Optional[DataProfile]:
    """
    Get profile for a dataset
    """
    # Verify user has access to dataset
    dataset = get_dataset_by_id(db, dataset_id, user_id)
    
    return db.query(DataProfile)\
        .filter(DataProfile.dataset_id == dataset_id)\
        .first()


def generate_dataset_profile(db: Session, dataset_id: UUID, user_id: UUID, sample_size: int = 10000) -> DataProfile:
    """
    Generate profile for a dataset by sampling and analyzing data
    
    This is a placeholder implementation that would normally:
    1. Connect to the actual data source
    2. Sample data
    3. Profile it using pandas-profiling or a similar library
    4. Store profile results
    
    For demonstration purposes, it creates a mock profile.
    """
    # Verify user has access to dataset
    dataset = get_dataset_by_id(db, dataset_id, user_id)
    columns = get_dataset_columns(db, dataset_id, user_id)
    
    # Mock profile generation
    profile_data = {
        "dataset_summary": {
            "record_count": 10000,
            "column_count": len(columns),
            "missing_cells": 120,
            "duplicate_rows": 5,
            "generated_at": datetime.utcnow().isoformat()
        },
        "columns": {}
    }
    
    # Generate mock profile for each column
    for column in columns:
        if column.data_type in ['INTEGER', 'BIGINT', 'DECIMAL', 'NUMERIC', 'FLOAT', 'REAL']:
            profile_data["columns"][column.name] = {
                "type": "numeric",
                "count": 10000,
                "missing": 12,
                "unique": 8765,
                "mean": 45.7,
                "std": 23.4,
                "min": 1.0,
                "max": 99.9,
                "25%": 25.0,
                "50%": 50.0, 
                "75%": 75.0,
                "histogram": [[1, 10, 20, 30, 40, 50, 60, 70, 80, 90], [120, 450, 890, 1200, 2300, 2100, 1500, 980, 230, 130]]
            }
        elif column.data_type in ['DATE', 'TIMESTAMP', 'DATETIME']:
            profile_data["columns"][column.name] = {
                "type": "datetime",
                "count": 10000,
                "missing": 15,
                "unique": 365,
                "min": "2022-01-01",
                "max": "2023-01-01",
                "histogram": [["2022-Q1", "2022-Q2", "2022-Q3", "2022-Q4"], [2500, 2700, 2400, 2385]]
            }
        else:
            profile_data["columns"][column.name] = {
                "type": "string", 
                "count": 10000,
                "missing": 8,
                "unique": 345,
                "most_common": [("value1", 120), ("value2", 110), ("value3", 95)],
                "top_categories": [
                    {"name": "category1", "count": 3450}, 
                    {"name": "category2", "count": 3200},
                    {"name": "category3", "count": 2100},
                    {"name": "other", "count": 1250}
                ]
            }
    
    # Store and return profile
    return create_dataset_profile(db, dataset_id, profile_data, user_id)