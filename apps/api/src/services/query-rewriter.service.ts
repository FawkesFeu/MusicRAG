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

const DECOMPOSER_SYSTEM_INSTRUCTION = `You are an expert search query analyzer and intent decomposer for a software engineering knowledge base (Playable Factory / Lumen game studio).

TASK:
Analyze the user query and output a valid JSON object:
{
  "canonicalQuery": "Clean search query with Turkish/slang normalized to English.",
  "domain": "build_pipeline | ad_network_specs | onboarding_access | sdk_api | qa_runtime | incident_postmortem | localization | off_corpus",
  "subQueries": ["Sub-intent 1", "Sub-intent 2"],
  "keywords": ["lexical term 1", "lexical term 2"],
  "mustHaveConcepts": ["mandatory concept 1", "mandatory concept 2"]
}

EXAMPLES:
- "ses dosyaları niye ayrı derleniyor build pipeline'da?" -> {
    "canonicalQuery": "Why are sound assets built in a separate pass in the build pipeline?",
    "domain": "build_pipeline",
    "subQueries": ["Why are sound assets built separately in the build pipeline?", "dedicated audio pass in lumen-build"],
    "keywords": ["sound assets", "audio pass", "separate pass", "build pipeline", "lumen-build"],
    "mustHaveConcepts": ["sound assets", "separate pass"]
  }
- "Who has production upload rights vs staging CDN access at Lumen?" -> {
    "canonicalQuery": "Who has production upload rights vs staging CDN access at Lumen?",
    "domain": "onboarding_access",
    "subQueries": ["Who has production upload rights at Lumen?", "Who has staging CDN access at Lumen?"],
    "keywords": ["staging CDN", "production upload", "Platform team", "producers", "access rights"],
    "mustHaveConcepts": ["staging CDN", "production upload"]
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
