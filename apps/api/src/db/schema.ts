import { pgTable, text, uuid, timestamp, integer, boolean, jsonb, index, customType } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

// Custom pgvector type for vector(768) (Google text-embedding-004)
export const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(768)';
  },
  toDriver(value: number[]): string {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string): number[] {
    if (typeof value === 'string') {
      return value.replace(/[\[\]]/g, '').split(',').map(Number);
    }
    return value;
  },
});

// ============= USERS TABLE =============
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  hashedPassword: text('hashed_password').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('user'), // 'user' | 'admin'
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  emailIdx: index('users_email_idx').on(table.email),
}));

// ============= SESSIONS TABLE (JWT Refresh Tokens) =============
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  refreshToken: text('refresh_token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('sessions_user_id_idx').on(table.userId),
  refreshTokenIdx: index('sessions_refresh_token_idx').on(table.refreshToken),
}));

// ============= DOCUMENTS TABLE =============
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  filename: text('filename').notNull(),
  fileType: text('file_type').notNull(), // 'pdf' | 'txt' | 'markdown'
  fileSize: integer('file_size').notNull(),
  checksum: text('checksum').notNull().unique(),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull().defaultNow(),
  status: text('status').notNull().default('uploaded'), // 'uploaded' | 'processing' | 'indexed' | 'failed'
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  checksumIdx: index('documents_checksum_idx').on(table.checksum),
  statusIdx: index('documents_status_idx').on(table.status),
}));

// ============= DOCUMENT CHUNKS TABLE =============
export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  chunkIndex: integer('chunk_index').notNull(),
  content: text('content').notNull(),
  tokens: integer('tokens').notNull(),
  startPosition: integer('start_position'),
  endPosition: integer('end_position'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  docIdIdx: index('document_chunks_document_id_idx').on(table.documentId),
  docChunkIdx: index('document_chunks_doc_chunk_idx').on(table.documentId, table.chunkIndex),
}));

// ============= EMBEDDINGS TABLE =============
export const embeddings = pgTable('embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  chunkId: uuid('chunk_id').notNull().references(() => documentChunks.id, { onDelete: 'cascade' }).unique(),
  embedding: vector('embedding').notNull(),
  modelName: text('model_name').notNull().default('text-embedding-004'),
  modelVersion: text('model_version').notNull().default('1.0'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  chunkIdIdx: index('embeddings_chunk_id_idx').on(table.chunkId),
}));

// ============= INGESTION JOBS TABLE =============
export const ingestionJobs = pgTable('ingestion_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
  jobId: text('job_id').notNull().unique(),
  status: text('status').notNull().default('queued'), // 'queued' | 'processing' | 'completed' | 'failed'
  chunkedCount: integer('chunked_count'),
  embeddedCount: integer('embedded_count'),
  totalChunks: integer('total_chunks'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').notNull().default(0),
  maxRetries: integer('max_retries').notNull().default(3),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  jobIdIdx: index('ingestion_jobs_job_id_idx').on(table.jobId),
  docJobIdx: index('ingestion_jobs_document_id_idx').on(table.documentId),
  statusIdx: index('ingestion_jobs_status_idx').on(table.status),
}));

// ============= SEARCH QUERIES TABLE (Analytics) =============
export const searchQueries = pgTable('search_queries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  query: text('query').notNull(),
  retrievedChunkCount: integer('retrieved_chunk_count').notNull(),
  answerGenerated: boolean('answer_generated').notNull().default(false),
  answerTokens: integer('answer_tokens'),
  executionTime: integer('execution_time'),
  relevanceFeedback: text('relevance_feedback'), // 'helpful' | 'not_helpful' | null
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('search_queries_user_id_idx').on(table.userId),
  createdAtIdx: index('search_queries_created_at_idx').on(table.createdAt),
}));

// ============= RELATIONS =============
export const usersRelations = relations(users, ({ many }) => ({
  documents: many(documents),
  sessions: many(sessions),
  searchQueries: many(searchQueries),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const documentsRelations = relations(documents, ({ one, many }) => ({
  uploader: one(users, { fields: [documents.uploadedBy], references: [users.id] }),
  chunks: many(documentChunks),
  ingestionJobs: many(ingestionJobs),
}));

export const documentChunksRelations = relations(documentChunks, ({ one }) => ({
  document: one(documents, { fields: [documentChunks.documentId], references: [documents.id] }),
  embedding: one(embeddings, { fields: [documentChunks.id], references: [embeddings.chunkId] }),
}));

export const embeddingsRelations = relations(embeddings, ({ one }) => ({
  chunk: one(documentChunks, { fields: [embeddings.chunkId], references: [documentChunks.id] }),
}));

export const ingestionJobsRelations = relations(ingestionJobs, ({ one }) => ({
  document: one(documents, { fields: [ingestionJobs.documentId], references: [documents.id] }),
}));

export const searchQueriesRelations = relations(searchQueries, ({ one }) => ({
  user: one(users, { fields: [searchQueries.userId], references: [users.id] }),
}));

// ============= INVITATIONS TABLE =============
export const invitations = pgTable('invitations', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  role: text('role').notNull().default('user'), // 'user' | 'admin'
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  used: boolean('used').notNull().default(false),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  tokenIdx: index('invitations_token_idx').on(table.token),
  emailIdx: index('invitations_email_idx').on(table.email),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  creator: one(users, { fields: [invitations.createdBy], references: [users.id] }),
}));

