import { getEncoding } from 'js-tiktoken';
import { DEFAULT_CHUNK_SETTINGS } from '@rag/shared';
import type { ChunkMetadata } from '@rag/shared';

let tokenizer: ReturnType<typeof getEncoding> | null = null;
try {
  tokenizer = getEncoding('cl100k_base');
} catch (e) {
  // Fallback to null if not available in specific env
}

export function countTokens(text: string): number {
  if (tokenizer) {
    try {
      return tokenizer.encode(text).length;
    } catch {
      // Fallback
    }
  }
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4);
}

export interface ChunkingOptions {
  maxChunkSize?: number;
  overlapSize?: number;
  separators?: readonly string[];
}

export interface RawChunk {
  content: string;
  tokens: number;
  startPosition: number;
  endPosition: number;
  metadata: ChunkMetadata;
}

export function detectSection(text: string): string | undefined {
  const match = text.match(/^#{1,3}\s+(.+)$/m);
  return match ? match[1].trim() : undefined;
}

export function detectHeading(text: string): string | undefined {
  const lines = text.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      return trimmed.replace(/^#+\s*/, '').trim();
    }
  }
  return undefined;
}

export function recursiveSplit(
  text: string,
  options: { maxChunkSize: number; overlapSize: number; separators: readonly string[] },
  separatorIndex: number = 0,
  currentOffset: number = 0
): RawChunk[] {
  const { maxChunkSize, overlapSize, separators } = options;
  const currentSeparator = separators[separatorIndex] ?? '';

  // If text already fits into maxChunkSize
  const totalTokens = countTokens(text);
  if (totalTokens <= maxChunkSize || separatorIndex >= separators.length) {
    if (text.trim().length === 0) return [];
    return [{
      content: text.trim(),
      tokens: totalTokens,
      startPosition: currentOffset,
      endPosition: currentOffset + text.length,
      metadata: {
        section: detectSection(text),
        heading: detectHeading(text),
      },
    }];
  }

  // Split by current separator
  const rawSplits = text.split(currentSeparator);
  const chunks: RawChunk[] = [];
  let buffer = '';
  let bufferStartOffset = currentOffset;
  let offsetTracker = currentOffset;

  for (let i = 0; i < rawSplits.length; i++) {
    const segment = rawSplits[i];
    const segmentTokens = countTokens(segment);

    // If an individual segment is larger than maxChunkSize, recurse down to next separator
    if (segmentTokens > maxChunkSize && separatorIndex + 1 < separators.length) {
      // Flush existing buffer first
      if (buffer.trim().length > 0) {
        chunks.push({
          content: buffer.trim(),
          tokens: countTokens(buffer),
          startPosition: bufferStartOffset,
          endPosition: bufferStartOffset + buffer.length,
          metadata: {
            section: detectSection(buffer),
            heading: detectHeading(buffer),
          },
        });
        buffer = '';
      }

      const subChunks = recursiveSplit(segment, options, separatorIndex + 1, offsetTracker);
      chunks.push(...subChunks);
      offsetTracker += segment.length + currentSeparator.length;
      bufferStartOffset = offsetTracker;
      continue;
    }

    const testBuffer = buffer ? `${buffer}${currentSeparator}${segment}` : segment;
    const testTokens = countTokens(testBuffer);

    if (testTokens <= maxChunkSize) {
      buffer = testBuffer;
    } else {
      // Flush current buffer
      if (buffer.trim().length > 0) {
        chunks.push({
          content: buffer.trim(),
          tokens: countTokens(buffer),
          startPosition: bufferStartOffset,
          endPosition: bufferStartOffset + buffer.length,
          metadata: {
            section: detectSection(buffer),
            heading: detectHeading(buffer),
          },
        });

        // Add overlap from the tail of buffer if possible
        const words = buffer.split(' ');
        const overlapWords = words.slice(-Math.min(words.length, Math.floor(overlapSize / 2))).join(' ');
        buffer = overlapWords ? `${overlapWords}${currentSeparator}${segment}` : segment;
        bufferStartOffset = offsetTracker - overlapWords.length;
      } else {
        buffer = segment;
      }
    }

    offsetTracker += segment.length + currentSeparator.length;
  }

  if (buffer.trim().length > 0) {
    chunks.push({
      content: buffer.trim(),
      tokens: countTokens(buffer),
      startPosition: bufferStartOffset,
      endPosition: bufferStartOffset + buffer.length,
      metadata: {
        section: detectSection(buffer),
        heading: detectHeading(buffer),
      },
    });
  }

  return chunks;
}

export function chunkDocument(
  content: string,
  options: ChunkingOptions = {}
): RawChunk[] {
  const maxChunkSize = options.maxChunkSize ?? DEFAULT_CHUNK_SETTINGS.MAX_CHUNK_SIZE;
  const overlapSize = options.overlapSize ?? DEFAULT_CHUNK_SETTINGS.OVERLAP_SIZE;
  const separators = options.separators ?? DEFAULT_CHUNK_SETTINGS.SEPARATORS;

  return recursiveSplit(content, { maxChunkSize, overlapSize, separators });
}
