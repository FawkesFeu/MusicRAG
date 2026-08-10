import { db } from '../db/client.js';
import { documents, documentChunks } from '../db/schema.js';
import { eq, desc, count, sql } from 'drizzle-orm';
import type { DocumentStatus, FileType } from '@rag/shared';

export interface CreateDocumentData {
  title: string;
  filename: string;
  fileType: FileType;
  fileSize: number;
  checksum: string;
  uploadedBy?: string | null;
  status?: DocumentStatus;
}

export const documentRepository = {
  async create(data: CreateDocumentData) {
    const result = await db.insert(documents).values({
      title: data.title,
      filename: data.filename,
      fileType: data.fileType,
      fileSize: data.fileSize,
      checksum: data.checksum,
      uploadedBy: data.uploadedBy || null,
      status: data.status || 'uploaded',
    }).returning();
    return result[0];
  },

  async findById(id: string) {
    const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
    return result[0] || null;
  },

  async findByChecksum(checksum: string) {
    const result = await db.select().from(documents).where(eq(documents.checksum, checksum)).limit(1);
    return result[0] || null;
  },

  async updateStatus(id: string, status: DocumentStatus, errorMessage?: string | null) {
    const result = await db.update(documents).set({
      status,
      errorMessage: errorMessage || null,
      updatedAt: new Date(),
    }).where(eq(documents.id, id)).returning();
    return result[0] || null;
  },

  async listAll() {
    // Select documents along with chunk count
    const rows = await db.select({
      id: documents.id,
      title: documents.title,
      filename: documents.filename,
      fileType: documents.fileType,
      fileSize: documents.fileSize,
      checksum: documents.checksum,
      uploadedBy: documents.uploadedBy,
      uploadedAt: documents.uploadedAt,
      status: documents.status,
      errorMessage: documents.errorMessage,
      retryCount: documents.retryCount,
      createdAt: documents.createdAt,
      updatedAt: documents.updatedAt,
      chunkCount: count(documentChunks.id),
    })
    .from(documents)
    .leftJoin(documentChunks, eq(documents.id, documentChunks.documentId))
    .groupBy(documents.id)
    .orderBy(desc(documents.createdAt));

    return rows.map(r => ({
      ...r,
      fileType: r.fileType as FileType,
      status: r.status as DocumentStatus,
      uploadedAt: r.uploadedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
      updatedAt: r.updatedAt.toISOString(),
      chunkCount: Number(r.chunkCount),
    }));
  },

  async delete(id: string) {
    await db.delete(documents).where(eq(documents.id, id));
  },
};
