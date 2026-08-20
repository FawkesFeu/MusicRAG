import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from '../config/env.js';
import { analyticsRepository } from '../repositories/analytics.repository.js';
import type { SearchResult, Citation, RAGResponse } from '@rag/shared';

let genAI: GoogleGenerativeAI | null = null;
if (env.GEMINI_API_KEY && env.GEMINI_API_KEY.trim() !== '') {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
}

export const GROUNDING_SYSTEM_INSTRUCTION = `You are a precise, deterministic AI assistant for a music industry & music technology platform.
Your task is to answer the user's question accurately, concisely, and factually based ONLY on the provided context excerpts.

CORE RULES:
1. STRICT GROUNDING & ABSTENTION:
   - Base your answer ONLY on the explicit statements in the provided context sources.
   - If the provided context does not contain sufficient evidence to answer the question, state clearly and concisely: "The provided document corpus does not contain information to answer this question." (or in Turkish if asked in Turkish: "Verilen doküman havuzunda bu soruya yanıt verebilecek bilgi bulunmamaktadır.")
   - Never answer from external or general knowledge. If a query asks about a specific entity, platform, or contract metric that is not in the context, explicitly state that information for that specific entity is not available in the corpus.

2. EXPLICIT FACT vs. INFERENCE DISTINCTION:
   - Clearly distinguish directly stated facts from inferences, calculations, or deductions.
   - If an answer requires logical inference or mathematical calculation, explicitly state that it is an inference or deduction rather than a directly stated fact.

3. ENTITY & PLATFORM ISOLATION (NO SOURCE MIXING):
   - Never mix or cross-contaminate requirements between different digital streaming platforms (DSPs), contract types, or metadata standards.
   - If a source describes Spotify requirements (e.g. -14 LUFS, 1,000 stream minimum) and Apple Music requirements (e.g. -16 LUFS, Sound Check), attribute requirements strictly and exclusively to the exact platform mentioned in that specific section.

4. CONCISENESS & RELEVANCE:
   - Answer ONLY the user's question.
   - Do NOT introduce tangential, unnecessary, or unprompted facts (e.g. if asked about onboarding rules, do not list file size specs unless directly relevant).

5. CITATION INVARIANTS:
   - Explicitly cite the specific source using [Source 1], [Source 2], etc. notation for every factual claim.
   - Only cite sources that directly support the claim.

6. LANGUAGE CONCORDANCE (BILINGUAL MATCHING):
   - Always respond in the SAME language that the user asked the question in.
   - If the user asks in Turkish, provide the grounded answer in natural, professional Turkish.
   - If the user asks in English, provide the answer in English.
   - Regardless of language, ALWAYS retain the standard citation markers like [Source 1], [Source 2] attached directly to your factual statements.`;

export function extractCitations(answer: string, retrievedChunks: SearchResult[]): Citation[] {
  const low = answer.toLowerCase();
  const isOffCorpus =
    low.includes('does not contain') ||
    low.includes('not covered in corpus') ||
    low.includes('not available in the provided corpus') ||
    low.includes('no information') ||
    low.includes('bilgi bulunmamaktadır') ||
    low.includes('içermemektedir') ||
    low.includes('yer almamaktadır');

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

    const lowAnswer = answer.toLowerCase();
    if (
      lowAnswer.includes('does not contain') ||
      lowAnswer.includes('not covered in corpus') ||
      lowAnswer.includes('not available in the provided corpus') ||
      lowAnswer.includes('no information') ||
      lowAnswer.includes('bilgi bulunmamaktadır') ||
      lowAnswer.includes('içermemektedir') ||
      lowAnswer.includes('yer almamaktadır')
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

  async generateAnswerStream(
    query: string,
    retrievedChunks: SearchResult[],
    onDelta: (delta: string) => void,
    userId?: string
  ): Promise<RAGResponse> {
    const startTime = Date.now();

    // If no chunks retrieved or below threshold
    if (retrievedChunks.length === 0) {
      const fallbackAnswer = 'The provided document corpus does not contain information to answer this question.';
      onDelta(fallbackAnswer);
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
        answer: fallbackAnswer,
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

    let fullAnswer = '';

    try {
      const ai = this.getGenAI();
      const model = ai.getGenerativeModel({
        model: env.GEMINI_MODEL || 'gemini-flash-latest',
        systemInstruction: GROUNDING_SYSTEM_INSTRUCTION,
      });

      const prompt = `Context Information:\n${contextText}\n\nUser Question:\n${query}\n\nAnswer the question concisely and accurately based ONLY on the context above. If the information is not present, state that clearly:`;

      const streamResult = await model.generateContentStream({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 1024,
        },
      });

      for await (const chunk of streamResult.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          fullAnswer += chunkText;
          onDelta(chunkText);
        }
      }
    } catch (err: any) {
      console.error('[RAG] Gemini API streaming error:', err.message);
      throw err;
    }

    fullAnswer = fullAnswer.trim();

    let confidence = 0.95;
    let isCorpusGrounded = true;

    const lowFull = fullAnswer.toLowerCase();
    if (
      lowFull.includes('does not contain') ||
      lowFull.includes('not covered in corpus') ||
      lowFull.includes('not available in the provided corpus') ||
      lowFull.includes('no information') ||
      lowFull.includes('bilgi bulunmamaktadır') ||
      lowFull.includes('içermemektedir') ||
      lowFull.includes('yer almamaktadır')
    ) {
      isCorpusGrounded = false;
      confidence = 0;
    }

    const citations = isCorpusGrounded ? extractCitations(fullAnswer, retrievedChunks) : [];
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
      answer: fullAnswer,
      citations,
      retrievedChunks,
      confidence,
      executionTimeMs,
      model: env.GEMINI_MODEL,
      isCorpusGrounded,
    };
  },
};

