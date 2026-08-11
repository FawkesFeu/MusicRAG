import { db } from '../db/client.js';
import { documents, documentChunks } from '../db/schema.js';
import { eq, desc, count } from 'drizzle-orm';
import { localStore } from '../db/local-store.js';
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
    try {
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
    } catch {
      return localStore.createDocument(data);
    }
  },

  async findById(id: string) {
    try {
      const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
      return result[0] || null;
    } catch {
      return localStore.findDocumentById(id);
    }
  },

  async findByChecksum(checksum: string) {
    try {
      const result = await db.select().from(documents).where(eq(documents.checksum, checksum)).limit(1);
      return result[0] || null;
    } catch {
      return localStore.findDocumentByChecksum(checksum);
    }
  },

  async updateStatus(id: string, status: DocumentStatus, errorMessage?: string | null) {
    try {
      const result = await db.update(documents).set({
        status,
        errorMessage: errorMessage || null,
        updatedAt: new Date(),
      }).where(eq(documents.id, id)).returning();
      return result[0] || null;
    } catch {
      return localStore.updateDocumentStatus(id, status, errorMessage);
    }
  },

  async listAll() {
    try {
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
    } catch {
      return localStore.listDocuments();
    }
  },

  async delete(id: string) {
    try {
      await db.delete(documents).where(eq(documents.id, id));
    } catch {
      localStore.deleteDocument(id);
    }
  },

  async findByFilename(filename: string) {
    try {
      const baseFn = filename.includes('/') || filename.includes('\\') ? filename.split(/[/\\]/).pop()! : filename;
      const result = await db.select().from(documents).where(eq(documents.filename, baseFn)).limit(1);
      return result[0] || null;
    } catch {
      return localStore.findDocumentByFilename(filename);
    }
  },

  async deleteByFilename(filename: string): Promise<boolean> {
    try {
      const baseFn = filename.includes('/') || filename.includes('\\') ? filename.split(/[/\\]/).pop()! : filename;
      const doc = await db.select().from(documents).where(eq(documents.filename, baseFn)).limit(1);
      if (doc[0]) {
        await db.delete(documents).where(eq(documents.id, doc[0].id));
        return true;
      }
      return false;
    } catch {
      return localStore.deleteDocumentByFilename(filename);
    }
  },
};
