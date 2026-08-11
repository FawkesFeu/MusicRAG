import { embeddingService } from './embedding.service.js';
import { chunkRepository } from '../repositories/chunk.repository.js';
import { queryRewriterService } from './query-rewriter.service.js';
import { rerankerService } from './reranker.service.js';
import { DEFAULT_SEARCH_SETTINGS } from '@rag/shared';
import type { SearchResult } from '@rag/shared';

export interface SearchOptions {
  topK?: number;
  minSimilarity?: number;
  useHybrid?: boolean;
  useRewriting?: boolean;
  useReranking?: boolean;
}

export const searchService = {
  async search(query: string, options: SearchOptions = {}): Promise<SearchResult[]> {
    const topK = options.topK ?? DEFAULT_SEARCH_SETTINGS.TOP_K;
    const minSimilarity = options.minSimilarity ?? DEFAULT_SEARCH_SETTINGS.MIN_SIMILARITY;
    const useHybrid = options.useHybrid ?? true;
    const useRewriting = options.useRewriting ?? true;
    const useReranking = options.useReranking ?? true;

    console.log('\n==================== [RAG RETRIEVAL PIPELINE] ====================');
    console.log(`[QUERY] Original Query:\n  "${query}"`);

    // 1. Query Analysis, Decomposition & Term Normalization
    let effectiveQuery = query;
    let subQueries = [query];
    let keywords: string[] = [];

    if (useRewriting) {
      const analysis = await queryRewriterService.decompose(query);
      effectiveQuery = analysis.canonicalQuery;
      subQueries = analysis.subQueries;
      keywords = analysis.keywords;
      console.log(`[ANALYSIS] Canonical Query: "${effectiveQuery}"`);
      console.log(`[ANALYSIS] Sub-Queries: ${JSON.stringify(subQueries)}`);
      console.log(`[ANALYSIS] Keywords: ${JSON.stringify(keywords)}`);
    } else {
      console.log(`[REWRITE] Skipped (useRewriting: false)`);
    }

    // 2. Multi-Branch Vector & Keyword Candidate Pool
    const candidateLimit = Math.max(topK * 4, 20);
    const chunkMap = new Map<string, SearchResult & { finalScore: number }>();
    const seenContentMap = new Map<string, string>(); // normalized content -> chunkId for strict dedup

    const addOrUpdateChunk = (res: SearchResult, score: number) => {
      // Normalize content snippet to catch cross-chunk duplicate text
      const contentKey = res.content.trim().slice(0, 100).toLowerCase();
      const existingId = seenContentMap.get(contentKey);

      if (existingId && existingId !== res.chunkId) {
        const existing = chunkMap.get(existingId);
        if (existing) {
          existing.finalScore = Math.max(existing.finalScore, score);
          return;
        }
      }

      seenContentMap.set(contentKey, res.chunkId);
      const existing = chunkMap.get(res.chunkId);
      if (existing) {
        existing.finalScore = Math.max(existing.finalScore, existing.finalScore * 0.7 + score * 0.3);
      } else {
        chunkMap.set(res.chunkId, {
          ...res,
          finalScore: score,
        });
      }
    };

    // Branch A: Vector search on Canonical Query
    const queryEmbedding = await embeddingService.embed(effectiveQuery);
    const vectorResultsA = await chunkRepository.vectorSearch(queryEmbedding, candidateLimit, minSimilarity);
    vectorResultsA.forEach((res, rank) => {
      const score = (res.similarity || 0) * 0.80 + (1 / (rank + 1)) * 0.05;
      addOrUpdateChunk(res, score);
    });

    // Branch B: Vector search on Sub-Queries (for multi-intent / comparative questions like Q11)
    for (const sub of subQueries) {
      if (sub.toLowerCase() !== effectiveQuery.toLowerCase()) {
        try {
          const subEmbedding = await embeddingService.embed(sub);
          const subVectorResults = await chunkRepository.vectorSearch(subEmbedding, 12, minSimilarity);
          subVectorResults.forEach((res, rank) => {
            const score = (res.similarity || 0) * 0.75 + (1 / (rank + 1)) * 0.04;
            addOrUpdateChunk(res, score);
          });
        } catch {
          // ignore error
        }
      }
    }

    // Branch C: Keyword / Lexical search with extracted anchors
    if (useHybrid) {
      const searchTerms = keywords.length > 0 ? keywords : [effectiveQuery];
      const keywordResultsA = await chunkRepository.keywordSearch(searchTerms, candidateLimit);
      keywordResultsA.forEach((res, rank) => {
        const boost = (res.similarity || 0) * 0.30 + (1 / (rank + 1)) * 0.04;
        addOrUpdateChunk(res, boost);
      });

      if (effectiveQuery.toLowerCase() !== query.toLowerCase()) {
        const keywordResultsB = await chunkRepository.keywordSearch(query, 8);
        keywordResultsB.forEach((res, rank) => {
          const boost = (res.similarity || 0) * 0.20 + (1 / (rank + 1)) * 0.02;
          addOrUpdateChunk(res, boost);
        });
      }
    }

    const candidates = Array.from(chunkMap.values())
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, candidateLimit)
      .map(({ finalScore, ...rest }) => rest);

    console.log(`[RETRIEVAL - Top ${candidates.length} Unique Hybrid Candidates]:`);
    candidates.slice(0, 6).forEach((c, idx) => {
      console.log(`  ${idx + 1}. [${c.filename}] (sim: ${((c.similarity || 0) * 100).toFixed(1)}%, title: "${c.documentTitle}")`);
    });

    // 6. Reranking Step: Gemini Batch Cross-Score & Diversity Filter (Bonus Feature)
    if (useReranking && candidates.length > 0) {
      const reranked = await rerankerService.rerank(query, effectiveQuery, candidates, topK);
      console.log(`[RERANK - Top ${reranked.length} Filtered Chunks (Diversity & Threshold Applied)]:`);
      reranked.forEach((c, idx) => {
        const sec = c.metadata?.section ? ` | Section: ${c.metadata.section}` : '';
        const head = c.metadata?.heading ? ` | Heading: ${c.metadata.heading}` : '';
        console.log(`  ${idx + 1}. [${c.filename}]${sec}${head}`);
      });
      console.log('===================================================================\n');
      return reranked;
    }

    console.log('===================================================================\n');
    return candidates.slice(0, topK);
  },
};



