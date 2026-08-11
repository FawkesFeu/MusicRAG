import cors from 'cors';
import { env } from '../config/env.js';

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, MCP client)
    if (!origin) return callback(null, true);

    const allowed = [
      env.FRONTEND_URL,
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ];

    if (
      allowed.includes(origin) ||
      origin.endsWith('.railway.app') ||
      origin.endsWith('.up.railway.app') ||
      origin.endsWith('.vercel.app') ||
      process.env.NODE_ENV === 'production'
    ) {
      return callback(null, true);
    }

    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
});
