import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { db } from './client.js';
import { localStore } from './local-store.js';
import { authService } from '../services/auth.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { documentRepository } from '../repositories/document.repository.js';
import { chunkRepository } from '../repositories/chunk.repository.js';
import { ingestionService } from '../services/ingestion.service.js';
import { DEMO_CREDENTIALS } from '@rag/shared';

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

function getAllFilesRecursively(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getAllFilesRecursively(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.txt') || entry.name.endsWith('.pdf'))) {
      files.push(fullPath);
    }
  }
  return files;
}

export async function seedDatabase() {
  console.log('====================================================');
  console.log('🌱 Starting Database Seeding (Recursive Dataset Scan)...');
  console.log('====================================================\n');

  try {
    // 1. Seed Demo Users
    console.log('[1/2] Seeding Demo Users...');
    
    let adminUser = await userRepository.findByEmail(DEMO_CREDENTIALS.ADMIN.email);
    if (!adminUser) {
      const passwordHash = await authService.hashPassword(DEMO_CREDENTIALS.ADMIN.password);
      adminUser = await userRepository.create({
        email: DEMO_CREDENTIALS.ADMIN.email,
        name: DEMO_CREDENTIALS.ADMIN.name,
        hashedPassword: passwordHash,
        role: 'admin',
      });
      console.log(`  ✅ Created Admin User: ${DEMO_CREDENTIALS.ADMIN.email}`);
    } else {
      console.log(`  ℹ️ Admin User already exists: ${DEMO_CREDENTIALS.ADMIN.email}`);
    }

    let standardUser = await userRepository.findByEmail(DEMO_CREDENTIALS.USER.email);
    if (!standardUser) {
      const passwordHash = await authService.hashPassword(DEMO_CREDENTIALS.USER.password);
      standardUser = await userRepository.create({
        email: DEMO_CREDENTIALS.USER.email,
        name: DEMO_CREDENTIALS.USER.name,
        hashedPassword: passwordHash,
        role: 'user',
      });
      console.log(`  ✅ Created Standard User: ${DEMO_CREDENTIALS.USER.email}`);
    } else {
      console.log(`  ℹ️ Standard User already exists: ${DEMO_CREDENTIALS.USER.email}`);
    }

    // 2. Ingest Sample Dataset Corpus Recursively
    console.log('\n[2/2] Ingesting Corpus Documents from sample_dataset/corpus (Recursive Scan)...');
    if (!fs.existsSync(CORPUS_DIR)) {
      console.warn(`  ⚠️ Corpus directory not found at: ${CORPUS_DIR}`);
      return;
    }

    const allFilePaths = getAllFilesRecursively(CORPUS_DIR);
    console.log(`  Found ${allFilePaths.length} corpus documents across all subdirectories to index.`);

    let indexedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < allFilePaths.length; i++) {
      const filePath = allFilePaths[i];
      const relativeName = path.relative(CORPUS_DIR, filePath).replace(/\\/g, '/');
      const textContent = fs.readFileSync(filePath, 'utf-8');
      const checksum = crypto.createHash('sha256').update(textContent).digest('hex');
      const title = path.basename(filePath).replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').toUpperCase();

      let doc = await documentRepository.findByChecksum(checksum);
      if (doc && doc.status === 'indexed') {
        const existingChunks = await chunkRepository.findByDocumentId(doc.id);
        if (existingChunks.length > 0) {
          skippedCount++;
          continue;
        }
      }

      if (!doc) {
        doc = await documentRepository.create({
          title: `${title} (${relativeName})`,
          filename: relativeName,
          fileType: filePath.endsWith('.pdf') ? 'pdf' : 'markdown',
          fileSize: Buffer.byteLength(textContent),
          checksum,
          uploadedBy: adminUser?.id || null,
          status: 'uploaded',
        });
      }

      console.log(`  [${i + 1}/${allFilePaths.length}] Embedding & indexing: ${relativeName}...`);
      await ingestionService.processDocument(doc.id, textContent);
      indexedCount++;

      // Small throttle to stay safely within free tier rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n====================================================');
    console.log(`🎉 Database Seeding Complete! ${indexedCount} newly indexed, ${skippedCount} already indexed (Total: ${allFilePaths.length}).`);
    console.log('====================================================\n');
  } catch (error) {
    console.error('[DB] Seeding note/error:', (error as Error).message);
    if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
      process.exit(1);
    }
  }
}

// Execute directly if run via CLI
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  seedDatabase().then(() => {
    process.exit(0);
  });
}
