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

  async keywordSearch(queryOrKeywords: string | string[], topK: number = 10): Promise<SearchResult[]> {
    try {
      let terms: string[] = [];
      if (Array.isArray(queryOrKeywords)) {
        terms = queryOrKeywords.filter((t) => t && t.trim().length > 2);
      } else {
        terms = queryOrKeywords
          .replace(/[^\w\s-]/g, ' ')
          .split(/\s+/)
          .filter(
            (t) =>
              t.length > 2 &&
              !['what', 'when', 'where', 'which', 'who', 'whom', 'this', 'that', 'with', 'from', 'have', 'does'].includes(
                t.toLowerCase()
              )
          );
      }

      if (terms.length === 0) return [];

      const conditions: string[] = [];
      const params: any[] = [];
      terms.slice(0, 8).forEach((term, idx) => {
        const pNum = idx + 1;
        params.push(`%${term.replace(/[%_]/g, '')}%`);
        conditions.push(`(dc.content ILIKE $${pNum} OR d.title ILIKE $${pNum})`);
      });

      params.push(topK);
      const limitParam = `$${params.length}`;

      const sqlQuery = `
        SELECT 
          dc.id as chunk_id,
          dc.document_id,
          d.title as document_title,
          d.filename,
          dc.content,
          dc.metadata,
          0.6 as similarity
        FROM document_chunks dc
        JOIN documents d ON dc.document_id = d.id
        WHERE d.status = 'indexed'
          AND (${conditions.join(' OR ')})
        LIMIT ${limitParam};
      `;
      const result = await pool.query(sqlQuery, params);
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
      return [];
    }
  },
};
