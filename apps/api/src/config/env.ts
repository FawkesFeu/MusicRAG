import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_PORT: parseInt(process.env.API_PORT || '3001', 10),
  API_URL: process.env.API_URL || 'http://localhost:3001',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',
  
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://dev:dev_password@localhost:5432/rag_search_dev',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-jwt-key-minimum-32-chars-rag-playable-factory',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-jwt-key-minimum-32-chars-rag-playable-factory',
  
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
  EMBEDDING_MODEL: process.env.EMBEDDING_MODEL || 'text-embedding-004',
  
  MCP_API_TOKEN: process.env.MCP_API_TOKEN || 'mcp-secret-token-rag-2026',
  MCP_PORT: parseInt(process.env.MCP_PORT || '3002', 10),
  
  CHUNK_SIZE: parseInt(process.env.CHUNK_SIZE || '512', 10),
  CHUNK_OVERLAP: parseInt(process.env.CHUNK_OVERLAP || '50', 10),
  MAX_INGESTION_RETRIES: parseInt(process.env.MAX_INGESTION_RETRIES || '3', 10),
};
