export type DocumentStatus = 'uploaded' | 'processing' | 'indexed' | 'failed';
export type IngestionJobStatus = 'queued' | 'processing' | 'completed' | 'failed';
export type FileType = 'pdf' | 'txt' | 'markdown';

export interface DocumentMetadata {
  originalName?: string;
  category?: string;
  author?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface ChunkMetadata {
  pageNumber?: number;
  section?: string;
  heading?: string;
  path?: string;
  [key: string]: unknown;
}

export interface Document {
  id: string;
  title: string;
  filename: string;
  fileType: FileType;
  fileSize: number;
  checksum: string;
  uploadedBy: string | null;
  uploadedAt: string;
  status: DocumentStatus;
  errorMessage?: string | null;
  retryCount: number;
  chunkCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  chunkIndex: number;
  content: string;
  tokens: number;
  startPosition?: number | null;
  endPosition?: number | null;
  metadata?: ChunkMetadata | null;
  createdAt: string;
}

export interface IngestionJob {
  id: string;
  documentId: string;
  jobId: string;
  status: IngestionJobStatus;
  chunkedCount: number | null;
  embeddedCount: number | null;
  totalChunks: number | null;
  startedAt?: string | null;
  completedAt?: string | null;
  errorMessage?: string | null;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  updatedAt: string;
}
