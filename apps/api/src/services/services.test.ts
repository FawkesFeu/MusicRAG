import { describe, it, expect } from 'vitest';
import { authService } from './auth.service.js';
import { chunkDocument, countTokens, detectSection, detectHeading } from './chunking.service.js';
import { generateMockEmbedding, embeddingService } from './embedding.service.js';
import { extractCitations, synthesizeFallbackAnswer, GROUNDING_SYSTEM_INSTRUCTION } from './rag.service.js';

describe('Auth Service', () => {
  it('hashes and compares passwords accurately', async () => {
    const password = 'mySecretPassword123!';
    const hash = await authService.hashPassword(password);
    expect(hash).not.toBe(password);
    expect(await authService.comparePassword(password, hash)).toBe(true);
    expect(await authService.comparePassword('wrong', hash)).toBe(false);
  });

  it('generates and verifies access JWT tokens', () => {
    const token = authService.generateAccessToken({
      userId: 'test-user-1',
      email: 'test@example.com',
      role: 'admin',
    });
    const verified = authService.verifyAccessToken(token);
    expect(verified.userId).toBe('test-user-1');
    expect(verified.role).toBe('admin');
  });
});

describe('Chunking Service', () => {
  it('detects headings and sections from markdown', () => {
    const md = `# Overview\nThis is an introduction.\n\n## Network Specs\nAppLovin specifications.`;
    expect(detectHeading(md)).toBe('Overview');
    expect(detectSection(md)).toBe('Overview');
  });

  it('splits long content into chunks with semantic boundary preservation', () => {
    const paragraphs = Array.from({ length: 20 }, (_, i) => `Paragraph ${i + 1}: Playable ads require strict bundle limits under 5MB.`).join('\n\n');
    const chunks = chunkDocument(paragraphs, { maxChunkSize: 50, overlapSize: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].tokens).toBeLessThanOrEqual(50);
  });
});

describe('Embedding Service', () => {
  it('generates 768-dimensional normalized unit vectors', () => {
    const vector = generateMockEmbedding('AppLovin playable ad specifications');
    expect(vector.length).toBe(768);
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    expect(magnitude).toBeCloseTo(1.0, 4);
  });
});

describe('RAG & Citations', () => {
  it('extracts source citations correctly from generated text', () => {
    const answer = 'According to [Source 1], AppLovin maximum file size is 5MB. Also note [Source 2] for sounds.';
    const mockChunks = [
      {
        chunkId: 'c1',
        documentId: 'd1',
        documentTitle: 'Network Specs AppLovin',
        filename: 'network-specs-applovin.md',
        content: 'Max size is 5MB.',
        similarity: 0.9,
      },
      {
        chunkId: 'c2',
        documentId: 'd2',
        documentTitle: 'Build Pipeline',
        filename: 'build-pipeline.md',
        content: 'Sounds are built in a separate pass.',
        similarity: 0.85,
      },
    ];

    const citations = extractCitations(answer, mockChunks);
    expect(citations.length).toBe(2);
    expect(citations[0].documentTitle).toBe('Network Specs AppLovin');
    expect(citations[1].documentTitle).toBe('Build Pipeline');
  });

  it('handles corpus-unknown answers cleanly without fake citations', () => {
    const answer = synthesizeFallbackAnswer('What is the CEO salary?', []);
    expect(answer).toContain('does not contain information');
  });
});
