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
