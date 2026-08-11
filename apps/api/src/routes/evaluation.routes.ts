import { Router, type Request, type Response, type NextFunction } from 'express';
import fs from 'fs';
import { evaluationService } from '../services/evaluation.service.js';
import { authMiddleware, requireRole } from '../middleware/auth.middleware.js';

export const evaluationRouter: Router = Router();

// 1. Get latest cached evaluation report (Authenticated Admin)
evaluationRouter.get('/latest', authMiddleware, requireRole('admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await evaluationService.getLatestReport();
    if (!report) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No evaluation report found yet. Click "Run Benchmark" to evaluate.',
      });
    }
    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
});

// 2. Trigger live evaluation run (Authenticated Admin)
evaluationRouter.post('/run', authMiddleware, requireRole('admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const report = await evaluationService.runBenchmark();
    return res.status(200).json({
      success: true,
      data: report,
    });
  } catch (err) {
    next(err);
  }
});

// 3. Download JSON evaluation report
evaluationRouter.get('/download', authMiddleware, requireRole('admin'), async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const reportPath = evaluationService.getReportFilePath();
    if (!fs.existsSync(reportPath)) {
      return res.status(404).json({
        success: false,
        error: 'Evaluation report not generated yet.',
      });
    }

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename="evaluation_report.json"');
    const fileStream = fs.createReadStream(reportPath);
    fileStream.pipe(res);
  } catch (err) {
    next(err);
  }
});
