import { db, pool } from '../db/client.js';
import { documentChunks, embeddings, documents } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
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
    return db.insert(documentChunks).values(chunksData).returning();
  },

  async insertEmbeddings(items: { chunkId: string; embedding: number[]; modelName?: string }[]) {
    if (items.length === 0) return;
    const values = items.map(item => ({
      chunkId: item.chunkId,
      embedding: item.embedding,
      modelName: item.modelName || 'text-embedding-004',
      modelVersion: '1.0',
    }));
    await db.insert(embeddings).values(values);
  },

  async deleteByDocumentId(documentId: string) {
    await db.delete(documentChunks).where(eq(documentChunks.documentId, documentId));
  },

  async vectorSearch(queryEmbedding: number[], topK: number = 5, minSimilarity: number = 0.1): Promise<SearchResult[]> {
    const vectorStr = `[${queryEmbedding.join(',')}]`;

    // Perform cosine distance search with pgvector: 1 - (embedding <=> queryVector)
    const query = `
      SELECT 
        dc.id as chunk_id,
        dc.document_id,
        d.title as document_title,
        d.filename,
        dc.content,
        dc.metadata,
        (1 - (e.embedding <=> $1::vector)) as similarity
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
  },

  async keywordSearch(query: string, topK: number = 5): Promise<SearchResult[]> {
    // Simple ILIKE / Full Text fallback for hybrid search
    const sanitizedQuery = `%${query.replace(/%/g, '\\%')}%`;
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
  },
};
