import { db, pool } from '../db/client.js';
import { searchQueries, documents, documentChunks } from '../db/schema.js';
import { eq, desc, count } from 'drizzle-orm';
import { localStore } from '../db/local-store.js';
import type { AnalyticsStats } from '@rag/shared';

export interface LogSearchData {
  userId: string;
  query: string;
  retrievedChunkCount: number;
  answerGenerated: boolean;
  answerTokens?: number | null;
  executionTime?: number | null;
}

export const analyticsRepository = {
  async logSearch(data: LogSearchData) {
    try {
      const result = await db.insert(searchQueries).values({
        userId: data.userId,
        query: data.query,
        retrievedChunkCount: data.retrievedChunkCount,
        answerGenerated: data.answerGenerated,
        answerTokens: data.answerTokens,
        executionTime: data.executionTime,
      }).returning();
      return result[0];
    } catch {
      return localStore.logSearch(data);
    }
  },

  async updateFeedback(queryId: string, feedback: 'helpful' | 'not_helpful') {
    try {
      await db.update(searchQueries).set({
        relevanceFeedback: feedback,
      }).where(eq(searchQueries.id, queryId));
    } catch {
      localStore.updateFeedback(queryId, feedback);
    }
  },

  async getStats(): Promise<AnalyticsStats> {
    try {
      const totalDocsResult = await db.select({ count: count() }).from(documents);
      const indexedDocsResult = await db.select({ count: count() }).from(documents).where(eq(documents.status, 'indexed'));
      const totalChunksResult = await db.select({ count: count() }).from(documentChunks);

      const queries24hQuery = `
        SELECT 
          COUNT(*) as total_queries,
          COALESCE(AVG(execution_time), 0) as avg_time,
          COUNT(*) FILTER (WHERE relevance_feedback = 'helpful') as helpful_count,
          COUNT(*) FILTER (WHERE relevance_feedback = 'not_helpful') as not_helpful_count
        FROM search_queries
        WHERE created_at >= NOW() - INTERVAL '24 hours';
      `;
      const queriesResult = await pool.query(queries24hQuery);
      const qRow = queriesResult.rows[0] || {};

      return {
        totalDocuments: Number(totalDocsResult[0]?.count || 0),
        indexedDocuments: Number(indexedDocsResult[0]?.count || 0),
        totalChunks: Number(totalChunksResult[0]?.count || 0),
        queriesLast24h: Number(qRow.total_queries || 0),
        averageExecutionTimeMs: Math.round(Number(qRow.avg_time || 0)),
        helpfulFeedbackCount: Number(qRow.helpful_count || 0),
        notHelpfulFeedbackCount: Number(qRow.not_helpful_count || 0),
      };
    } catch {
      return localStore.getAnalyticsStats();
    }
  },

  async getRecentQueries(limit: number = 50) {
    try {
      return await db.select().from(searchQueries).orderBy(desc(searchQueries.createdAt)).limit(limit);
    } catch {
      return localStore.listRecentQueries(limit);
    }
  },
};
