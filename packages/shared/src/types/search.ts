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

export interface AnalyticsStats {
  totalDocuments: number;
  indexedDocuments: number;
  totalChunks: number;
  queriesLast24h: number;
  averageExecutionTimeMs: number;
  helpfulFeedbackCount: number;
  notHelpfulFeedbackCount: number;
}
