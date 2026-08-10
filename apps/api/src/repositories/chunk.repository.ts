import { db, pool } from '../db/client.js';
import { documentChunks, embeddings } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { localStore } from '../db/local-store.js';
import type { ChunkMetadata, SearchResult } from '@rag/shared';

export interface InsertChunkData {
  documentId: string;
  chunkIndex: number;
  content: string;
  tokens: number;
  startPosition?: number | null;
  endPosition?: number | null;
  metadata?: ChunkMetadata | null;
}

export const chunkRepository = {
  async createChunks(chunksData: InsertChunkData[]) {
    if (chunksData.length === 0) return [];
    try {
      return await db.insert(documentChunks).values(chunksData).returning();
    } catch {
      return localStore.createChunks(chunksData);
    }
  },

  async findByDocumentId(documentId: string) {
    try {
      return await db.select().from(documentChunks).where(eq(documentChunks.documentId, documentId));
    } catch {
      return localStore.findChunksByDocumentId(documentId);
    }
  },

  async insertEmbeddings(items: { chunkId: string; embedding: number[]; modelName?: string }[]) {
    if (items.length === 0) return;
    try {
      const values = items.map(item => ({
        chunkId: item.chunkId,
        embedding: item.embedding,
        modelName: item.modelName || 'gemini-embedding-001',
        modelVersion: '1.0',
      }));
      await db.insert(embeddings).values(values);
    } catch {
      localStore.insertEmbeddings(items);
    }
  },

  async deleteByDocumentId(documentId: string) {
    try {
      await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
    } catch {
      localStore.deleteChunksByDocumentId(documentId);
    }
  },

  async vectorSearch(queryEmbedding: number[], topK: number = 5, minSimilarity: number = 0.1): Promise<SearchResult[]> {
    try {
      const vectorStr = `[${queryEmbedding.join(',')}]`;
      const query = `
        SELECT 
          dc.id as chunk_id,
          dc.document_id,
          d.title as document_title,
          d.filename,
          dc.content,
          dc.metadata,
          1 - (e.embedding <=> $1::vector) as similarity
        FROM embeddings e
        JOIN document_chunks dc ON e.chunk_id = dc.id
        JOIN documents d ON dc.document_id = d.id
        WHERE d.status = 'indexed'
          AND (1 - (e.embedding <=> $1::vector)) >= $2
        ORDER BY similarity DESC
        LIMIT $3;
      `;
      const result = await pool.query(query, [vectorStr, minSimilarity, topK]);
      return result.rows.map((row: any) => ({
        chunkId: row.chunk_id,
        documentId: row.document_id,
        documentTitle: row.document_title,
        filename: row.filename,
        content: row.content,
        similarity: Number(row.similarity),
        metadata: row.metadata,
      }));
    } catch {
      return localStore.vectorSearch(queryEmbedding, topK, minSimilarity);
    }
  },

  async keywordSearch(query: string, topK: number = 5): Promise<SearchResult[]> {
    try {
      const sanitizedQuery = `%${query.replace(/[%_]/g, '')}%`;
      const sqlQuery = `
        SELECT 
          dc.id as chunk_id,
          dc.document_id,
          d.title as document_title,
          d.filename,
          dc.content,
          dc.metadata,
          0.5 as similarity
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE d.status = 'indexed'
          AND (dc.content ILIKE $1 OR d.title ILIKE $1)
        LIMIT $2;
      `;
      const result = await pool.query(sqlQuery, [sanitizedQuery, topK]);
      return result.rows.map((row: any) => ({
        chunkId: row.chunk_id,
        documentId: row.document_id,
        documentTitle: row.document_title,
        filename: row.filename,
        content: row.content,
        similarity: Number(row.similarity),
        metadata: row.metadata,
      }));
    } catch {
      return localStore.keywordSearch(query, topK);
    }
  },
};
