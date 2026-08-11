import { describe, it, expect } from 'vitest';
import { authService } from './auth.service.js';
import { chunkDocument, detectSection, detectHeading } from './chunking.service.js';
import { ragService, extractCitations, GROUNDING_SYSTEM_INSTRUCTION } from './rag.service.js';
import { queryRewriterService } from './query-rewriter.service.js';
import { rerankerService } from './reranker.service.js';

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

  it('handles streaming empty chunks with honest abstention', async () => {
    const deltas: string[] = [];
    const response = await ragService.generateAnswerStream('off topic query', [], (delta) => {
      deltas.push(delta);
    });
    expect(deltas.length).toBeGreaterThan(0);
    expect(response.answer).toContain('does not contain');
    expect(response.isCorpusGrounded).toBe(false);
    expect(response.citations.length).toBe(0);
  });
});

describe('Query Rewriter Service', () => {
  it('returns query gracefully when given search question', async () => {
    const query = 'What is the maximum file size for AppLovin?';
    const result = await queryRewriterService.rewrite(query);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Reranker Service', () => {
  it('prioritizes AppLovin specific chunks for AppLovin questions', async () => {
    const query = 'What is the AppLovin playable file size?';
    const candidates = [
      {
        chunkId: 'c1',
        documentId: 'd1',
        documentTitle: 'Network Specs Unity',
        filename: 'network-specs-unity.md',
        content: 'Unity playable ads size limit is 10MB.',
        similarity: 0.82,
      },
      {
        chunkId: 'c2',
        documentId: 'd2',
        documentTitle: 'Network Specs AppLovin',
        filename: 'network-specs-applovin.md',
        content: 'AppLovin playable ads maximum bundle size is 5MB.',
        similarity: 0.80,
      },
    ];

    const reranked = await rerankerService.rerank(query, query, candidates, 1);
    expect(reranked[0].filename).toBe('network-specs-applovin.md');
  });

  it('prioritizes SDK v3 over deprecated v2 for current SDK questions', async () => {
    const query = 'How do I initialize the current Lumen SDK?';
    const candidates = [
      {
        chunkId: 'c1',
        documentId: 'd1',
        documentTitle: 'SDK Notes v2 (Deprecated)',
        filename: 'sdk-notes-v2.md',
        content: 'Lumen SDK v2 initialize with lumen.track.',
        similarity: 0.85,
      },
      {
        chunkId: 'c2',
        documentId: 'd2',
        documentTitle: 'SDK Notes v3 (Current)',
        filename: 'sdk-notes-v3.md',
        content: 'Lumen SDK v3 initialization method lumen.init().',
        similarity: 0.83,
      },
    ];

    const reranked = await rerankerService.rerank(query, query, candidates, 1);
    expect(reranked[0].filename).toBe('sdk-notes-v3.md');
  });

  it('prioritizes onboarding documents for Turkish new dev questions', async () => {
    const originalQuery = 'new dev ilk hafta ne yapıyor lumen\'da, bunu kim kontrol ediyor?';
    const effectiveQuery = 'What does a new developer do during their first week at Lumen and who reviews the work?';
    const candidates = [
      {
        chunkId: 'c1',
        documentId: 'd1',
        documentTitle: 'Company Overview',
        filename: 'company-overview.md',
        content: 'Playable Factory develops high performance playable ads.',
        similarity: 0.75,
      },
      {
        chunkId: 'c2',
        documentId: 'd2',
        documentTitle: 'Onboarding: New Developer',
        filename: 'onboarding-new-dev.md',
        content: 'Week 1: environment setup and shadow delivery reviewed by pod senior developer.',
        similarity: 0.72,
      },
    ];

    const reranked = await rerankerService.rerank(originalQuery, effectiveQuery, candidates, 1);
    expect(reranked[0].filename).toBe('onboarding-new-dev.md');
  });

  it('enforces document diversity (maximum 2 chunks per document in top results)', async () => {
    const candidates = [
      { chunkId: 'c1', documentId: 'd1', documentTitle: 'QA Doc', filename: 'qa.md', content: 'QA check 1', similarity: 0.95 },
      { chunkId: 'c2', documentId: 'd1', documentTitle: 'QA Doc', filename: 'qa.md', content: 'QA check 2', similarity: 0.94 },
      { chunkId: 'c3', documentId: 'd1', documentTitle: 'QA Doc', filename: 'qa.md', content: 'QA check 3', similarity: 0.93 },
      { chunkId: 'c4', documentId: 'd2', documentTitle: 'Build Doc', filename: 'build.md', content: 'Build check 1', similarity: 0.85 },
    ];

    const reranked = await rerankerService.rerank('general checks', 'general checks', candidates, 4);
    const qaChunks = reranked.filter((c) => c.filename === 'qa.md');
    expect(qaChunks.length).toBeLessThanOrEqual(2);
    expect(reranked.some((c) => c.filename === 'build.md')).toBe(true);
  });

  it('purges document, chunks, and embeddings on deleteByFilename (Self-Updating Watcher)', async () => {
    const { documentRepository } = await import('../repositories/document.repository.js');
    const { chunkRepository } = await import('../repositories/chunk.repository.js');

    // Create test document
    const doc = await documentRepository.create({
      title: 'TEMP TEST DOC',
      filename: 'temp-test-doc.md',
      fileType: 'markdown',
      fileSize: 120,
      checksum: 'test-checksum-12345',
    });

    // Create chunk and embedding
    const chunks = await chunkRepository.createChunks([
      {
        documentId: doc.id,
        chunkIndex: 0,
        content: 'Temporary content to test deletion',
        tokens: 10,
      },
    ]);

    await chunkRepository.insertEmbeddings([
      {
        chunkId: chunks[0].id,
        embedding: new Array(768).fill(0.1),
      },
    ]);

    // Verify document exists
    const foundBefore = await documentRepository.findByFilename('temp-test-doc.md');
    expect(foundBefore).not.toBeNull();

    // Perform deletion by filename (as executed by Watcher on file removal)
    const deleted = await documentRepository.deleteByFilename('temp-test-doc.md');
    expect(deleted).toBe(true);

    // Verify document, chunks, and embeddings are completely purged
    const foundAfter = await documentRepository.findByFilename('temp-test-doc.md');
    expect(foundAfter).toBeNull();

    const chunksAfter = await chunkRepository.findByDocumentId(doc.id);
    expect(chunksAfter.length).toBe(0);
  });
});




