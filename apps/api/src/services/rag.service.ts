import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { analyticsRepository } from '../repositories/analytics.repository.js';
import type { SearchResult, Citation, RAGResponse } from '@rag/shared';

let genAI: GoogleGenerativeAI | null = null;
if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

export const GROUNDING_SYSTEM_INSTRUCTION = `You are an expert AI software engineering assistant for a game studio / playable ads production team.
Your task is to answer the user's question accurately, concisely, and factually based ONLY on the provided document excerpts.

STRICT GROUNDING & CITATION RULES:
1. Base your answer ONLY on the provided context sources.
2. If the context does not contain sufficient facts to answer the question, state clearly: "The provided document corpus does not contain information to answer this question." Do NOT extrapolate, hallucinate, or make assumptions.
3. Explicitly cite your sources within your answer using [Source 1], [Source 2], etc. notation corresponding to the numbered context sources.
4. Pay attention to document statuses (e.g. deprecated SDKs like Lumen SDK v2 vs current v3, postmortems, or specific network specs) and highlight critical details accurately.
5. Be concise, professional, and clear.`;

export function extractCitations(answer: string, retrievedChunks: SearchResult[]): Citation[] {
  const isOffCorpus =
    answer.toLowerCase().includes('does not contain') ||
    answer.toLowerCase().includes('not covered in corpus') ||
    answer.toLowerCase().includes('no information');

  if (isOffCorpus) {
    return [];
  }

  const sourceRegex = /\[Source\s*(\d+)\]/gi;
  const citedIndices = new Set<number>();
  let match: RegExpExecArray | null;

  while ((match = sourceRegex.exec(answer)) !== null) {
    const index = parseInt(match[1], 10) - 1;
    if (index >= 0 && index < retrievedChunks.length) {
      citedIndices.add(index);
    }
  }

  // If no explicit [Source N] was matched, but answer is grounded, link top sources
  if (citedIndices.size === 0 && retrievedChunks.length > 0) {
    citedIndices.add(0);
  }

  return Array.from(citedIndices).map((idx) => {
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

export const ragService = {
  getGenAI(): GoogleGenerativeAI {
    if (!genAI) {
      if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
        genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
      } else {
        throw new Error('[RAGService] GEMINI_API_KEY is required in .env for Gemini 2.0 Flash RAG generation.');
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

    // Build structured context block with [Source N] labels
    const contextText = retrievedChunks
      .map((chunk, idx) => {
        const sourceNum = idx + 1;
        const meta = chunk.metadata;
        const sectionInfo = meta?.section ? ` | Section: ${meta.section}` : '';
        const headingInfo = meta?.heading ? ` | Heading: ${meta.heading}` : '';
        return `[Source ${sourceNum}] Document: ${chunk.documentTitle} (${chunk.filename}${sectionInfo}${headingInfo})\nContent:\n${chunk.content}\n---`;
      })
      .join('\n\n');

    let answer = '';
    let confidence = 0.95;
    let isCorpusGrounded = true;

    try {
      const ai = this.getGenAI();
      const model = ai.getGenerativeModel({
        model: env.GEMINI_MODEL || 'gemini-2.0-flash',
        systemInstruction: GROUNDING_SYSTEM_INSTRUCTION,
      });

      const prompt = `Context Information:\n${contextText}\n\nUser Question:\n${query}\n\nAnswer the question using ONLY the context above. If the information is not present, state that clearly:`;

      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1, // low temperature for strict grounding
          maxOutputTokens: 1024,
        },
      });

      answer = result.response.text().trim();
    } catch (err: any) {
      console.error('[RAG] Gemini API generation error:', err.message);
      throw err;
    }

    if (
      answer.toLowerCase().includes('does not contain') ||
      answer.toLowerCase().includes('not covered in corpus') ||
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
