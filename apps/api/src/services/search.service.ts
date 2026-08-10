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

    // 1. Keyword search
    const keywordResults = await chunkRepository.keywordSearch(query, topK * 2);

    // 2. Vector search
    const queryEmbedding = await embeddingService.embed(query);
    const vectorResults = await chunkRepository.vectorSearch(queryEmbedding, topK * 2, minSimilarity);

    if (!useHybrid) {
      return vectorResults.slice(0, topK);
    }

    // 3. Score Fusion: combine keyword and semantic signals
    const chunkMap = new Map<string, SearchResult & { finalScore: number }>();

    keywordResults.forEach((res, rank) => {
      chunkMap.set(res.chunkId, {
        ...res,
        finalScore: (res.similarity || 0) * 3.0 + (1 / (rank + 1)) * 2.0,
      });
    });

    vectorResults.forEach((res, rank) => {
      const existing = chunkMap.get(res.chunkId);
      if (existing) {
        existing.finalScore += (res.similarity || 0) * 1.5 + (1 / (rank + 1));
        existing.similarity = Math.max(existing.similarity, res.similarity);
      } else {
        chunkMap.set(res.chunkId, {
          ...res,
          finalScore: (res.similarity || 0) + (1 / (rank + 1)) * 0.5,
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
