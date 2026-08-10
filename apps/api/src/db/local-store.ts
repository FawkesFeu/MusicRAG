import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { SearchResult, AnalyticsStats, UserRole, DocumentStatus, FileType, IngestionJobStatus } from '@rag/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../../../.rag_data');
const STORE_PATH = path.resolve(DATA_DIR, 'store.json');

export interface LocalStoreData {
  users: any[];
  sessions: any[];
  documents: any[];
  documentChunks: any[];
  embeddings: any[];
  ingestionJobs: any[];
  searchQueries: any[];
}

function getDefaultData(): LocalStoreData {
  return {
    users: [],
    sessions: [],
    documents: [],
    documentChunks: [],
    embeddings: [],
    ingestionJobs: [],
    searchQueries: [],
  };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dotProduct = 0;
  let mA = 0;
  let mB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    mA += a[i] * a[i];
    mB += b[i] * b[i];
  }
  const denominator = Math.sqrt(mA) * Math.sqrt(mB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export class LocalStore {
  private data: LocalStoreData;

  constructor() {
    this.data = this.load();
  }

  private load(): LocalStoreData {
    try {
      if (fs.existsSync(STORE_PATH)) {
        const raw = fs.readFileSync(STORE_PATH, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[LocalStore] Error reading local store, resetting:', (e as Error).message);
    }
    return getDefaultData();
  }

  private save() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORE_PATH, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[LocalStore] Error saving store:', e);
    }
  }

  // Users
  findUserByEmail(email: string) {
    return this.data.users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  findUserById(id: string) {
    return this.data.users.find(u => u.id === id) || null;
  }

  createUser(user: any) {
    const newUser = {
      id: user.id || crypto.randomUUID(),
      email: user.email,
      hashedPassword: user.hashedPassword,
      name: user.name,
      role: user.role || 'user',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.users.push(newUser);
    this.save();
    return newUser;
  }

  listUsers() {
    return this.data.users;
  }

  // Sessions
  createSession(userId: string, refreshToken: string, expiresAt: Date) {
    const session = {
      id: crypto.randomUUID(),
      userId,
      refreshToken,
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.data.sessions.push(session);
    this.save();
    return session;
  }

  findSession(refreshToken: string) {
    return this.data.sessions.find(s => s.refreshToken === refreshToken) || null;
  }

  deleteSession(refreshToken: string) {
    this.data.sessions = this.data.sessions.filter(s => s.refreshToken !== refreshToken);
    this.save();
  }

  // Documents
  findDocumentById(id: string) {
    return this.data.documents.find(d => d.id === id) || null;
  }

  findDocumentByChecksum(checksum: string) {
    return this.data.documents.find(d => d.checksum === checksum) || null;
  }

  createDocument(doc: any) {
    const newDoc = {
      id: doc.id || crypto.randomUUID(),
      title: doc.title,
      filename: doc.filename,
      fileType: doc.fileType,
      fileSize: doc.fileSize,
      checksum: doc.checksum,
      uploadedBy: doc.uploadedBy || null,
      uploadedAt: new Date().toISOString(),
      status: doc.status || 'uploaded',
      errorMessage: null,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.documents.push(newDoc);
    this.save();
    return newDoc;
  }

  updateDocumentStatus(id: string, status: DocumentStatus, errorMessage?: string | null) {
    const doc = this.findDocumentById(id);
    if (doc) {
      doc.status = status;
      doc.errorMessage = errorMessage || null;
      doc.updatedAt = new Date().toISOString();
      this.save();
    }
    return doc;
  }

  listDocuments() {
    return this.data.documents.map(d => ({
      ...d,
      chunkCount: this.data.documentChunks.filter(c => c.documentId === d.id).length,
    })).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  deleteDocument(id: string) {
    this.data.documents = this.data.documents.filter(d => d.id !== id);
    const chunkIds = this.data.documentChunks.filter(c => c.documentId === id).map(c => c.id);
    this.data.documentChunks = this.data.documentChunks.filter(c => c.documentId !== id);
    this.data.embeddings = this.data.embeddings.filter(e => !chunkIds.includes(e.chunkId));
    this.data.ingestionJobs = this.data.ingestionJobs.filter(j => j.documentId !== id);
    this.save();
  }

  // Chunks & Embeddings
  createChunks(chunks: any[]) {
    const newChunks = chunks.map(c => ({
      id: c.id || crypto.randomUUID(),
      documentId: c.documentId,
      chunkIndex: c.chunkIndex,
      content: c.content,
      tokens: c.tokens,
      startPosition: c.startPosition || null,
      endPosition: c.endPosition || null,
      metadata: c.metadata || null,
      createdAt: new Date().toISOString(),
    }));
    this.data.documentChunks.push(...newChunks);
    this.save();
    return newChunks;
  }

  deleteChunksByDocumentId(documentId: string) {
    const chunkIds = this.data.documentChunks.filter(c => c.documentId === documentId).map(c => c.id);
    this.data.documentChunks = this.data.documentChunks.filter(c => c.documentId !== documentId);
    this.data.embeddings = this.data.embeddings.filter(e => !chunkIds.includes(e.chunkId));
    this.save();
  }

  insertEmbeddings(items: { chunkId: string; embedding: number[]; modelName?: string }[]) {
    const newEmbeddings = items.map(item => ({
      id: crypto.randomUUID(),
      chunkId: item.chunkId,
      embedding: item.embedding,
      modelName: item.modelName || 'text-embedding-004',
      modelVersion: '1.0',
      createdAt: new Date().toISOString(),
    }));
    this.data.embeddings.push(...newEmbeddings);
    this.save();
  }

  // Vector Search
  vectorSearch(queryEmbedding: number[], topK: number = 5, minSimilarity: number = 0.1): SearchResult[] {
    const scoredChunks: Array<SearchResult & { score: number }> = [];

    const indexedDocIds = new Set(
      this.data.documents.filter(d => d.status === 'indexed').map(d => d.id)
    );

    for (const chunk of this.data.documentChunks) {
      if (!indexedDocIds.has(chunk.documentId)) continue;
      const embeddingRecord = this.data.embeddings.find(e => e.chunkId === chunk.id);
      if (!embeddingRecord) continue;

      const similarity = cosineSimilarity(queryEmbedding, embeddingRecord.embedding);
      if (similarity >= minSimilarity) {
        const doc = this.data.documents.find(d => d.id === chunk.documentId);
        scoredChunks.push({
          chunkId: chunk.id,
          documentId: chunk.documentId,
          documentTitle: doc?.title || 'Untitled',
          filename: doc?.filename || 'unknown.md',
          content: chunk.content,
          similarity,
          metadata: chunk.metadata,
          score: similarity,
        });
      }
    }

    return scoredChunks.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  // Keyword Search
  keywordSearch(query: string, topK: number = 5): SearchResult[] {
    const scoredChunks: Array<SearchResult & { rawScore: number }> = [];
    const lowerQuery = query.toLowerCase();
    const queryTokens = lowerQuery
      .replace(/[^a-z0-9\s_-]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 1 && !['the', 'and', 'for', 'what', 'how', 'why', 'which', 'does', 'with', 'from', 'an', 'is', 'it'].includes(t));

    const indexedDocIds = new Set(
      this.data.documents.filter(d => d.status === 'indexed').map(d => d.id)
    );

    for (const chunk of this.data.documentChunks) {
      if (!indexedDocIds.has(chunk.documentId)) continue;
      const doc = this.data.documents.find(d => d.id === chunk.documentId);
      const lowerContent = chunk.content.toLowerCase();
      const lowerTitle = (doc?.title || '').toLowerCase();
      const lowerFilename = (doc?.filename || '').toLowerCase();

      let matchScore = 0;
      if (lowerContent.includes(lowerQuery) || lowerTitle.includes(lowerQuery)) {
        matchScore += 10.0;
      }

      for (const token of queryTokens) {
        // High boost for filename and title matches
        if (lowerFilename.includes(token)) matchScore += 5.0;
        if (lowerTitle.includes(token)) matchScore += 4.0;

        // Occurrences in content
        const occurrences = (lowerContent.match(new RegExp(`\\b${token}`, 'g')) || []).length;
        if (occurrences > 0) {
          matchScore += 1.0 + Math.min(5.0, occurrences * 0.5);
        }
      }

      if (matchScore > 0) {
        scoredChunks.push({
          chunkId: chunk.id,
          documentId: chunk.documentId,
          documentTitle: doc?.title || 'Untitled',
          filename: doc?.filename || 'unknown.md',
          content: chunk.content,
          similarity: matchScore,
          metadata: chunk.metadata,
          rawScore: matchScore,
        });
      }
    }

    const sorted = scoredChunks.sort((a, b) => b.rawScore - a.rawScore).slice(0, topK);
    const maxScore = sorted[0]?.rawScore || 1;

    return sorted.map(item => ({
      chunkId: item.chunkId,
      documentId: item.documentId,
      documentTitle: item.documentTitle,
      filename: item.filename,
      content: item.content,
      similarity: Math.min(0.99, 0.4 + (item.rawScore / maxScore) * 0.55),
      metadata: item.metadata,
    }));
  }

  // Ingestion Jobs
  createJob(job: any) {
    const newJob = {
      id: crypto.randomUUID(),
      documentId: job.documentId,
      jobId: job.jobId,
      status: job.status || 'queued',
      chunkedCount: 0,
      embeddedCount: 0,
      totalChunks: 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      errorMessage: null,
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.ingestionJobs.push(newJob);
    this.save();
    return newJob;
  }

  findJobByDocumentId(documentId: string) {
    return [...this.data.ingestionJobs].reverse().find(j => j.documentId === documentId) || null;
  }

  findJobByJobId(jobId: string) {
    return this.data.ingestionJobs.find(j => j.jobId === jobId) || null;
  }

  updateJob(jobId: string, updates: any) {
    const job = this.findJobByJobId(jobId);
    if (job) {
      Object.assign(job, updates, { updatedAt: new Date().toISOString() });
      if (updates.status === 'completed' && !job.completedAt) {
        job.completedAt = new Date().toISOString();
      }
      this.save();
    }
    return job;
  }

  listRecentJobs(limit: number = 50) {
    return [...this.data.ingestionJobs].reverse().slice(0, limit);
  }

  // Analytics
  logSearch(search: any) {
    const record = {
      id: crypto.randomUUID(),
      userId: search.userId,
      query: search.query,
      retrievedChunkCount: search.retrievedChunkCount,
      answerGenerated: search.answerGenerated ?? false,
      answerTokens: search.answerTokens || null,
      executionTime: search.executionTime || 0,
      relevanceFeedback: null,
      createdAt: new Date().toISOString(),
    };
    this.data.searchQueries.push(record);
    this.save();
    return record;
  }

  updateFeedback(queryId: string, feedback: 'helpful' | 'not_helpful') {
    const q = this.data.searchQueries.find(s => s.id === queryId);
    if (q) {
      q.relevanceFeedback = feedback;
      this.save();
    }
  }

  getAnalyticsStats(): AnalyticsStats {
    const totalDocs = this.data.documents.length;
    const indexedDocs = this.data.documents.filter(d => d.status === 'indexed').length;
    const totalChunks = this.data.documentChunks.length;
    const queries = this.data.searchQueries;

    const helpfulCount = queries.filter(q => q.relevanceFeedback === 'helpful').length;
    const notHelpfulCount = queries.filter(q => q.relevanceFeedback === 'not_helpful').length;
    const avgLatency = queries.length > 0
      ? Math.round(queries.reduce((sum, q) => sum + (q.executionTime || 0), 0) / queries.length)
      : 0;

    return {
      totalDocuments: totalDocs,
      indexedDocuments: indexedDocs,
      totalChunks,
      queriesLast24h: queries.length,
      averageExecutionTimeMs: avgLatency,
      helpfulFeedbackCount: helpfulCount,
      notHelpfulFeedbackCount: notHelpfulCount,
    };
  }

  listRecentQueries(limit: number = 50) {
    return [...this.data.searchQueries].reverse().slice(0, limit);
  }
}

export const localStore = new LocalStore();
