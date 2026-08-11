import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { documentRepository } from '../repositories/document.repository.js';
import { ingestionService } from '../services/ingestion.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getCorpusDir(): string {
  const candidates = [
    path.resolve(process.cwd(), 'sample_dataset/corpus'),
    path.resolve(process.cwd(), '../../sample_dataset/corpus'),
    path.resolve(__dirname, '../../../../sample_dataset/corpus'),
    path.resolve(__dirname, '../../../sample_dataset/corpus'),
  ];
  return candidates.find((c) => fs.existsSync(c)) || candidates[0];
}

const CORPUS_DIR = getCorpusDir();

export const watcherService = {
  watcher: null as fs.FSWatcher | null,

  startWatching(corpusPath: string = CORPUS_DIR) {
    if (!fs.existsSync(corpusPath)) {
      console.warn('[Watcher] Corpus path does not exist, skipping file watcher:', corpusPath);
      return;
    }

    console.log(`[Watcher] 🔍 Watching for document changes in: ${corpusPath}`);

    this.watcher = fs.watch(corpusPath, { recursive: true }, async (eventType, filename) => {
      if (!filename || (!filename.endsWith('.md') && !filename.endsWith('.txt') && !filename.endsWith('.pdf'))) {
        return;
      }

      const fullPath = path.resolve(corpusPath, filename);
      console.log(`[Watcher] Detected ${eventType} event for: ${filename}`);

      if (!fs.existsSync(fullPath)) {
        console.log(`[Watcher] 🗑️ File removed from corpus: ${filename}. Purging from database & vector index...`);
        try {
          const deleted = await documentRepository.deleteByFilename(filename);
          if (deleted) {
            console.log(`[Watcher] ✅ Document "${filename}" and its vector embeddings successfully purged from database.`);
          } else {
            console.log(`[Watcher] ℹ️ Document "${filename}" was not found in database or already deleted.`);
          }
        } catch (err) {
          console.error(`[Watcher] Error purging deleted file "${filename}":`, (err as Error).message);
        }
        return;
      }

      try {
        const content = await fs.promises.readFile(fullPath, 'utf-8');
        const checksum = crypto.createHash('sha256').update(content).digest('hex');
        const title = path.basename(filename).replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').toUpperCase();

        let doc = await documentRepository.findByChecksum(checksum);
        if (!doc) {
          doc = await documentRepository.create({
            title,
            filename: path.basename(filename),
            fileType: filename.endsWith('.pdf') ? 'pdf' : 'markdown',
            fileSize: Buffer.byteLength(content),
            checksum,
            status: 'uploaded',
          });
        }

        console.log(`[Watcher] Incrementally re-indexing changed document: ${filename}...`);
        await ingestionService.processDocument(doc.id, content);
        console.log(`[Watcher] ✅ Document ${filename} successfully updated in vector index.`);
      } catch (err) {
        console.error(`[Watcher] Error re-indexing ${filename}:`, (err as Error).message);
      }
    });
  },

  stopWatching() {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      console.log('[Watcher] Stopped watching corpus directory.');
    }
  },
};
