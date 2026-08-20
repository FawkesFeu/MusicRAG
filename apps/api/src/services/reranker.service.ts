import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import type { SearchResult } from '@rag/shared';

let genAI: GoogleGenerativeAI | null = null;
function getGenAI(): GoogleGenerativeAI | null {
  const key = env.GEMINI_RERANKER_API_KEY || env.GEMINI_API_KEY;
  if (!genAI && key && key.trim() !== '') {
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI;
}

const DIVERSITY_MAX_CHUNKS_PER_DOC = 2;
const MIN_RELEVANCE_THRESHOLD = 0.35;

export const rerankerService = {
  /**
   * Evaluates candidate passages via Gemini Batch Cross-Scoring with:
   * 1. Multi-signal relevance scoring (Document Title + Section + Content)
   * 2. Document Diversity constraint (Max 2 chunks per document)
   * 3. Dynamic Thresholding (drops noisy/irrelevant chunks below threshold)
   * 4. Graceful offline fallback
   */
  async rerank(
    originalQuery: string,
    effectiveQuery: string,
    candidates: SearchResult[],
    topK: number = 5
  ): Promise<SearchResult[]> {
    if (!candidates || candidates.length === 0) return [];

    // 1. Deduplicate by chunkId
    const uniqueCandidatesMap = new Map<string, SearchResult>();
    for (const c of candidates) {
      if (!uniqueCandidatesMap.has(c.chunkId)) {
        uniqueCandidatesMap.set(c.chunkId, c);
      }
    }
    const uniqueCandidates = Array.from(uniqueCandidatesMap.values());

    if (uniqueCandidates.length <= 1) {
      return uniqueCandidates;
    }

    // 2. Try Gemini Batch Cross-Encoder
    try {
      const ai = getGenAI();
      if (ai) {
        const scoredByGemini = await this.scoreCandidatesWithGemini(
          originalQuery,
          effectiveQuery,
          uniqueCandidates
        );
        if (scoredByGemini && scoredByGemini.length > 0) {
          return this.applyDiversityAndThreshold(scoredByGemini, topK);
        }
      }
    } catch (err: any) {
      console.warn(`[RERANKER] Gemini batch scoring error (${err.message || 'fallback'}), using mathematical fallback`);
    }

    // 3. Fallback: Mathematical multi-signal cross-scorer
    const fallbackScored = this.scoreCandidatesMathematical(originalQuery, effectiveQuery, uniqueCandidates);
    return this.applyDiversityAndThreshold(fallbackScored, topK);
  },

  /**
   * Sends candidate pool to Gemini Flash in a single structured batch call.
   */
  async scoreCandidatesWithGemini(
    originalQuery: string,
    effectiveQuery: string,
    candidates: SearchResult[]
  ): Promise<Array<SearchResult & { finalScore: number }>> {
    const ai = getGenAI();
    if (!ai) return [];

    const candidatePayload = candidates.slice(0, 15).map((c) => ({
      id: c.chunkId,
      document: c.documentTitle,
      filename: c.filename,
      section: c.metadata?.section || c.metadata?.heading || 'General',
      snippet: c.content.length > 180 ? `${c.content.slice(0, 180)}...` : c.content,
    }));

    const prompt = `You are an expert search cross-encoder for the Music Industry & Audio Engineering knowledge base.
Evaluate how factually relevant each candidate chunk is for answering the user question.

USER QUESTION (Original): "${originalQuery}"
USER QUESTION (Technical Expansion): "${effectiveQuery}"

CANDIDATE CHUNKS:
${JSON.stringify(candidatePayload, null, 2)}

TASK:
Output a JSON array of objects evaluating EVERY candidate:
[
  { "id": "chunkId", "score": 0.95, "reason": "Direct answer for Spotify LUFS target and true peak ceiling" }
]

SCORING GUIDELINES:
- Score 0.85 - 1.00: Chunk directly contains the specific factual answer, rule, contract split, or technical spec.
- Score 0.50 - 0.84: Chunk provides relevant background context.
- Score 0.20 - 0.49: Chunk is somewhat related to domain but does not answer the question.
- Score 0.00 - 0.19: Chunk is completely unrelated or belongs to a different topic.
- CORE DOC PREFERENCE: Give primary technical specifications & licensing guides (e.g. "digital-audio-workstation-and-mastering-specs.md", "streaming-royalties-and-payouts.md", "music-licensing-and-sync-guide.md") higher scores than general background text unless the query specifically asks for other topics.

Output ONLY the raw JSON array. No markdown code blocks, no explanation.`;

    const model = ai.getGenerativeModel({
      model: env.GEMINI_RERANKER_MODEL || 'gemini-3.5-flash-lite',
      generationConfig: {
        temperature: 0.0,
        responseMimeType: 'application/json',
      },
    });

    const response = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Reranker timeout')), 8000)),
    ]);

    const text = response.response?.text()?.trim();
    if (!text) return [];

    let parsed: Array<{ id: string; score: number; reason?: string }>;
    try {
      parsed = JSON.parse(text);
    } catch {
      // Clean possible json code blocks
      const cleaned = text.replace(/```json\s*|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    }

    const scoreMap = new Map<string, number>();
    for (const item of parsed) {
      if (item.id && typeof item.score === 'number') {
        scoreMap.set(item.id, Math.max(0, Math.min(1, item.score)));
      }
    }

    return candidates.map((c) => {
      let llmScore = scoreMap.get(c.chunkId) ?? 0.25;
      const fnLower = c.filename.toLowerCase();
      const isChangelog = fnLower.startsWith('changelogs/');

      // Authoritative core specification prior
      if (
        (fnLower.includes('digital-audio-workstation') || fnLower.includes('streaming-royalties') || fnLower.includes('music-licensing'))
      ) {
        llmScore = Math.min(1.0, llmScore + 0.20);
      }

      const baseSimilarity = c.similarity || 0;
      // 65% LLM Cross-Attention Score + 35% Base Vector Similarity
      const finalScore = (llmScore * 0.65) + (baseSimilarity * 0.35);
      return {
        ...c,
        finalScore,
      };
    });
  },

  /**
   * Fast mathematical multi-signal cross-scorer (offline fallback).
   */
  scoreCandidatesMathematical(
    originalQuery: string,
    effectiveQuery: string,
    candidates: SearchResult[]
  ): Array<SearchResult & { finalScore: number }> {
    const combined = `${originalQuery} ${effectiveQuery}`.toLowerCase();
    const queryTokens = combined
      .replace(/[^\w\s.-]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    return candidates.map((chunk, originalRank) => {
      let score = (chunk.similarity || 0) * 0.35;
      const contentLower = chunk.content.toLowerCase();
      const titleLower = chunk.documentTitle.toLowerCase();
      const filenameLower = chunk.filename.toLowerCase();
      const headingLower = (chunk.metadata?.heading || '').toLowerCase();
      const sectionLower = (chunk.metadata?.section || '').toLowerCase();

      let matchCount = 0;
      for (const token of queryTokens) {
        if (contentLower.includes(token)) matchCount += 1.0;
        if (titleLower.includes(token) || filenameLower.includes(token)) matchCount += 1.8;
        if (headingLower.includes(token) || sectionLower.includes(token)) matchCount += 1.4;
      }
      const tokenRatio = queryTokens.length > 0 ? matchCount / queryTokens.length : 0;
      score += Math.min(tokenRatio, 1.0) * 0.30;

      // Music Industry Domain & Topic Boosts
      if (
        (combined.includes('royalty') || combined.includes('stream') || combined.includes('payout') || combined.includes('pro-rata') || combined.includes('telif')) &&
        filenameLower.includes('streaming-royalties')
      ) {
        score += 0.40;
      }

      if (
        (combined.includes('sync') || combined.includes('master use') || combined.includes('lisans') || combined.includes('cue sheet')) &&
        filenameLower.includes('music-licensing')
      ) {
        score += 0.40;
      }

      if (
        (combined.includes('lufs') || combined.includes('daw') || combined.includes('sample rate') || combined.includes('mastering') || combined.includes('true peak')) &&
        filenameLower.includes('digital-audio-workstation')
      ) {
        score += 0.40;
      }

      if (
        (combined.includes('isrc') || combined.includes('iswc') || combined.includes('upc') || combined.includes('ddex') || combined.includes('metadata')) &&
        filenameLower.includes('music-distribution')
      ) {
        score += 0.40;
      }

      if (
        (combined.includes('rider') || combined.includes('tour') || combined.includes('guarantee') || combined.includes('door split') || combined.includes('konser')) &&
        filenameLower.includes('live-touring')
      ) {
        score += 0.40;
      }

      if (
        (combined.includes('360') || combined.includes('label') || combined.includes('recoup') || combined.includes('advance')) &&
        filenameLower.includes('record-label')
      ) {
        score += 0.40;
      }

      if (
        (combined.includes('sample') || combined.includes('clearance') || combined.includes('interpolation') || combined.includes('copyright')) &&
        filenameLower.includes('music-copyright')
      ) {
        score += 0.40;
      }

      if (
        (combined.includes('checklist') || combined.includes('pitch') || combined.includes('rollout') || combined.includes('pre-save')) &&
        filenameLower.includes('artist-onboarding')
      ) {
        score += 0.40;
      }

      score += (1 / (originalRank + 1)) * 0.05;

      return {
        ...chunk,
        finalScore: score,
      };
    });
  },

  /**
   * Applies:
   * 1. Sorting by finalScore descending
   * 2. Strict Content & ID Deduplication
   * 3. Information-Level Cluster & Document Diversity (Max 2 chunks per cluster/doc, max 1 changelog)
   * 4. Strong Retrieval Guard for top authoritative specs
   * 5. Dynamic threshold filtering
   */
  applyDiversityAndThreshold(
    scoredCandidates: Array<SearchResult & { finalScore: number }>,
    topK: number = 5
  ): SearchResult[] {
    // Sort descending
    scoredCandidates.sort((a, b) => b.finalScore - a.finalScore);

    const docCountMap = new Map<string, number>();
    const clusterCountMap = new Map<string, number>();
    const seenContentKeys = new Set<string>();
    let changelogCount = 0;
    const selected: SearchResult[] = [];

    const getClusterKey = (filename: string): string => {
      const fn = filename.toLowerCase();
      if (fn.includes('streaming-royalties')) return 'cluster:royalties';
      if (fn.includes('music-licensing')) return 'cluster:licensing';
      if (fn.includes('digital-audio-workstation')) return 'cluster:daw_specs';
      if (fn.includes('music-distribution')) return 'cluster:metadata';
      if (fn.includes('live-touring')) return 'cluster:touring';
      if (fn.includes('record-label')) return 'cluster:label_deals';
      if (fn.includes('music-copyright')) return 'cluster:copyright';
      if (fn.includes('artist-onboarding')) return 'cluster:checklist';
      return `doc:${fn}`;
    };

    const topScore = scoredCandidates.length > 0 ? scoredCandidates[0].finalScore : 1.0;
    // Dynamic drop-off threshold: at least 0.35, or at least 45% of the highest score
    const effectiveThreshold = Math.max(MIN_RELEVANCE_THRESHOLD, topScore * 0.45);

    for (const item of scoredCandidates) {
      // 1. Strict Content Deduplication (avoids identical/overlapping paragraphs from appearing twice)
      const contentKey = item.content.trim().slice(0, 100).toLowerCase();
      if (seenContentKeys.has(contentKey)) {
        continue;
      }

      const docKey = item.filename || item.documentTitle;
      const fnLower = (item.filename || '').toLowerCase();
      const isChangelog = fnLower.startsWith('changelogs/');

      // Cap changelogs to max 1 across results
      if (isChangelog && changelogCount >= 1) {
        continue;
      }

      const clusterKey = getClusterKey(docKey);
      const currentDocCount = docCountMap.get(docKey) || 0;
      const currentClusterCount = clusterCountMap.get(clusterKey) || 0;

      // 2. Enforce Document & Cluster Diversity (max 2 per single doc, max 2 per information cluster)
      if (currentDocCount >= DIVERSITY_MAX_CHUNKS_PER_DOC || currentClusterCount >= 2) {
        continue;
      }

      // 3. Enforce Dynamic Threshold (unless selected list is empty)
      if (item.finalScore < effectiveThreshold && selected.length >= 2) {
        continue;
      }

      seenContentKeys.add(contentKey);
      docCountMap.set(docKey, currentDocCount + 1);
      clusterCountMap.set(clusterKey, currentClusterCount + 1);
      if (isChangelog) changelogCount++;
      const { finalScore, ...chunk } = item;
      selected.push(chunk);

      if (selected.length >= topK) {
        break;
      }
    }

    return selected;
  },
};
