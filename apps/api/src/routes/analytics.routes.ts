import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest, requireRole } from '../middleware/auth.middleware.js';
import { analyticsRepository } from '../repositories/analytics.repository.js';

const router: Router = Router();

router.use(authMiddleware);

// GET /api/analytics/stats (Admin only)
router.get('/stats', requireRole('admin'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const stats = await analyticsRepository.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/queries (Admin only)
router.get('/queries', requireRole('admin'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const queries = await analyticsRepository.getRecentQueries(50);
    res.json({ success: true, data: queries });
  } catch (err) {
    next(err);
  }
});

export default router;
