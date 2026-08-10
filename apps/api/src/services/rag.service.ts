import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { analyticsRepository } from '../repositories/analytics.repository.js';
import type { SearchResult, Citation, RAGResponse } from '@rag/shared';

let genAI: GoogleGenerativeAI | null = null;
if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

export const GROUNDING_SYSTEM_INSTRUCTION = `You are a precise, deterministic AI software engineering assistant for a game studio / playable ads production team.
Your task is to answer the user's question accurately, concisely, and factually based ONLY on the provided context excerpts.

CORE RULES:
1. STRICT GROUNDING & ABSTENTION:
   - Base your answer ONLY on the explicit statements in the provided context sources.
   - If the provided context does not contain sufficient evidence to answer the question, state clearly and concisely: "The provided document corpus does not contain information to answer this question."
   - Never answer from external or general knowledge. If a query asks about a specific entity, ad network, or metric (e.g. Google Ads, Meta MRAID, employee salaries) that is not in the context, explicitly state that information for that specific entity is not available in the corpus.

2. EXPLICIT FACT vs. INFERENCE DISTINCTION:
   - Clearly distinguish directly stated facts from inferences, calculations, or deductions.
   - If an answer requires logical inference or mathematical calculation (e.g. calculating total developers from pod counts), explicitly state that it is an inference or deduction rather than a directly stated fact (e.g. "The documentation does not explicitly state the total number of developers; however, based on 3 pods × 2 developers per pod [Source 1], the implied total is 6.").

3. ENTITY & NETWORK ISOLATION (NO SOURCE MIXING):
   - Never mix or cross-contaminate requirements between different ad networks, SDK versions, or entities.
   - If a source describes Unity requirements (e.g. ZIP archive) and Meta requirements (e.g. single HTML) or AppLovin (e.g. single HTML), attribute requirements strictly and exclusively to the exact network mentioned in that specific section.

4. CONCISENESS & RELEVANCE:
   - Answer ONLY the user's question.
   - Do NOT introduce tangential, unnecessary, or unprompted facts (e.g. if asked about onboarding rules, do not list file size specs unless directly relevant).

5. CITATION INVARIANTS:
   - Explicitly cite the specific source using [Source 1], [Source 2], etc. notation for every factual claim.
   - Only cite sources that directly support the claim.`;

export function extractCitations(answer: string, retrievedChunks: SearchResult[]): Citation[] {
  const isOffCorpus =
    answer.toLowerCase().includes('does not contain') ||
    answer.toLowerCase().includes('not covered in corpus') ||
    answer.toLowerCase().includes('not available in the provided corpus') ||
    answer.toLowerCase().includes('no information');

  if (isOffCorpus) {
    return [];
  }

  // Matches [Source 1], [Source 1, 2], [Source 1, Source 2], [Source 1, Source 4]
  const sourcePattern = /\[Source\s*([0-9,\sSource]+)\]/gi;
  const citedIndices = new Set<number>();
  let match: RegExpExecArray | null;

  while ((match = sourcePattern.exec(answer)) !== null) {
    const inside = match[1];
    const numbers = inside.match(/\d+/g);
    if (numbers) {
      for (const numStr of numbers) {
        const index = parseInt(numStr, 10) - 1;
        if (index >= 0 && index < retrievedChunks.length) {
          citedIndices.add(index);
        }
      }
    }
  }

  return Array.from(citedIndices)
    .sort((a, b) => a - b)
    .map((idx) => {
      const chunk = retrievedChunks[idx];
      return {
        sourceIndex: idx + 1,
        documentId: chunk.documentId,
        documentTitle: chunk.documentTitle,
        filename: chunk.filename,
        chunkId: chunk.chunkId,
        content: chunk.content,
        pageNumber: chunk.metadata?.pageNumber,
        section: chunk.metadata?.section,
        heading: chunk.metadata?.heading,
      };
    });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      attempt++;
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Quota exceeded')) {
        const delay = 8000 + attempt * 2000;
        console.log(`[RAGService] Rate limit hit (429). Pausing for ${Math.round(delay / 1000)}s before retrying...`);
        await new Promise((res) => setTimeout(res, delay));
      } else if (attempt >= maxRetries) {
        throw error;
      } else {
        await new Promise((res) => setTimeout(res, 1000 * attempt));
      }
    }
  }
  throw new Error('Max retries exceeded for Gemini generation');
}

export const ragService = {
  getGenAI(): GoogleGenerativeAI {
    if (!genAI) {
      if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
        genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      } else {
        throw new Error('[RAGService] GEMINI_API_KEY is required in .env for Gemini RAG generation.');
      }
    }
    return genAI;
  },

  async generateAnswer(
    query: string,
    retrievedChunks: SearchResult[],
    userId?: string
  ): Promise<RAGResponse> {
    const startTime = Date.now();

    // If no chunks retrieved or below threshold
    if (retrievedChunks.length === 0) {
      const executionTimeMs = Date.now() - startTime;
      if (userId) {
        await analyticsRepository.logSearch({
          userId,
          query,
          retrievedChunkCount: 0,
          answerGenerated: false,
          executionTime: executionTimeMs,
        });
      }

      return {
        query,
        answer: 'The provided document corpus does not contain information to answer this question.',
        citations: [],
        retrievedChunks: [],
        confidence: 0,
        executionTimeMs,
        model: env.GEMINI_MODEL,
        isCorpusGrounded: false,
      };
    }

    // Build structured context block with explicit entity/source separation
    const contextText = retrievedChunks
      .map((chunk, idx) => {
        const sourceNum = idx + 1;
        const meta = chunk.metadata;
        const sectionInfo = meta?.section ? ` | Section: ${meta.section}` : '';
        const headingInfo = meta?.heading ? ` | Heading: ${meta.heading}` : '';
        return `=== SOURCE [Source ${sourceNum}]: ${chunk.documentTitle} (${chunk.filename}${sectionInfo}${headingInfo}) ===\n${chunk.content}\n`;
      })
      .join('\n');

    let answer = '';
    let confidence = 0.95;
    let isCorpusGrounded = true;

    try {
      answer = await withRetry(async () => {
        const ai = this.getGenAI();
        const model = ai.getGenerativeModel({
          model: env.GEMINI_MODEL || 'gemini-flash-latest',
          systemInstruction: GROUNDING_SYSTEM_INSTRUCTION,
        });

        const prompt = `Context Information:\n${contextText}\n\nUser Question:\n${query}\n\nAnswer the question concisely and accurately based ONLY on the context above. If the information is not present, state that clearly:`;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1, // low temperature for strict factual grounding
            maxOutputTokens: 1024,
          },
        });

        return result.response.text().trim();
      });
    } catch (err: any) {
      console.error('[RAG] Gemini API generation error:', err.message);
      throw err;
    }

    if (
      answer.toLowerCase().includes('does not contain') ||
      answer.toLowerCase().includes('not covered in corpus') ||
      answer.toLowerCase().includes('not available in the provided corpus') ||
      answer.toLowerCase().includes('no information')
    ) {
      isCorpusGrounded = false;
      confidence = 0;
    }

    const citations = isCorpusGrounded ? extractCitations(answer, retrievedChunks) : [];
    const executionTimeMs = Date.now() - startTime;

    // Log telemetry
    if (userId) {
      try {
        await analyticsRepository.logSearch({
          userId,
          query,
          retrievedChunkCount: retrievedChunks.length,
          answerGenerated: isCorpusGrounded,
          executionTime: executionTimeMs,
        });
      } catch {
        // Ignore telemetry logging errors
      }
    }

    return {
      query,
      answer,
      citations,
      retrievedChunks,
      confidence,
      executionTimeMs,
      model: env.GEMINI_MODEL,
      isCorpusGrounded,
    };
  },
};
