import { Router, Response } from 'express';
import { authMiddleware, AuthenticatedRequest, requireRole } from '../middleware/auth.middleware.js';
import { ingestionJobRepository } from '../repositories/ingestion-job.repository.js';
import { documentRepository } from '../repositories/document.repository.js';
import { queueService } from '../jobs/ingestion.job.js';

const router: Router = Router();

router.use(authMiddleware);

// GET /api/ingestion/:documentId/status
router.get('/:documentId/status', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const job = await ingestionJobRepository.findByDocumentId(req.params.documentId);
    if (!job) {
      return res.status(404).json({ success: false, error: 'Ingestion job not found for document' });
    }
    res.json({ success: true, data: job });
  } catch (err) {
    next(err);
  }
});

// GET /api/ingestion/jobs (Admin only)
router.get('/jobs/recent', requireRole('admin'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const jobs = await ingestionJobRepository.listRecent(50);
    res.json({ success: true, data: jobs });
  } catch (err) {
    next(err);
  }
});

// POST /api/ingestion/:documentId/trigger (Admin only)
router.post('/:documentId/trigger', requireRole('admin'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const doc = await documentRepository.findById(req.params.documentId);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    const jobId = await queueService.addJob({
      documentId: doc.id,
      textContent: `Title: ${doc.title}\nFilename: ${doc.filename}`,
    });

    res.json({ success: true, message: 'Ingestion re-triggered', data: { jobId } });
  } catch (err) {
    next(err);
  }
});

export default router;
