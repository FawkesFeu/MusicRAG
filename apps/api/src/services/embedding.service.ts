import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import { env } from '../config/env.js';

let genAI: GoogleGenerativeAI | null = null;
if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

export const embeddingService = {
  getGenAI(): GoogleGenerativeAI {
    if (!genAI) {
      if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
        genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      } else {
        throw new Error('[EmbeddingService] GEMINI_API_KEY is required in .env for Google semantic embeddings.');
      }
    }
    return genAI;
  },

  /**
   * Embed search query with 768-dim output using TaskType.RETRIEVAL_QUERY for semantic retrieval.
   */
  async embed(queryText: string): Promise<number[]> {
    const ai = this.getGenAI();
    const model = ai.getGenerativeModel({ model: env.EMBEDDING_MODEL || 'gemini-embedding-001' });

    try {
      const result = await model.embedContent({
        content: { role: 'user', parts: [{ text: queryText }] },
        taskType: TaskType.RETRIEVAL_QUERY,
        outputDimensionality: 768 as any,
      } as any);

      return result.embedding.values;
    } catch (error: any) {
      console.error('[EmbeddingService] Error generating query embedding:', error.message);
      throw error;
    }
  },

  /**
   * Embed document chunks with 768-dim output using TaskType.RETRIEVAL_DOCUMENT.
   */
  async embedDocumentChunk(chunkText: string, title?: string): Promise<number[]> {
    const ai = this.getGenAI();
    const model = ai.getGenerativeModel({ model: env.EMBEDDING_MODEL || 'gemini-embedding-001' });

    try {
      const result = await model.embedContent({
        content: { role: 'user', parts: [{ text: chunkText }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
        title: title || undefined,
        outputDimensionality: 768 as any,
      } as any);

      return result.embedding.values;
    } catch (error: any) {
      console.error('[EmbeddingService] Error generating document chunk embedding:', error.message);
      throw error;
    }
  },

  /**
   * Batch embedding for multiple document chunks with rate-limit pacing.
   */
  async embedMany(texts: string[], batchSize: number = 5): Promise<number[][]> {
    if (texts.length === 0) return [];
    
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(t => this.embedDocumentChunk(t));
      const batchEmbeddings = await Promise.all(batchPromises);
      results.push(...batchEmbeddings);

      // Brief delay between batches to respect free tier rate limits
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    return results;
  },
};
