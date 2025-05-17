// Common types used throughout the application

// Message types for the chat interface
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sources?: DocumentSource[];
}

// AlgoTrade types
export interface BacktestParameters {
  ticker: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  commission?: number;
  slippage?: number;
}

export interface BacktestStrategy {
  code: string;
  name?: string;
  description?: string;
}

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TradeSignal {
  date: string;
  type: 'buy' | 'sell';
  price: number;
  size: number;
  value: number;
}

export interface EquityPoint {
  date: string;
  value: number;
  cash: number;
  holdings: number;
}

export interface BacktestPerformance {
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  profitFactor?: number;
  averageWin?: number;
  averageLoss?: number;
  maxWin?: number;
  maxLoss?: number;
}

export interface BacktestResult {
  status: 'success' | 'error';
  message?: string;
  priceData: PriceBar[];
  trades: TradeSignal[];
  equity: EquityPoint[];
  performance: BacktestPerformance;
}

export interface BacktestRequest {
  parameters: BacktestParameters;
  strategy: BacktestStrategy;
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
  summary?: string;
  isProcessingSummary?: boolean;
  preview?: string;
  tags?: string[];
  lastAccessed?: Date;
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
  id?: string;
  answer: string;
  query?: string;
  sources: DocumentSource[];
  timestamp?: Date;
}

// Chat history types
export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'combined';
  content: string;
  timestamp: Date;
  sources?: DocumentSource[];
  userQuery?: string;  // For combined type messages
  aiResponse?: string; // For combined type messages
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
