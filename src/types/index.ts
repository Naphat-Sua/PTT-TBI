
// Common types used throughout the application

// Message types for the chat interface
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: DocumentSource[];
}

// Document types for the RAG system
export interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  content?: string;
  chunks?: DocumentChunk[];
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  content: string;
  index: number;
  embedding?: number[];
}

export interface DocumentSource {
  documentId: string;
  documentName: string;
  chunkIndex?: number;
  excerpt?: string;
}

// Query types
export interface QueryResult {
  answer: string;
  sources: DocumentSource[];
}

// Model types
export interface DatasetInfo {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: Date;
  features?: string[];
  targetVariable?: string;
  shape?: [number, number]; // [rows, columns]
  summary?: DataSummary;
}

export interface DataSummary {
  numericColumns?: Record<string, NumericSummary>;
  categoricalColumns?: Record<string, CategoricalSummary>;
  missingValues?: Record<string, number>;
}

export interface NumericSummary {
  mean: number;
  median: number;
  min: number;
  max: number;
  std: number;
}

export interface CategoricalSummary {
  uniqueValues: number;
  topCategories: Record<string, number>;
}

export interface ModelResult {
  type: 'classification' | 'regression';
  metrics: Record<string, number>;
  confusionMatrix?: number[][];
  featureImportance?: Record<string, number>;
}
