import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export async function runMigrations() {
  console.log(`[DB] Running migrations on: ${env.DATABASE_URL}...`);
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const client = await pool.connect();

  try {
    // 1. Enable pgvector extension
    console.log('[DB] Ensuring pgvector extension is enabled...');
    await client.query('CREATE EXTENSION IF NOT EXISTS vector;');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');

    // 2. Create tables
    console.log('[DB] Creating tables if not exist...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL UNIQUE,
        hashed_password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        refresh_token TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS documents (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        checksum TEXT NOT NULL UNIQUE,
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        status TEXT NOT NULL DEFAULT 'uploaded',
        error_message TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS document_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        content TEXT NOT NULL,
        tokens INTEGER NOT NULL,
        start_position INTEGER,
        end_position INTEGER,
        metadata JSONB,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS embeddings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        chunk_id UUID NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE UNIQUE,
        embedding vector(768) NOT NULL,
        model_name TEXT NOT NULL DEFAULT 'text-embedding-004',
        model_version TEXT NOT NULL DEFAULT '1.0',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ingestion_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
        job_id TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'queued',
        chunked_count INTEGER,
        embedded_count INTEGER,
        total_chunks INTEGER,
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE,
        error_message TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        max_retries INTEGER NOT NULL DEFAULT 3,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS search_queries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        query TEXT NOT NULL,
        retrieved_chunk_count INTEGER NOT NULL,
        answer_generated BOOLEAN NOT NULL DEFAULT false,
        answer_tokens INTEGER,
        execution_time INTEGER,
        relevance_feedback TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Create Indexes
    console.log('[DB] Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS users_email_idx ON users(email);
      CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
      CREATE INDEX IF NOT EXISTS sessions_refresh_token_idx ON sessions(refresh_token);
      CREATE INDEX IF NOT EXISTS documents_checksum_idx ON documents(checksum);
      CREATE INDEX IF NOT EXISTS documents_status_idx ON documents(status);
      CREATE INDEX IF NOT EXISTS document_chunks_document_id_idx ON document_chunks(document_id);
      CREATE INDEX IF NOT EXISTS document_chunks_doc_chunk_idx ON document_chunks(document_id, chunk_index);
      CREATE INDEX IF NOT EXISTS ingestion_jobs_status_idx ON ingestion_jobs(status);
      CREATE INDEX IF NOT EXISTS search_queries_user_id_idx ON search_queries(user_id);
      CREATE INDEX IF NOT EXISTS search_queries_created_at_idx ON search_queries(created_at);
    `);

    // Create HNSW vector index for cosine similarity
    try {
      await client.query(`
        CREATE INDEX IF NOT EXISTS embeddings_embedding_hnsw_idx 
        ON embeddings USING hnsw (embedding vector_cosine_ops);
      `);
      console.log('[DB] HNSW vector index created successfully.');
    } catch (hnswErr) {
      console.warn('[DB] Note on HNSW index:', (hnswErr as Error).message);
    }

    console.log('[DB] Migrations completed successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

// Allow direct execution: `tsx src/db/migrate.ts`
if (process.argv[1]?.endsWith('migrate.ts')) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[DB] Migration failed:', err);
      process.exit(1);
    });
}
