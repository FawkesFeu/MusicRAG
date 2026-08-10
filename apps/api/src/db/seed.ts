import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { userRepository } from '../repositories/user.repository.js';
import { documentRepository } from '../repositories/document.repository.js';
import { ingestionService } from '../services/ingestion.service.js';
import { DEMO_CREDENTIALS } from '@rag/shared';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CORPUS_DIR = path.resolve(__dirname, '../../../../sample_dataset/corpus');

export async function seedDatabase() {
  console.log('====================================================');
  console.log('🌱 Starting Database Seeding...');
  console.log('====================================================');

  try {
    // 1. Seed Demo Users
    console.log('\n[1/2] Seeding Demo Users...');

    const adminHash = await bcrypt.hash(DEMO_CREDENTIALS.ADMIN.password, 10);
    let adminUser = await userRepository.findByEmail(DEMO_CREDENTIALS.ADMIN.email);
    if (!adminUser) {
      adminUser = await userRepository.create({
        email: DEMO_CREDENTIALS.ADMIN.email,
        name: DEMO_CREDENTIALS.ADMIN.name,
        hashedPassword: adminHash,
        role: 'admin',
      });
      console.log(`  ✅ Created Admin User: ${DEMO_CREDENTIALS.ADMIN.email}`);
    } else {
      console.log(`  ℹ️ Admin User already exists: ${DEMO_CREDENTIALS.ADMIN.email}`);
    }

    const userHash = await bcrypt.hash(DEMO_CREDENTIALS.USER.password, 10);
    let standardUser = await userRepository.findByEmail(DEMO_CREDENTIALS.USER.email);
    if (!standardUser) {
      standardUser = await userRepository.create({
        email: DEMO_CREDENTIALS.USER.email,
        name: DEMO_CREDENTIALS.USER.name,
        hashedPassword: userHash,
        role: 'user',
      });
      console.log(`  ✅ Created Standard User: ${DEMO_CREDENTIALS.USER.email}`);
    } else {
      console.log(`  ℹ️ Standard User already exists: ${DEMO_CREDENTIALS.USER.email}`);
    }

    // 2. Ingest Sample Dataset Corpus
    console.log('\n[2/2] Ingesting Corpus Documents from sample_dataset/corpus...');
    if (!fs.existsSync(CORPUS_DIR)) {
      console.warn(`  ⚠️ Corpus directory not found at: ${CORPUS_DIR}`);
      return;
    }

    const files = fs.readdirSync(CORPUS_DIR).filter(f => f.endsWith('.md') || f.endsWith('.txt'));
    console.log(`  Found ${files.length} markdown documents to index.`);

    let indexedCount = 0;
    for (const file of files) {
      const filePath = path.join(CORPUS_DIR, file);
      const textContent = fs.readFileSync(filePath, 'utf-8');
      const checksum = crypto.createHash('sha256').update(textContent).digest('hex');
      const title = file.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ').toUpperCase();

      let doc = await documentRepository.findByChecksum(checksum);
      if (!doc) {
        doc = await documentRepository.create({
          title,
          filename: file,
          fileType: 'markdown',
          fileSize: Buffer.byteLength(textContent),
          checksum,
          uploadedBy: adminUser?.id || null,
          status: 'uploaded',
        });
      }

      console.log(`  -> Processing & embedding: ${file} (ID: ${doc.id.slice(0, 8)}...)...`);
      await ingestionService.processDocument(doc.id, textContent);
      indexedCount++;
    }

    console.log(`\n====================================================`);
    console.log(`🎉 Database Seeding Complete! ${indexedCount} documents indexed.`);
    console.log(`====================================================\n`);
  } catch (err) {
    console.error('[DB] Seeding error:', err);
    throw err;
  }
}

// Allow direct execution
if (process.argv[1]?.endsWith('seed.ts')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
