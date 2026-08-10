import { embeddingService } from './embedding.service.js';
import { chunkRepository } from '../repositories/chunk.repository.js';
import { DEFAULT_SEARCH_SETTINGS } from '@rag/shared';
import type { SearchResult } from '@rag/shared';

export interface SearchOptions {
  topK?: number;
  minSimilarity?: number;
  useHybrid?: boolean;
}

export const searchService = {
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const topK = options.topK ?? DEFAULT_SEARCH_SETTINGS.TOP_K;
    const minSimilarity = options.minSimilarity ?? DEFAULT_SEARCH_SETTINGS.MIN_SIMILARITY;
    const useHybrid = options.useHybrid ?? true;

    // 1. Generate dense 768-dimensional semantic embedding via Google text-embedding-004
    const queryEmbedding = await embeddingService.embed(query);

    // 2. Perform vector search in pgvector / vector store
    const vectorResults = await chunkRepository.vectorSearch(queryEmbedding, topK * 3, minSimilarity);

    if (!useHybrid) {
      return vectorResults.slice(0, topK);
    }

    // 3. Keyword / Lexical search as a supporting signal
    const keywordResults = await chunkRepository.keywordSearch(query, topK * 2);

    // 4. Semantic-First Hybrid Score Fusion (80% Semantic Vector Similarity + 20% Lexical Boost)
    const chunkMap = new Map<string, SearchResult & { finalScore: number }>();

    // Add all semantic vector results with 80% primary weight
    vectorResults.forEach((res, rank) => {
      const semanticScore = (res.similarity || 0) * 0.80 + (1 / (rank + 1)) * 0.05;
      chunkMap.set(res.chunkId, {
        ...res,
        finalScore: semanticScore,
      });
    });

    // Add / merge keyword results with 20% secondary supporting weight
    keywordResults.forEach((res, rank) => {
      const existing = chunkMap.get(res.chunkId);
      const keywordBoost = (res.similarity || 0) * 0.20 + (1 / (rank + 1)) * 0.02;

      if (existing) {
        existing.finalScore += keywordBoost;
      } else {
        chunkMap.set(res.chunkId, {
          ...res,
          finalScore: keywordBoost,
        });
      }
    });

    const fused = Array.from(chunkMap.values())
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, topK)
      .map(({ finalScore, ...rest }) => rest);

    return fused;
  },
};
