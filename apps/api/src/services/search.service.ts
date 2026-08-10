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

    // 1. Embed query
    const queryEmbedding = await embeddingService.embed(query);

    // 2. Vector search via pgvector
    const vectorResults = await chunkRepository.vectorSearch(queryEmbedding, topK, minSimilarity);

    // 3. If hybrid search is enabled, combine with keyword search
    if (useHybrid && vectorResults.length < topK) {
      const keywordResults = await chunkRepository.keywordSearch(query, topK);
      const existingChunkIds = new Set(vectorResults.map(r => r.chunkId));
      
      for (const kr of keywordResults) {
        if (!existingChunkIds.has(kr.chunkId) && vectorResults.length < topK) {
          vectorResults.push(kr);
          existingChunkIds.add(kr.chunkId);
        }
      }
    }

    return vectorResults.slice(0, topK);
  },
};
