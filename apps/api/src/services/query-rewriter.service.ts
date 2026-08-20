import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';

let genAI: GoogleGenerativeAI | null = null;
if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

export interface QueryAnalysis {
  canonicalQuery: string;
  subQueries: string[];
  keywords: string[];
  domain?: string;
  mustHaveConcepts?: string[];
}

const DECOMPOSER_SYSTEM_INSTRUCTION = `You are an expert search query analyzer and intent decomposer for a music industry and audio technology knowledge base.

TASK:
Analyze the user query and output a valid JSON object:
{
  "canonicalQuery": "Clean search query with Turkish/slang normalized to English.",
  "domain": "streaming_royalties | music_licensing | mastering_specs | metadata_standards | live_touring | label_contracts | copyright_sampling | release_rollout | off_corpus",
  "subQueries": ["Sub-intent 1", "Sub-intent 2"],
  "keywords": ["lexical term 1", "lexical term 2"],
  "mustHaveConcepts": ["mandatory concept 1", "mandatory concept 2"]
}

EXAMPLES:
- "spotify lufs sınırı kaç ve true peak ne olmalı?" -> {
    "canonicalQuery": "What is Spotify target LUFS ceiling and true peak limit?",
    "domain": "mastering_specs",
    "subQueries": ["What is the Spotify integrated LUFS target?", "What is the recommended true peak ceiling for Spotify masters?"],
    "keywords": ["Spotify LUFS", "integrated loudness", "true peak", "dBTP", "mastering"],
    "mustHaveConcepts": ["Spotify", "LUFS", "true peak"]
  }
- "Who owns master use rights vs publishing sync rights?" -> {
    "canonicalQuery": "Who owns master use rights vs publishing sync rights in music licensing?",
    "domain": "music_licensing",
    "subQueries": ["Who grants master use rights?", "Who grants sync publishing rights?"],
    "keywords": ["master use license", "sync license", "record label", "music publisher", "licensing"],
    "mustHaveConcepts": ["master use", "sync license"]
  }
- "What are the software engineer salary bands and bonus structures?" -> {
    "canonicalQuery": "What are the software engineer salary bands and bonus structures?",
    "domain": "off_corpus",
    "subQueries": ["software engineer salary bands", "annual bonus structures"],
    "keywords": ["salary bands", "bonus structures", "compensation"],
    "mustHaveConcepts": ["salary bands", "bonus structures"]
  }

Output ONLY valid raw JSON. No markdown code blocks.`;

export const queryRewriterService = {
  getGenAI(): GoogleGenerativeAI | null {
    const key = env.GEMINI_RERANKER_API_KEY || env.GEMINI_API_KEY;
    if (!genAI && key && key.trim() !== '') {
      genAI = new GoogleGenerativeAI(key);
    }
    return genAI;
  },

  /**
   * Performs structured query decomposition: canonical query, sub-queries, domain, and lexical keywords.
   */
  async decompose(query: string): Promise<QueryAnalysis> {
    const trimmed = query.trim();
    const fallback: QueryAnalysis = {
      canonicalQuery: trimmed,
      subQueries: [trimmed],
      keywords: trimmed
        .replace(/[^\w\s-]/g, ' ')
        .split(/\s+/)
        .filter((t) => t.length > 2),
      mustHaveConcepts: [],
    };

    if (!trimmed || trimmed.length < 3) return fallback;

    try {
      const ai = this.getGenAI();
      if (!ai) return fallback;

      const model = ai.getGenerativeModel({
        model: env.GEMINI_RERANKER_MODEL || 'gemini-3.5-flash-lite',
        generationConfig: {
          temperature: 0.0,
          responseMimeType: 'application/json',
        },
      });

      const prompt = `${DECOMPOSER_SYSTEM_INSTRUCTION}\n\nUSER QUERY:\n"${trimmed}"`;
      const response = await Promise.race([
        model.generateContent(prompt),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Query decomposition timeout')), 3500)
        ),
      ]);

      const text = (response as any).response?.text()?.trim();
      if (!text) return fallback;

      let parsed: any;
      try {
        parsed = JSON.parse(text);
      } catch {
        const cleaned = text.replace(/```json\s*|```/g, '').trim();
        parsed = JSON.parse(cleaned);
      }

      const canonicalQuery =
        typeof parsed.canonicalQuery === 'string' && parsed.canonicalQuery.trim() !== ''
          ? parsed.canonicalQuery.trim()
          : trimmed;

      const subQueries = Array.isArray(parsed.subQueries) && parsed.subQueries.length > 0
        ? parsed.subQueries.filter((s: any) => typeof s === 'string' && s.trim().length > 0)
        : [canonicalQuery];

      const keywords = Array.isArray(parsed.keywords) && parsed.keywords.length > 0
        ? parsed.keywords.filter((k: any) => typeof k === 'string' && k.trim().length > 0)
        : fallback.keywords;

      const mustHaveConcepts = Array.isArray(parsed.mustHaveConcepts)
        ? parsed.mustHaveConcepts.filter((c: any) => typeof c === 'string' && c.trim().length > 0)
        : [];

      return {
        canonicalQuery,
        domain: parsed.domain,
        subQueries,
        keywords,
        mustHaveConcepts,
      };
    } catch {
      return fallback;
    }
  },

  /**
   * Fast rewrite returning single canonical search string.
   */
  async rewrite(query: string): Promise<string> {
    const analysis = await this.decompose(query);
    return analysis.canonicalQuery;
  },
};
