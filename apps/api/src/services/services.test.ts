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
    const md = `# Overview\nThis is an introduction.\n\n## Technical Specs\nMastering specifications.`;
    expect(detectHeading(md)).toBe('Overview');
    expect(detectSection(md)).toBe('Overview');
  });

  it('splits long content into chunks with semantic boundary preservation', () => {
    const paragraphs = Array.from({ length: 20 }, (_, i) => `Paragraph ${i + 1}: Spotify target loudness is -14 LUFS with -1.0 dBTP ceiling.`).join('\n\n');
    const chunks = chunkDocument(paragraphs, { maxChunkSize: 50, overlapSize: 10 });
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].tokens).toBeLessThanOrEqual(50);
  });
});

describe('RAG & Citations', () => {
  it('extracts source citations correctly from generated text', () => {
    const answer = 'According to [Source 1], Spotify integrated target loudness is -14 LUFS. Also note [Source 2] for sync licenses.';
    const mockChunks = [
      {
        chunkId: 'c1',
        documentId: 'd1',
        documentTitle: 'DAW Mastering Specs',
        filename: 'digital-audio-workstation-and-mastering-specs.md',
        content: 'Spotify target -14 LUFS',
        similarity: 0.95,
      },
      {
        chunkId: 'c2',
        documentId: 'd2',
        documentTitle: 'Music Sync Guide',
        filename: 'music-licensing-and-sync-guide.md',
        content: 'Master and publishing sync licenses',
        similarity: 0.88,
      },
    ];

    const citations = extractCitations(answer, mockChunks);
    expect(citations.length).toBe(2);
    expect(citations[0].sourceIndex).toBe(1);
    expect(citations[0].filename).toBe('digital-audio-workstation-and-mastering-specs.md');
    expect(citations[1].sourceIndex).toBe(2);
    expect(citations[1].filename).toBe('music-licensing-and-sync-guide.md');
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
    const query = 'What is the recommended LUFS target for Spotify?';
    const result = await queryRewriterService.rewrite(query);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('Reranker Service', () => {
  it('prioritizes DAW mastering chunks for LUFS questions', async () => {
    const query = 'What is the Spotify target LUFS loudness limit?';
    const candidates = [
      {
        chunkId: 'c1',
        documentId: 'd1',
        documentTitle: 'Live Touring Contracts',
        filename: 'live-touring-and-performance-contracts.md',
        content: 'Technical rider requires 32 channel console.',
        similarity: 0.82,
      },
      {
        chunkId: 'c2',
        documentId: 'd2',
        documentTitle: 'DAW & Mastering Specs',
        filename: 'digital-audio-workstation-and-mastering-specs.md',
        content: 'Spotify target loudness is -14 LUFS with -1.0 dBTP ceiling.',
        similarity: 0.80,
      },
    ];

    const reranked = await rerankerService.rerank(query, query, candidates, 1);
    expect(reranked[0].filename).toBe('digital-audio-workstation-and-mastering-specs.md');
  });

  it('prioritizes sync guide for licensing questions', async () => {
    const query = 'What licenses are needed for film sync placement?';
    const candidates = [
      {
        chunkId: 'c1',
        documentId: 'd1',
        documentTitle: 'Record Label Deals',
        filename: 'record-label-deals-and-contracts.md',
        content: 'Major label advances and recoupment.',
        similarity: 0.85,
      },
      {
        chunkId: 'c2',
        documentId: 'd2',
        documentTitle: 'Music Licensing and Sync Guide',
        filename: 'music-licensing-and-sync-guide.md',
        content: 'Securing sync placement requires Master Use License and Sync License.',
        similarity: 0.83,
      },
    ];

    const reranked = await rerankerService.rerank(query, query, candidates, 1);
    expect(reranked[0].filename).toBe('music-licensing-and-sync-guide.md');
  });

  it('prioritizes streaming royalties for Turkish royalty questions', async () => {
    const originalQuery = 'spotify telif oranları nasıl hesaplanıyor?';
    const effectiveQuery = 'How are Spotify streaming royalties calculated?';
    const candidates = [
      {
        chunkId: 'c1',
        documentId: 'd1',
        documentTitle: 'Copyright Guide',
        filename: 'music-copyright-and-samplers-guide.md',
        content: 'Circle C and Circle P copyright definitions.',
        similarity: 0.75,
      },
      {
        chunkId: 'c2',
        documentId: 'd2',
        documentTitle: 'Streaming Royalties and Payouts',
        filename: 'streaming-royalties-and-payouts.md',
        content: 'Spotify operates on a pro-rata market share royalty model.',
        similarity: 0.72,
      },
    ];

    const reranked = await rerankerService.rerank(originalQuery, effectiveQuery, candidates, 1);
    expect(reranked[0].filename).toBe('streaming-royalties-and-payouts.md');
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




