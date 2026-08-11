import type { ChunkMetadata } from './document.js';

export interface SearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  filename: string;
  content: string;
  similarity: number;
  metadata?: ChunkMetadata | null;
}

export interface Citation {
  sourceIndex: number;
  documentId: string;
  documentTitle: string;
  filename: string;
  chunkId: string;
  content: string;
  pageNumber?: number;
  section?: string;
  heading?: string;
}

export interface RAGResponse {
  query: string;
  answer: string;
  citations: Citation[];
  retrievedChunks: SearchResult[];
  confidence: number;
  executionTimeMs: number;
  model: string;
  isCorpusGrounded: boolean;
}

export interface SearchQueryLog {
  id: string;
  userId: string;
  query: string;
  retrievedChunkCount: number;
  answerGenerated: boolean;
  answerTokens?: number | null;
  executionTime?: number | null;
  relevanceFeedback?: 'helpful' | 'not_helpful' | null;
  createdAt: string;
}

export interface IndexHealthStats {
  status: 'HEALTHY' | 'SYNCING' | 'DEGRADED';
  hnswIndexType: string;
  vectorDimensions: number;
  embeddingModel: string;
  embeddingVersion: string;
  totalEmbeddingsCount: number;
  vectorIndexSizeBytes: number;
  vectorIndexSizePretty: string;
  failedIngestionJobsCount: number;
  pendingIngestionJobsCount: number;
  completedIngestionJobsCount: number;
  lastIndexSync: string;
}

export interface AnalyticsStats {
  totalDocuments: number;
  indexedDocuments: number;
  totalChunks: number;
  queriesLast24h: number;
  averageExecutionTimeMs: number;
  avgLatencyMs?: number;
  helpfulFeedbackCount: number;
  notHelpfulFeedbackCount: number;
  helpfulRate?: number;
  indexHealth?: IndexHealthStats;
}

export interface StreamMetadataEvent {
  query: string;
  retrievedChunks: SearchResult[];
}

export interface StreamDeltaEvent {
  delta: string;
}

export interface StreamDoneEvent extends RAGResponse {}

export interface StreamErrorEvent {
  error: string;
}

