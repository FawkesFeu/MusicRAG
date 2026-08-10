import { Queue, Worker } from 'bullmq';
import { env } from '../config/env.js';
import { ingestionService } from '../services/ingestion.service.js';
import { ingestionJobRepository } from '../repositories/ingestion-job.repository.js';
import { v4 as uuidv4 } from 'uuid';

export interface IngestionJobPayload {
  documentId: string;
  textContent: string;
}

let bullQueue: Queue | null = null;
let bullWorker: Worker | null = null;

try {
  const redisUrl = new URL(env.REDIS_URL);
  const redisOptions = {
    host: redisUrl.hostname || 'localhost',
    port: parseInt(redisUrl.port || '6379', 10),
    maxRetriesPerRequest: null,
    connectTimeout: 2000,
    enableOfflineQueue: false,
    retryStrategy: () => null, // Don't block if Redis isn't ready
  };

  bullQueue = new Queue('document-ingestion', {
    connection: redisOptions,
  });

  bullWorker = new Worker(
    'document-ingestion',
    async (job) => {
      const { documentId, textContent } = job.data as IngestionJobPayload;
      await ingestionService.processDocument(documentId, textContent, job.id);
    },
    {
      connection: redisOptions,
      concurrency: 2,
    }
  );

  bullWorker.on('error', (err) => {
    // Suppress unhandled redis connection errors if redis is starting up
  });

  bullQueue.on('error', (err) => {
    // Suppress unhandled queue connection errors
  });

  console.log('[Queue] BullMQ Document Ingestion queue initialized.');
} catch (e) {
  console.log('[Queue] Integrated async in-memory worker active.');
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
      } catch {
        // Fallback to async in-memory execution if BullMQ fails
      }
    }

    // In-memory background runner
    setTimeout(async () => {
      try {
        await ingestionService.processDocument(payload.documentId, payload.textContent, jobId);
      } catch (err: any) {
        console.error(`[Queue] In-memory job ${jobId} failed:`, err.message);
      }
    }, 100);

    return jobId;
  },

  async getJobStatus(jobId: string) {
    if (bullQueue) {
      try {
        const job = await bullQueue.getJob(jobId);
        if (job) {
          const state = await job.getState();
          return {
            jobId,
            state,
            progress: job.progress,
            failedReason: job.failedReason,
          };
        }
      } catch {
        // Fallback to repository
      }
    }

    const dbJob = await ingestionJobRepository.findByJobId(jobId);
    return dbJob ? { jobId, state: dbJob.status, progress: 100 } : null;
  },
};
