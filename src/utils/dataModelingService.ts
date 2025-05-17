import axios from 'axios';

// Define the base URL for API calls
const API_BASE_URL = 'http://localhost:5000/api';

// Types
export interface Dataset {
  id: string;
  name: string;
  file_path?: string;
  file_type: string;
  size: number;
  uploaded_at: string;
  row_count?: number;
  column_count?: number;
}

export interface Column {
  id?: string;
  dataset_id?: string;
  name: string;
  data_type: string;
  nullable: boolean;
  unique_values?: number;
  min_value?: string;
  max_value?: string;
  avg_value?: number;
  missing_count?: number;
}

export interface DatasetDetail extends Dataset {
  columns: Column[];
}

export interface DataProfile {
  row_count: number;
  column_count: number;
  columns: {
    [key: string]: {
      type: string;
      completeness: number;
      uniqueness: number;
      min?: string;
      max?: string;
      top_values?: Record<string, number>;
    };
  };
}

export interface DataPreview {
  columns: string[];
  rows: Record<string, any>[];
}

// API functions
export const fetchDatasets = async (): Promise<Dataset[]> => {
  const response = await axios.get(`${API_BASE_URL}/datasets`);
  return response.data;
};

export const fetchDatasetById = async (id: string): Promise<DatasetDetail> => {
  const response = await axios.get(`${API_BASE_URL}/datasets/${id}`);
  return response.data;
};

export const importDataset = async (file: File): Promise<Dataset> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await axios.post(`${API_BASE_URL}/datasets/import`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const deleteDataset = async (id: string): Promise<boolean> => {
  await axios.delete(`${API_BASE_URL}/datasets/${id}`);
  return true;
};

export const getDatasetProfile = async (id: string): Promise<DataProfile> => {
  const response = await axios.get(`${API_BASE_URL}/datasets/${id}/profile`);
  return response.data;
};

export const getDatasetPreview = async (id: string): Promise<DataPreview> => {
  const response = await axios.get(`${API_BASE_URL}/datasets/${id}/preview`);
  return response.data;
};

// Helper functions
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
};