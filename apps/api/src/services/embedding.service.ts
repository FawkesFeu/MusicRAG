import { GoogleGenerativeAI, TaskType } from '@google/generative-ai';
import { env } from '../config/env.js';

let genAI: GoogleGenerativeAI | null = null;
if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 6): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Quota exceeded')) {
        const delay = 7500 + attempt * 1000;
        console.log(`[EmbeddingService] Rate limit hit (429). Pacing request, retrying in ${Math.round(delay / 1000)}s...`);
        await new Promise((res) => setTimeout(res, delay));
      } else if (attempt >= maxRetries) {
        throw error;
      } else {
        await new Promise((res) => setTimeout(res, 1000 * attempt));
      }
    }
  }
  throw new Error('Max retries exceeded for embedding API');
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
    return withRetry(async () => {
      const ai = this.getGenAI();
      const model = ai.getGenerativeModel({ model: env.EMBEDDING_MODEL || 'gemini-embedding-001' });

      const result = await model.embedContent({
        content: { role: 'user', parts: [{ text: queryText }] },
        taskType: TaskType.RETRIEVAL_QUERY,
        outputDimensionality: 768 as any,
      } as any);

      return result.embedding.values;
    });
  },

  /**
   * Embed document chunks with 768-dim output using TaskType.RETRIEVAL_DOCUMENT.
   */
  async embedDocumentChunk(chunkText: string, title?: string): Promise<number[]> {
    return withRetry(async () => {
      const ai = this.getGenAI();
      const model = ai.getGenerativeModel({ model: env.EMBEDDING_MODEL || 'gemini-embedding-001' });

      const result = await model.embedContent({
        content: { role: 'user', parts: [{ text: chunkText }] },
        taskType: TaskType.RETRIEVAL_DOCUMENT,
        title: title || undefined,
        outputDimensionality: 768 as any,
      } as any);

      return result.embedding.values;
    });
  },

  /**
   * Batch embedding for multiple document chunks with rate-limit pacing.
   */
  async embedMany(texts: string[], batchSize: number = 5): Promise<number[][]> {
    if (texts.length === 0) return [];

    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map((t) => this.embedDocumentChunk(t));
      const batchEmbeddings = await Promise.all(batchPromises);
      results.push(...batchEmbeddings);

      // Pacing delay between batches
      if (i + batchSize < texts.length) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    return results;
  },
};
