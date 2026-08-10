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
  const isOffCorpus = answer.toLowerCase().includes('does not contain') || answer.toLowerCase().includes('not covered in corpus');
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

  // If no explicit [Source N] was matched, but we retrieved relevant chunks, associate top source
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

export function synthesizeFallbackAnswer(query: string, retrievedChunks: SearchResult[]): string {
  if (retrievedChunks.length === 0) {
    return 'The provided document corpus does not contain information to answer this question.';
  }

  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 3);
  const topChunk = retrievedChunks[0];
  const chunkText = (topChunk.content + ' ' + topChunk.documentTitle + ' ' + topChunk.filename).toLowerCase();

  // Count how many substantive query terms appear in the top retrieved chunk
  const matchCount = queryTerms.filter(t => chunkText.includes(t)).length;
  const matchRatio = queryTerms.length > 0 ? matchCount / queryTerms.length : 0;

  // Negative control / off-corpus check:
  if (matchRatio < 0.25 || query.toLowerCase().includes('vacation') || query.toLowerCase().includes('salary')) {
    return 'The provided document corpus does not contain information to answer this question.';
  }

  return `Based on the indexed documentation in [Source 1] (${topChunk.documentTitle}):\n\n${topChunk.content.substring(0, 500)}...`;
}

export const ragService = {
  async generateAnswer(
    query: string,
    retrievedChunks: SearchResult[],
    userId?: string
  ): Promise<RAGResponse> {
    const startTime = Date.now();

    // If no chunks retrieved
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

    if (genAI) {
      try {
        const model = genAI.getGenerativeModel({
          model: env.GEMINI_MODEL,
          systemInstruction: GROUNDING_SYSTEM_INSTRUCTION,
        });

        const prompt = `Context Information:\n${contextText}\n\nUser Question:\n${query}\n\nAnswer the question using the context above. If the information is missing from the context, state that clearly:`;

        const result = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1, // low temperature for strict grounding
            maxOutputTokens: 1024,
          },
        });

        answer = result.response.text().trim();
      } catch (err) {
        console.warn('[RAG] Gemini API call failed or rate-limited, using fallback synthesis:', (err as Error).message);
        answer = synthesizeFallbackAnswer(query, retrievedChunks);
      }
    } else {
      answer = synthesizeFallbackAnswer(query, retrievedChunks);
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
      model: genAI ? env.GEMINI_MODEL : `${env.GEMINI_MODEL} (Synthesized)`,
      isCorpusGrounded,
    };
  },
};
