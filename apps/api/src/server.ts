import express, { Express } from 'express';
import { env } from './config/env.js';
import { corsMiddleware, errorHandler } from './middleware/index.js';
import {
  securityHeadersMiddleware,
  generalApiLimiter,
  searchRateLimiter,
} from './middleware/security.middleware.js';
import authRoutes from './routes/auth.routes.js';
import searchRoutes from './routes/search.routes.js';
import documentsRoutes from './routes/documents.routes.js';
import ingestionRoutes from './routes/ingestion.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import { watcherService } from './services/watcher.service.js';

export const app: Express = express();

// Trust reverse proxies
app.set('trust proxy', 1);

// 1. Security Headers (Helmet CSP, HSTS, X-Frame-Options, NoSniff)
app.use(securityHeadersMiddleware);

// 2. Global Middlewares
app.use(corsMiddleware);
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// 3. Global API Rate Limiting
app.use('/api', generalApiLimiter);

// Root endpoint (Welcome & API Overview)
app.get('/', (req, res) => {
  if (req.accepts('html')) {
    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Playable Factory RAG API</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0B0F17; color: #E2E8F0; padding: 40px 20px; text-align: center; }
          .card { max-width: 600px; margin: 0 auto; background: #111827; border: 1px solid #243049; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          h1 { color: #38BDF8; font-size: 24px; margin-bottom: 8px; }
          p { color: #94A3B8; font-size: 14px; margin: 6px 0; }
          .badge { display: inline-block; background: rgba(16, 185, 129, 0.15); color: #34D399; border: 1px solid rgba(16, 185, 129, 0.3); padding: 4px 12px; border-radius: 9999px; font-weight: 600; font-size: 12px; margin-bottom: 16px; }
          .btn { display: inline-block; background: #0284C7; color: white; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 14px; margin-top: 16px; transition: background 0.2s; }
          .btn:hover { background: #0369A1; }
          .endpoints { text-align: left; background: #1A2234; padding: 16px; border-radius: 8px; margin-top: 20px; font-family: monospace; font-size: 12px; color: #CBD5E1; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="badge">● API Server is Running (Secured)</div>
          <h1>Playable Factory RAG API</h1>
          <p>Express.js + Google Gemini + pgvector Vector Search Engine</p>
          <p>Backend API port: <strong>3001</strong></p>
          <a href="http://localhost:3000" class="btn">Go to Frontend Web App (Port 3000) →</a>
          <div class="endpoints">
            <strong>Key Endpoints:</strong><br>
            • POST /api/search (Semantic Search & Grounded RAG)<br>
            • POST /api/auth/login | /register (Authentication)<br>
            • GET  /api/auth/admin/users (Admin User Management)<br>
            • GET  /api/documents (Corpus Documents)<br>
            • GET  /api/analytics/stats (Search Telemetry)<br>
            • GET  /health (System Health)
          </div>
        </div>
      </body>
      </html>
    `);
  } else {
    res.json({
      name: 'Playable Factory RAG API',
      status: 'healthy',
      version: '1.0.0',
      frontendUrl: 'http://localhost:3000',
      models: {
        llm: env.GEMINI_MODEL,
        embedding: env.EMBEDDING_MODEL,
      },
      endpoints: [
        '/api/auth',
        '/api/search',
        '/api/documents',
        '/api/ingestion',
        '/api/analytics',
        '/health',
      ],
    });
  }
});

// Health check endpoint
app.get('/health', (_req, res) => {
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
app.use('/api/search', searchRateLimiter, searchRoutes);
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
    console.log(`🛡️ Security: Helmet CSP + HSTS + Brute-Force Rate Limiting Active`);
    console.log(`🤖 LLM: Google ${env.GEMINI_MODEL}`);
    console.log(`🧠 Embedding: Google ${env.EMBEDDING_MODEL} (768-dim)`);
    console.log(`====================================================`);

    // Start self-updating corpus watcher (Bonus Feature)
    watcherService.startWatching();
  });
}
