import { db } from '../db/client.js';
import { ingestionJobs } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';
import type { IngestionJobStatus } from '@rag/shared';

export interface CreateJobData {
  documentId: string;
  jobId: string;
  status?: IngestionJobStatus;
}

export const ingestionJobRepository = {
  async create(data: CreateJobData) {
    const result = await db.insert(ingestionJobs).values({
      documentId: data.documentId,
      jobId: data.jobId,
      status: data.status || 'queued',
      startedAt: new Date(),
    }).returning();
    return result[0];
  },

  async findByJobId(jobId: string) {
    const result = await db.select().from(ingestionJobs).where(eq(ingestionJobs.jobId, jobId)).limit(1);
    return result[0] || null;
  },

  async findByDocumentId(documentId: string) {
    const result = await db.select().from(ingestionJobs).where(eq(ingestionJobs.documentId, documentId)).orderBy(desc(ingestionJobs.createdAt)).limit(1);
    return result[0] || null;
  },

  async updateProgress(jobId: string, data: {
    status?: IngestionJobStatus;
    chunkedCount?: number;
    embeddedCount?: number;
    totalChunks?: number;
    errorMessage?: string | null;
    completedAt?: Date | null;
  }) {
    const result = await db.update(ingestionJobs).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(ingestionJobs.jobId, jobId)).returning();
    return result[0] || null;
  },

  async listRecent(limit: number = 50) {
    return db.select().from(ingestionJobs).orderBy(desc(ingestionJobs.createdAt)).limit(limit);
  },
};
