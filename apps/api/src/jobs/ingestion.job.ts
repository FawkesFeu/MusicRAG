import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { ingestionService } from '../services/ingestion.service.js';
import { ingestionJobRepository } from '../repositories/ingestion-job.repository.js';
import { v4 as uuidv4 } from 'uuid';

export interface IngestionJobPayload {
  documentId: string;
  textContent: string;
}

let redisClient: Redis | null = null;
let bullQueue: Queue | null = null;
let bullWorker: Worker | null = null;

try {
  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
    connectTimeout: 2000,
  });

  redisClient.connect().then(() => {
    console.log('[Queue] Connected to Redis successfully.');
    bullQueue = new Queue('document-ingestion', { connection: redisClient as any });
    
    bullWorker = new Worker(
      'document-ingestion',
      async (job) => {
        const { documentId, textContent } = job.data as IngestionJobPayload;
        await ingestionService.processDocument(documentId, textContent, job.id);
      },
      { connection: redisClient as any, concurrency: 2 }
    );
  }).catch((err) => {
    console.warn('[Queue] Redis not available, using in-memory background queue runner:', err.message);
  });
} catch (e) {
  console.warn('[Queue] BullMQ init exception, fallback active.');
}

export const queueService = {
  async addJob(payload: IngestionJobPayload): Promise<string> {
    const jobId = uuidv4();
    await ingestionJobRepository.create({
      documentId: payload.documentId,
      jobId,
      status: 'queued',
    });

    if (bullQueue) {
      try {
        await bullQueue.add('process-doc', payload, {
          jobId,
          attempts: env.MAX_INGESTION_RETRIES,
          backoff: { type: 'exponential', delay: 2000 },
        });
        return jobId;
      } catch (err) {
        console.warn('[Queue] Failed to push to BullMQ, executing in background runner:', (err as Error).message);
      }
    }

    // Fallback: Run asynchronously in background
    setImmediate(async () => {
      try {
        await ingestionService.processDocument(payload.documentId, payload.textContent, jobId);
      } catch (err) {
        console.error('[Queue] In-memory job execution error:', err);
      }
    });

    return jobId;
  },
};
