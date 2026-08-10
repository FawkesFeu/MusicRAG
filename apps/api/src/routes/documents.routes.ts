import { Router, Response } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import { authMiddleware, AuthenticatedRequest, requireRole } from '../middleware/auth.middleware.js';
import { documentRepository } from '../repositories/document.repository.js';
import { ingestionService } from '../services/ingestion.service.js';
import { queueService } from '../jobs/ingestion.job.js';
import type { FileType } from '@rag/shared';

const router: Router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB max
});

router.use(authMiddleware);

// GET /api/documents (List all documents - user & admin)
router.get('/', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const docs = await documentRepository.listAll();
    res.json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
});

// GET /api/documents/:id
router.get('/:id', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const doc = await documentRepository.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }
    res.json({ success: true, data: doc });
  } catch (err) {
    next(err);
  }
});

// POST /api/documents/upload (Admin only)
router.post(
  '/upload',
  requireRole('admin'),
  upload.single('file'),
  async (req: AuthenticatedRequest, res: Response, next) => {
    try {
      const file = req.file;
      let textContent = req.body.content as string | undefined;
      let filename = req.body.filename as string | undefined;
      let title = req.body.title as string | undefined;
      let fileType: FileType = (req.body.fileType as FileType) || 'markdown';
      let buffer: Buffer;

      if (file) {
        filename = file.originalname;
        title = title || filename.replace(/\.[^/.]+$/, '');
        buffer = file.buffer;

        if (filename.endsWith('.pdf')) fileType = 'pdf';
        else if (filename.endsWith('.txt')) fileType = 'txt';
        else fileType = 'markdown';

        textContent = await ingestionService.extractText(buffer, fileType);
      } else if (textContent) {
        filename = filename || 'document.md';
        title = title || 'Untitled Document';
        buffer = Buffer.from(textContent, 'utf-8');
      } else {
        return res.status(400).json({ success: false, error: 'No file or text content provided' });
      }

      // Calculate SHA-256 checksum for duplicate prevention
      const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

      // Check if duplicate exists
      const existing = await documentRepository.findByChecksum(checksum);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: `Document with identical content already exists ("${existing.title}")`,
          data: existing,
        });
      }

      // Create document record in database
      const doc = await documentRepository.create({
        title,
        filename,
        fileType,
        fileSize: buffer.length,
        checksum,
        uploadedBy: req.user?.userId || null,
        status: 'uploaded',
      });

      // Queue document for async ingestion & chunking
      const jobId = await queueService.addJob({
        documentId: doc.id,
        textContent,
      });

      res.status(201).json({
        success: true,
        message: 'Document uploaded and queued for ingestion',
        data: {
          document: doc,
          jobId,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// DELETE /api/documents/:id (Admin only)
router.delete('/:id', requireRole('admin'), async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const doc = await documentRepository.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    await documentRepository.delete(req.params.id);
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
});

export default router;
