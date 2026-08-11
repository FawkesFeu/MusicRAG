import { Router, type Request, type Response, type NextFunction } from 'express';
import fs from 'fs';
import { evaluationService, type BenchmarkProgressEvent } from '../services/evaluation.service.js';
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

// 2. Real-time Server-Sent Events (SSE) Live Benchmark Runner
evaluationRouter.get('/stream', authMiddleware, requireRole('admin'), async (req: Request, res: Response) => {
  // Set SSE Headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  let isClosed = false;
  req.on('close', () => {
    isClosed = true;
  });

  const sendEvent = (event: BenchmarkProgressEvent) => {
    if (!isClosed) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }
  };

  try {
    await evaluationService.runBenchmarkStream(sendEvent);
    if (!isClosed) {
      res.end();
    }
  } catch (err: any) {
    if (!isClosed) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }
});

// 3. Trigger live evaluation run (Standard JSON fallback)
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

// 4. Download JSON evaluation report
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
