import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { authService } from '../services/auth.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { documentRepository } from '../repositories/document.repository.js';
import { ingestionService } from '../services/ingestion.service.js';
import { DEMO_CREDENTIALS } from '@rag/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CORPUS_DIR = path.resolve(__dirname, '../../../../sample_dataset/corpus');

async function getAllFiles(dirPath: string): Promise<string[]> {
  const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const res = path.resolve(dirPath, entry.name);
      return entry.isDirectory() ? getAllFiles(res) : [res];
    })
  );
  return files.flat().filter(f => f.endsWith('.md') || f.endsWith('.txt'));
}

export async function seedDatabase() {
  console.log('====================================================');
  console.log('🌱 Starting Database Seeding...');
  console.log('====================================================');

  // 1. Seed Demo Users
  console.log('\n[1/2] Seeding Demo Users...');

  // Admin User
  let admin = await userRepository.findByEmail(DEMO_CREDENTIALS.ADMIN.email);
  if (!admin) {
    const hashedPassword = await authService.hashPassword(DEMO_CREDENTIALS.ADMIN.password);
    admin = await userRepository.create({
      name: DEMO_CREDENTIALS.ADMIN.name,
      email: DEMO_CREDENTIALS.ADMIN.email,
      hashedPassword,
      role: 'admin',
    });
    console.log(`✅ Created Admin: ${DEMO_CREDENTIALS.ADMIN.email} (Password: ${DEMO_CREDENTIALS.ADMIN.password})`);
  } else {
    console.log(`ℹ️ Admin already exists: ${DEMO_CREDENTIALS.ADMIN.email}`);
  }

  // Standard User
  let user = await userRepository.findByEmail(DEMO_CREDENTIALS.USER.email);
  if (!user) {
    const hashedPassword = await authService.hashPassword(DEMO_CREDENTIALS.USER.password);
    user = await userRepository.create({
      name: DEMO_CREDENTIALS.USER.name,
      email: DEMO_CREDENTIALS.USER.email,
      hashedPassword,
      role: 'user',
    });
    console.log(`✅ Created User: ${DEMO_CREDENTIALS.USER.email} (Password: ${DEMO_CREDENTIALS.USER.password})`);
  } else {
    console.log(`ℹ️ User already exists: ${DEMO_CREDENTIALS.USER.email}`);
  }

  // 2. Seed Sample Dataset Corpus
  console.log('\n[2/2] Ingesting Sample Dataset Corpus from: ' + CORPUS_DIR);
  if (!fs.existsSync(CORPUS_DIR)) {
    console.warn('⚠️ Sample corpus directory not found at:', CORPUS_DIR);
    return;
  }

  const filePaths = await getAllFiles(CORPUS_DIR);
  console.log(`Found ${filePaths.length} documents in sample corpus.`);

  let indexedCount = 0;
  for (const filePath of filePaths) {
    const filename = path.basename(filePath);
    const title = filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').toUpperCase();
    const content = await fs.promises.readFile(filePath, 'utf-8');
    const checksum = crypto.createHash('sha256').update(content).digest('hex');

    let doc = await documentRepository.findByChecksum(checksum);
    if (!doc) {
      doc = await documentRepository.create({
        title,
        filename,
        fileType: filePath.endsWith('.pdf') ? 'pdf' : 'markdown',
        fileSize: Buffer.byteLength(content),
        checksum,
        uploadedBy: admin.id,
        status: 'uploaded',
      });
    }

    try {
      const res = await ingestionService.processDocument(doc.id, content);
      indexedCount++;
      console.log(`  ✓ [${indexedCount}/${filePaths.length}] Indexed: ${filename} (${res.chunkCount} chunks)`);
    } catch (err) {
      console.error(`  ✗ Error indexing ${filename}:`, (err as Error).message);
    }
  }

  console.log('\n====================================================');
  console.log(`✨ Seeding Completed! Indexed ${indexedCount} documents.`);
  console.log('====================================================');
}

// Allow direct execution: `tsx src/db/seed.ts`
if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[DB] Seeding failed:', err);
      process.exit(1);
    });
}
