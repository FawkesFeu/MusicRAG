import { z } from 'zod';

export const documentUploadSchema = z.object({
  title: z.string().trim().min(1, 'Document title is required').max(255),
  fileType: z.enum(['pdf', 'txt', 'markdown']),
  category: z.string().optional(),
});

export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;

export const ingestionTriggerSchema = z.object({
  documentId: z.string().uuid('Invalid document ID'),
  forceReindex: z.boolean().optional().default(false),
});

export type IngestionTriggerInput = z.infer<typeof ingestionTriggerSchema>;
