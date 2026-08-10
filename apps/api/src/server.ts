import express, { Express } from 'express';
import { env } from './config/env.js';
import { corsMiddleware, errorHandler } from './middleware/index.js';
import authRoutes from './routes/auth.routes.js';
import searchRoutes from './routes/search.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import ingestionRoutes from './routes/ingestion.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

export const app: Express = express();

// Global Middlewares
app.use(corsMiddleware);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: env.NODE_ENV,
    models: {
      llm: env.GEMINI_MODEL,
      embedding: env.EMBEDDING_MODEL,
    },
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/ingestion', ingestionRoutes);
app.use('/api/analytics', analyticsRoutes);

// Global Error Handler
app.use(errorHandler);

// Start server if run directly
if (process.env.NODE_ENV !== 'test') {
  const PORT = env.API_PORT;
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`🚀 Playable Factory RAG API running on port ${PORT}`);
    console.log(`📡 URL: http://localhost:${PORT}`);
    console.log(`🤖 LLM: Google ${env.GEMINI_MODEL}`);
    console.log(`🧠 Embedding: Google ${env.EMBEDDING_MODEL} (768-dim)`);
    console.log(`====================================================`);
  });
}
