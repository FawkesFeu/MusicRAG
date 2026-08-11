import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest, requireRole } from '../middleware/auth.middleware.js';
import { searchService } from '../services/search.service.js';
import { ragService } from '../services/rag.service.js';
import { analyticsRepository } from '../repositories/analytics.repository.js';
import { searchRequestSchema, searchFeedbackSchema } from '@rag/shared';

const router: Router = Router();

// Apply auth to all search endpoints
router.use(authMiddleware);

// POST /api/search
router.post('/', requireRole(['user', 'admin']), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const input = searchRequestSchema.parse(req.body);
    const userId = req.user?.userId;

    // 1. Retrieve relevant chunks
    const retrievedChunks = await searchService.search(input.query, {
      topK: input.topK,
      minSimilarity: input.minSimilarity,
      useHybrid: true,
    });

    // 2. Generate Grounded Answer if requested
    if (input.generateAnswer) {
      const ragResponse = await ragService.generateAnswer(input.query, retrievedChunks, userId);
      return res.json({ success: true, data: ragResponse });
    }

    res.json({
      success: true,
      data: {
        query: input.query,
        retrievedChunks,
        answer: '',
        citations: [],
        confidence: retrievedChunks.length > 0 ? 0.8 : 0,
        executionTimeMs: 0,
        model: 'none',
        isCorpusGrounded: false,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/search/stream (Server-Sent Events streaming)
router.post('/stream', requireRole(['user', 'admin']), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const input = searchRequestSchema.parse(req.body);
    const userId = req.user?.userId;

    // Setup SSE Headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    let isClientConnected = true;
    req.on('close', () => {
      isClientConnected = false;
    });

    const sendSSE = (event: string, data: any) => {
      if (isClientConnected && !res.writableEnded) {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      }
    };

    // 1. Retrieve relevant chunks
    const retrievedChunks = await searchService.search(input.query, {
      topK: input.topK,
      minSimilarity: input.minSimilarity,
      useHybrid: true,
    });

    // Send metadata event with retrieved chunks immediately
    sendSSE('metadata', {
      query: input.query,
      retrievedChunks,
    });

    // If answer generation is not requested
    if (!input.generateAnswer) {
      sendSSE('done', {
        query: input.query,
        answer: '',
        citations: [],
        retrievedChunks,
        confidence: retrievedChunks.length > 0 ? 0.8 : 0,
        executionTimeMs: 0,
        model: 'none',
        isCorpusGrounded: false,
      });
      res.end();
      return;
    }

    // 2. Stream generation with Gemini
    const finalResponse = await ragService.generateAnswerStream(
      input.query,
      retrievedChunks,
      (delta) => {
        sendSSE('delta', { delta });
      },
      userId
    );

    sendSSE('done', finalResponse);
    res.end();
  } catch (err: any) {
    if (!res.headersSent) {
      next(err);
    } else {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message || 'Stream generation failed' })}\n\n`);
      res.end();
    }
  }
});


// POST /api/search/feedback
router.post('/feedback', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const input = searchFeedbackSchema.parse(req.body);
    await analyticsRepository.updateFeedback(input.queryId, input.feedback);
    res.json({ success: true, message: 'Feedback recorded' });
  } catch (err) {
    next(err);
  }
});

export default router;
