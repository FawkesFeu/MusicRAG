import { describe, it, expect } from 'vitest';
import { authService } from './auth.service.js';
import { chunkDocument, detectSection, detectHeading } from './chunking.service.js';
import { extractCitations, GROUNDING_SYSTEM_INSTRUCTION } from './rag.service.js';

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

describe('RAG & Citations', () => {
  it('extracts source citations correctly from generated text', () => {
    const answer = 'According to [Source 1], AppLovin maximum file size is 5MB. Also note [Source 2] for sounds.';
    const mockChunks = [
      {
        chunkId: 'c1',
        documentId: 'd1',
        documentTitle: 'Network Specs AppLovin',
        filename: 'network-specs-applovin.md',
        content: 'Max size 5MB',
        similarity: 0.95,
      },
      {
        chunkId: 'c2',
        documentId: 'd2',
        documentTitle: 'Build Pipeline',
        filename: 'build-pipeline.md',
        content: 'Sound asset compression pass',
        similarity: 0.88,
      },
    ];

    const citations = extractCitations(answer, mockChunks);
    expect(citations.length).toBe(2);
    expect(citations[0].sourceIndex).toBe(1);
    expect(citations[0].filename).toBe('network-specs-applovin.md');
    expect(citations[1].sourceIndex).toBe(2);
    expect(citations[1].filename).toBe('build-pipeline.md');
  });

  it('contains strict grounding rules in system instructions', () => {
    expect(GROUNDING_SYSTEM_INSTRUCTION).toContain('STRICT GROUNDING');
    expect(GROUNDING_SYSTEM_INSTRUCTION).toContain('[Source 1]');
  });
});
