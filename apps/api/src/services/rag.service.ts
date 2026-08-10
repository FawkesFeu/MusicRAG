import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { analyticsRepository } from '../repositories/analytics.repository.js';
import type { SearchResult, Citation, RAGResponse } from '@rag/shared';

let genAI: GoogleGenerativeAI | null = null;
if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

export const GROUNDING_SYSTEM_INSTRUCTION = `You are an expert AI software engineering assistant for a game studio / playable ads production team.
Your task is to answer the user's question accurately and concisely based ONLY on the provided document excerpts.

STRICT GROUNDING RULES:
1. Base your answer ONLY on the provided context sources.
2. If the context does not contain the answer, state clearly: "The provided document corpus does not contain information to answer this question." Do NOT hallucinate or guess.
3. Explicitly cite your sources within your answer using [Source 1], [Source 2], etc. notation corresponding to the numbered context sources.
4. Pay attention to document statuses (such as deprecated SDKs, postmortems, or specific network specs) and highlight critical details accurately.
5. Be concise, professional, and clear.`;

export function extractCitations(answer: string, retrievedChunks: SearchResult[]): Citation[] {
  const sourceRegex = /\[Source\s*(\d+)\]/gi;
  const citedIndices = new Set<number>();
  let match: RegExpExecArray | null;

  while ((match = sourceRegex.exec(answer)) !== null) {
    const index = parseInt(match[1], 10) - 1;
    if (index >= 0 && index < retrievedChunks.length) {
      citedIndices.add(index);
    }
  }

  // If no explicit [Source N] was matched, but we retrieved highly relevant chunks and answer is not "not found", associate top sources
  if (citedIndices.size === 0 && retrievedChunks.length > 0 && !answer.toLowerCase().includes('does not contain')) {
    retrievedChunks.slice(0, 2).forEach((_, idx) => citedIndices.add(idx));
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

export function synthesizeFallbackAnswer(query: string, retrievedChunks: SearchResult[]): string {
  if (retrievedChunks.length === 0) {
    return 'The provided document corpus does not contain information to answer this question.';
  }

  const topChunk = retrievedChunks[0];
  if (topChunk.similarity < 0.2) {
    return 'The provided document corpus does not contain information to answer this question.';
  }

  return `Based on the indexed documentation in [Source 1] (${topChunk.documentTitle}):\n\n${topChunk.content.substring(0, 400)}...`;
}

export const ragService = {
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

    // Build context block
    const formattedContext = retrievedChunks
      .map((chunk, idx) => `[Source ${idx + 1}] (Document: "${chunk.documentTitle}", File: ${chunk.filename})\n${chunk.content}`)
      .join('\n\n---\n\n');

    let answerText = '';
    let isCorpusGrounded = true;

    if (genAI && env.GEMINI_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({
          model: env.GEMINI_MODEL || 'gemini-2.0-flash',
          systemInstruction: GROUNDING_SYSTEM_INSTRUCTION,
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
          },
        });

        const prompt = `Context:\n${formattedContext}\n\nUser Question:\n${query}`;
        const result = await model.generateContent(prompt);
        answerText = result.response.text();
      } catch (err) {
        console.warn('[RAGService] Gemini API call failed, using fallback synthesizer:', (err as Error).message);
        answerText = synthesizeFallbackAnswer(query, retrievedChunks);
      }
    } else {
      answerText = synthesizeFallbackAnswer(query, retrievedChunks);
    }

    if (answerText.toLowerCase().includes('does not contain') || answerText.toLowerCase().includes('not enough information')) {
      isCorpusGrounded = false;
    }

    const citations = isCorpusGrounded ? extractCitations(answerText, retrievedChunks) : [];
    const executionTimeMs = Date.now() - startTime;
    const confidence = isCorpusGrounded && citations.length > 0 ? 0.95 : (isCorpusGrounded ? 0.7 : 0.0);

    if (userId) {
      await analyticsRepository.logSearch({
        userId,
        query,
        retrievedChunkCount: retrievedChunks.length,
        answerGenerated: true,
        executionTime: executionTimeMs,
      });
    }

    return {
      query,
      answer: answerText,
      citations,
      retrievedChunks,
      confidence,
      executionTimeMs,
      model: env.GEMINI_MODEL,
      isCorpusGrounded,
    };
  },
};
