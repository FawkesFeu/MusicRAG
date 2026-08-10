import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import crypto from 'crypto';

const VECTOR_DIMENSION = 768; // text-embedding-004

let genAI: GoogleGenerativeAI | null = null;
if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

/**
 * Deterministic pseudo-embedding for testing or when GEMINI_API_KEY is not set.
 * Uses SHA-256 hash seeds to generate normalized 768-dimensional unit vector.
 */
export function generateMockEmbedding(text: string): number[] {
  const hash = crypto.createHash('sha256').update(text.toLowerCase().trim()).digest();
  const vector: number[] = new Array(VECTOR_DIMENSION);
  
  for (let i = 0; i < VECTOR_DIMENSION; i++) {
    const byte = hash[i % hash.length];
    // Scale to range [-1, 1]
    vector[i] = ((byte + (i * 31) % 256) / 128.0) - 1.0;
  }
  
  // Normalize vector to unit length
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / (magnitude || 1));
}

export const embeddingService = {
  async embed(text: string): Promise<number[]> {
    if (!genAI || !env.GEMINI_API_KEY) {
      return generateMockEmbedding(text);
    }

    try {
      const model = genAI.getGenerativeModel({ model: env.EMBEDDING_MODEL || 'text-embedding-004' });
      const result = await model.embedContent(text);
      const values = result.embedding.values;
      return values;
    } catch (error) {
      console.warn('[EmbeddingService] Gemini API error, falling back to deterministic embedding:', (error as Error).message);
      return generateMockEmbedding(text);
    }
  },

  async embedMany(texts: string[], batchSize: number = 20): Promise<number[][]> {
    if (texts.length === 0) return [];
    
    if (!genAI || !env.GEMINI_API_KEY) {
      return texts.map(t => generateMockEmbedding(t));
    }

    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchPromises = batch.map(t => this.embed(t));
      const batchEmbeddings = await Promise.all(batchPromises);
      results.push(...batchEmbeddings);
    }

    return results;
  },
};
