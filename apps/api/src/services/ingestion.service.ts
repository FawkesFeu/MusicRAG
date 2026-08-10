import pdfParse from 'pdf-parse';
import { chunkDocument } from './chunking.service.js';
import { embeddingService } from './embedding.service.js';
import { documentRepository } from '../repositories/document.repository.js';
import { chunkRepository } from '../repositories/chunk.repository.js';
import { ingestionJobRepository } from '../repositories/ingestion-job.repository.js';

export const ingestionService = {
  async extractText(buffer: Buffer, fileType: 'pdf' | 'txt' | 'markdown'): Promise<string> {
    if (fileType === 'pdf') {
      const data = await pdfParse(buffer);
      return data.text;
    }
    return buffer.toString('utf-8');
  },

  async processDocument(documentId: string, textContent: string, jobId?: string): Promise<{ success: boolean; chunkCount: number }> {
    console.log(`[Ingestion] Starting ingestion for document ${documentId}...`);
    
    if (jobId) {
      await ingestionJobRepository.updateProgress(jobId, {
        status: 'processing',
      });
    }
    await documentRepository.updateStatus(documentId, 'processing');

    try {
      // 1. Chunk document
      const rawChunks = chunkDocument(textContent);
      console.log(`[Ingestion] Document ${documentId} split into ${rawChunks.length} chunks.`);

      if (jobId) {
        await ingestionJobRepository.updateProgress(jobId, {
          chunkedCount: rawChunks.length,
          totalChunks: rawChunks.length,
        });
      }

      // 2. Clear any old chunks for this document (idempotency / re-indexing)
      await chunkRepository.deleteByDocumentId(documentId);

      // 3. Save chunks to DB
      const insertedChunks = await chunkRepository.createChunks(
        rawChunks.map((chunk, idx) => ({
          documentId,
          chunkIndex: idx,
          content: chunk.content,
          tokens: chunk.tokens,
          startPosition: chunk.startPosition,
          endPosition: chunk.endPosition,
          metadata: chunk.metadata,
        }))
      );

      // 4. Generate Embeddings in batch
      const chunkTexts = insertedChunks.map(c => c.content);
      const embeddings = await embeddingService.embedMany(chunkTexts);
      console.log(`[Ingestion] Generated ${embeddings.length} embeddings.`);

      // 5. Store embeddings
      await chunkRepository.insertEmbeddings(
        insertedChunks.map((chunk, idx) => ({
          chunkId: chunk.id,
          embedding: embeddings[idx],
        }))
      );

      // 6. Complete status
      await documentRepository.updateStatus(documentId, 'indexed');
      if (jobId) {
        await ingestionJobRepository.updateProgress(jobId, {
          status: 'completed',
          embeddedCount: embeddings.length,
          completedAt: new Date(),
        });
      }

      console.log(`[Ingestion] Successfully indexed document ${documentId}`);
      return { success: true, chunkCount: insertedChunks.length };
    } catch (error) {
      console.error(`[Ingestion] Failed for document ${documentId}:`, error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown ingestion error';

      await documentRepository.updateStatus(documentId, 'failed', errorMsg);
      if (jobId) {
        await ingestionJobRepository.updateProgress(jobId, {
          status: 'failed',
          errorMessage: errorMsg,
        });
      }

      throw error;
    }
  },
};
