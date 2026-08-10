# RAG / Vector Search Application - Revize Edilmiş Mimari Plan

## Giriş: Orijinal Plan Analizi

**Orijinal planda iyi olan yönler:**
- ✅ Monorepo yapısı ve workspace ayırımı mantıklı
- ✅ İlişkisel DB + Vektör DB ikilisi doğru
- ✅ RBAC konsepti güzel
- ✅ MCP server ayrı app olarak tutulmak iyi fikir

**Revize edilmesi gereken kısımlar:**

| Problem | Sebep | Çözüm |
|---------|-------|-------|
| Backend ve Frontend'i Next.js ile birleştirmek | Middleware ve API routing konfüzyonu | Backend'i Express/Fastify ile ayır |
| SQLite basit ama production için yeterli değil | Development esnasında lock, scaling yok | PostgreSQL + Docker Compose ile dev env kur |
| Embedding model seçimi belirtilmemiş | Basit başlamak önemli | OpenAI'den başla, modeli şekillendirilebilir hale getir |
| Ingestion'ın tam teknik detayı yok | Observable olması gerekli | Job queue (Bull/BullMQ) + Event logging sistemi ekle |
| Chunking stratejisi belirtilmemiş | Retrieval kalitesini etkiler | Semantic chunking (rekursif, overlap ile) veya LLM-based chunking |
| Citation mekanizması belirtilmemiş | RAG output'u doğrulamak önemli | Chunk ID → Document + Page/Position mapping lazım |

---

## Revize Edilmiş Mimari Plan

### 1. **Proje Yapısı (Monorepo)**

```
rag-search-app/
├── apps/
│   ├── web/                    # Next.js Frontend (App Router)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   │   ├── (auth)/     # Auth pages (login, signup)
│   │   │   │   ├── (main)/     # Protected routes
│   │   │   │   │   ├── chat/   # Chat page
│   │   │   │   │   └── dashboard/  # Admin dashboard
│   │   │   │   └── api/        # Next.js API routes (auth only)
│   │   │   ├── components/     # Reusable UI components
│   │   │   ├── hooks/          # Custom React hooks
│   │   │   ├── lib/            # Utilities (API client, auth)
│   │   │   └── styles/         # Global Tailwind config
│   │   └── next.config.js
│   │
│   ├── api/                    # Express/Fastify Backend
│   │   ├── src/
│   │   │   ├── server.ts       # Entry point
│   │   │   ├── middleware/     # Auth, CORS, error handling
│   │   │   ├── routes/
│   │   │   │   ├── auth.ts     # Login, register, refresh token
│   │   │   │   ├── search.ts   # /api/search endpoint
│   │   │   │   ├── documents.ts # /api/documents (admin only)
│   │   │   │   ├── ingestion.ts # /api/ingestion/* endpoints
│   │   │   │   └── analytics.ts # /api/analytics endpoints
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── search.service.ts   # Vektör arama logic
│   │   │   │   ├── rag.service.ts      # LLM + grounding
│   │   │   │   ├── ingestion.service.ts # Pipeline logic
│   │   │   │   └── embedding.service.ts # Embedding API client
│   │   │   ├── repositories/   # DB queries (Drizzle/Prisma)
│   │   │   ├── jobs/           # Bull/BullMQ job handlers
│   │   │   ├── db/
│   │   │   │   ├── schema.ts   # Drizzle table definitions
│   │   │   │   └── migrations/ # Database migrations
│   │   │   └── config/         # Environment & constants
│   │   └── package.json
│   │
│   └── mcp-server/             # Model Context Protocol Server (Bonus)
│       ├── src/
│       │   ├── server.ts       # MCP server setup
│       │   ├── tools/
│       │   │   └── search.tool.ts  # Search as MCP tool
│       │   └── auth/           # OIDC auth (bonus)
│       └── package.json
│
├── packages/
│   ├── shared/                 # Types & Schemas
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── api.ts      # API request/response types
│   │   │   │   ├── domain.ts   # Business logic types
│   │   │   │   └── auth.ts     # Auth-related types
│   │   │   ├── schemas/
│   │   │   │   ├── auth.ts     # Zod schemas for auth
│   │   │   │   ├── search.ts   # Zod schemas for search
│   │   │   │   └── document.ts # Zod schemas for documents
│   │   │   └── constants.ts    # Shared constants
│   │   └── package.json
│   │
│   └── db-migrations/          # Shared migration scripts
│       └── src/
│           └── migrate.ts
│
├── docker-compose.yml          # PostgreSQL, Redis (dev env)
├── pnpm-workspace.yaml         # Workspace config
├── tsconfig.json               # Root TypeScript config
├── .env.example                # Example environment variables
├── README.md                   # Setup ve running instructions
├── AI_USAGE.md                 # AI tool usage log
└── .gitignore

```

**Workspace Yapılandırması (pnpm-workspace.yaml):**
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

---

### 2. **Veri Katmanı (Database Layer)**

#### 2.1 İlişkisel Veritabanı (PostgreSQL)

**Teknoloji:** Drizzle ORM (lightweight, type-safe, migrations built-in)

**Tablo Şeması:**

```typescript
// packages/db-migrations/src/schema.ts

// Users Tablosu
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  hashedPassword: text('hashed_password').notNull(),
  name: text('name').notNull(),
  role: text('role').default('user').notNull(), // 'user' | 'admin'
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Documents Tablosu (metin kaynakları)
export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  filename: text('filename').notNull(),
  fileType: text('file_type').notNull(), // 'pdf', 'txt', 'markdown'
  fileSize: integer('file_size').notNull(),
  checksum: text('checksum').unique().notNull(), // Duplicate detection
  uploadedBy: uuid('uploaded_by').references(() => users.id),
  uploadedAt: timestamp('uploaded_at').defaultNow().notNull(),
  status: text('status').default('uploaded').notNull(), // 'uploaded' | 'processing' | 'indexed' | 'failed'
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Document Chunks Tablosu (chunked content)
export const documentChunks = pgTable('document_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .references(() => documents.id, { onDelete: 'cascade' })
    .notNull(),
  chunkIndex: integer('chunk_index').notNull(), // Chunk sırası
  content: text('content').notNull(), // Metin içeriği
  tokens: integer('tokens').notNull(), // Token sayısı (estimate)
  startPosition: integer('start_position'), // Orijinal dokümanda başlangıç pozisyonu
  endPosition: integer('end_position'),
  metadata: jsonb('metadata'), // {pageNumber, section, heading, etc.}
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Embeddings Tablosu (vektör referans)
// NOT: Asıl embedding vektörleri Pgvector/Qdrant'ta, bu table sadece referans
export const embeddings = pgTable('embeddings', {
  id: uuid('id').primaryKey().defaultRandom(),
  chunkId: uuid('chunk_id')
    .references(() => documentChunks.id, { onDelete: 'cascade' })
    .unique()
    .notNull(),
  vectorDbId: text('vector_db_id').notNull(), // Pgvector row id veya Qdrant point id
  modelName: text('model_name').notNull(), // Embedding model (e.g., 'text-embedding-3-small')
  modelVersion: text('model_version').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Ingestion Jobs Tablosu (processability & observability)
export const ingestionJobs = pgTable('ingestion_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  documentId: uuid('document_id')
    .references(() => documents.id, { onDelete: 'cascade' })
    .notNull(),
  status: text('status').notNull(), // 'queued' | 'processing' | 'completed' | 'failed'
  chunkedCount: integer('chunked_count'), // Kaç chunk oluşturuldu
  embeddedCount: integer('embedded_count'), // Kaç embedding başarılı
  totalChunks: integer('total_chunks'),
  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Search Queries Tablosu (Analytics)
export const searchQueries = pgTable('search_queries', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  query: text('query').notNull(),
  retrievedChunkCount: integer('retrieved_chunk_count').notNull(), // Top-K
  answerGenerated: boolean('answer_generated').notNull(),
  answerTokens: integer('answer_tokens'),
  relevanceFeedback: text('relevance_feedback'), // 'helpful' | 'not_helpful' | null
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Sessions Tablosu (JWT refresh tokens)
export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  refreshToken: text('refresh_token').unique().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Database Setup (Docker Compose):**
```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: rag_search_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev_password
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data

  pgvector:
    image: pgvector/pgvector:pg16
    # PostgreSQL yerine Pgvector'u kullan
    environment:
      POSTGRES_DB: rag_search_dev
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev_password
    ports:
      - '5433:5432'
    volumes:
      - pgvector_data:/var/lib/postgresql/data

volumes:
  postgres_data:
  pgvector_data:
  redis_data:
```

#### 2.2 Vektör Veritabanı (Pgvector)

**Seçim Sebebi:**
- PostgreSQL içerisinde native vektör desteği (pgvector extension)
- Deployment kolaylığı (bir veritabanı = işletme kolaylığı)
- Hybrid search'e yer açıyor (keyword + vector)
- Small-to-medium scale için yeterli
- **Alternatif:** Qdrant veya Pinecone (self-hosted / cloud)

**Vektör Tablosu:**
```sql
-- PostgreSQL'de pgvector extension aktif olmalı
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS chunk_embeddings (
  id uuid PRIMARY KEY,
  chunk_id uuid NOT NULL REFERENCES document_chunks(id) ON DELETE CASCADE,
  embedding vector(1536), -- OpenAI text-embedding-3-small = 1536 dims
  similarity_index GENERATED ALWAYS AS (...) STORED, -- Optional: fast similarity
  created_at timestamp DEFAULT now()
);

-- HNSW index for fast similarity search
CREATE INDEX chunk_embeddings_embedding_idx 
ON chunk_embeddings USING hnsw (embedding vector_cosine_ops);
```

**Embedding Parameters:**
- Model: OpenAI `text-embedding-3-small` (1536 dims, cost-effective)
- Alternative: Ollama local embedding (privacy, no API cost)
- Configurable: `.env`'de model seçeneği

---

### 3. **Ingestion Pipeline (Document Processing)**

#### 3.1 Chunking Strategy

**Seçim:** Recursive Semantic Chunking with Overlap

```typescript
// apps/api/src/services/chunking.service.ts

interface ChunkingOptions {
  maxChunkSize: number; // 512 tokens
  overlapSize: number;  // 50 tokens
  separators: string[]; // ['\n\n', '\n', '. ', ' ', '']
}

interface DocumentChunk {
  content: string;
  tokens: number;
  startPosition: number;
  endPosition: number;
  metadata: {
    pageNumber?: number;
    section?: string;
    heading?: string;
  };
}

/**
 * Recursive chunking: try splitting by largest separator,
 * if chunks still too big, move to next separator
 */
async function chunkDocument(
  content: string,
  fileType: 'pdf' | 'txt' | 'markdown',
  options: ChunkingOptions
): Promise<DocumentChunk[]> {
  // 1. File type specific extraction (PDF → text, headers, etc.)
  const extracted = await extractTextByFileType(content, fileType);
  
  // 2. Recursive split
  const chunks = recursiveSplit(extracted.text, options);
  
  // 3. Enrich metadata
  const enriched = chunks.map((chunk, idx) => ({
    ...chunk,
    metadata: {
      pageNumber: extracted.pageMap?.[chunk.startPosition],
      section: detectSection(chunk.content),
      heading: detectHeading(chunk.content),
    }
  }));
  
  return enriched;
}
```

**Neden bu stratejisi?**
- Semantic boundaries'i korur (paragraf/sayfa kesilmiyor)
- Overlap, query'nin chunk sınırını kaçırmasını önler
- Flexible: LLM-based chunking'e sonra upgrade edilebilir
- Observable: chunk metadata'sı tam kayıtlanır

#### 3.2 Ingestion Pipeline Architecture

```typescript
// apps/api/src/services/ingestion.service.ts

/**
 * Ingestion Pipeline (Bull Queue kullanarak):
 * 
 * 1. Document Upload → ingestion job oluştur (status: 'queued')
 * 2. Process Job:
 *    a. Extract text from file
 *    b. Chunk the content
 *    c. Generate embeddings (batch)
 *    d. Store in vector DB
 *    e. Mark document as 'indexed'
 * 3. Error handling + retry logic
 * 4. Event logging (analytics)
 */

// Bull Queue job definition
const ingestionQueue = new Queue('document-ingestion', {
  connection: redisClient,
});

ingestionQueue.process(async (job) => {
  const { documentId } = job.data;
  
  try {
    // Log start
    await updateIngestionJob(documentId, { status: 'processing', startedAt: new Date() });
    
    // 1. Fetch document
    const doc = await documentRepository.findById(documentId);
    
    // 2. Extract + Chunk
    const chunks = await chunkingService.chunkDocument(
      doc.content, 
      doc.fileType,
      { maxChunkSize: 512, overlapSize: 50 }
    );
    
    // 3. Save chunks to DB
    const savedChunks = await chunkRepository.createMany(chunks, documentId);
    
    // 4. Generate embeddings (batch)
    const embeddings = await embeddingService.embedMany(
      savedChunks.map(c => c.content)
    );
    
    // 5. Store embeddings in vector DB
    await vectorDbService.insertEmbeddings(
      savedChunks.map((chunk, idx) => ({
        chunkId: chunk.id,
        embedding: embeddings[idx],
        modelName: 'text-embedding-3-small',
      }))
    );
    
    // 6. Update status
    await updateIngestionJob(documentId, {
      status: 'completed',
      chunkedCount: chunks.length,
      embeddedCount: embeddings.length,
      completedAt: new Date(),
    });
    
    await documentRepository.updateStatus(documentId, 'indexed');
    
  } catch (error) {
    // Retry logic (configurable max retries)
    if (job.attemptsMade < MAX_RETRIES) {
      throw error; // Bull otomatik olarak retry eder
    } else {
      await updateIngestionJob(documentId, {
        status: 'failed',
        errorMessage: error.message,
      });
    }
  }
});

// API endpoint: trigger ingestion
app.post('/api/ingestion/trigger', requireAuth('admin'), async (req, res) => {
  const { documentId } = req.body;
  
  // Queue the job
  await ingestionQueue.add({ documentId }, { attempts: 3, backoff: { type: 'exponential' } });
  
  res.json({ message: 'Ingestion queued', documentId });
});

// API endpoint: check status
app.get('/api/ingestion/:documentId/status', requireAuth('user'), async (req, res) => {
  const job = await ingestionRepository.findByDocumentId(req.params.documentId);
  res.json(job);
});
```

**Observable Features:**
- ✅ Real-time job status tracking (queued → processing → completed)
- ✅ Error logging with retry attempts
- ✅ Chunk count + embedding count verification
- ✅ Estimated time to completion
- ✅ Dashboard'ta live monitoring

---

### 4. **Arama & RAG Katmanı (Search & Retrieval)**

#### 4.1 Semantic Search

```typescript
// apps/api/src/services/search.service.ts

interface SearchResult {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  content: string;
  similarity: number; // 0-1
  metadata: {
    pageNumber?: number;
    section?: string;
  };
}

async function semanticSearch(
  query: string,
  topK: number = 5
): Promise<SearchResult[]> {
  // 1. Embed the query
  const queryEmbedding = await embeddingService.embed(query);
  
  // 2. Vector similarity search (Pgvector: cosine distance)
  const results = await db.query(
    `SELECT 
       ce.chunk_id,
       dc.document_id,
       d.title,
       dc.content,
       dc.metadata,
       1 - (ce.embedding <=> $1) as similarity
     FROM chunk_embeddings ce
     JOIN document_chunks dc ON ce.chunk_id = dc.id
     JOIN documents d ON dc.document_id = d.id
     WHERE d.status = 'indexed'
     ORDER BY similarity DESC
     LIMIT $2`,
    [queryEmbedding, topK]
  );
  
  return results.map(row => ({
    chunkId: row.chunk_id,
    documentId: row.document_id,
    documentTitle: row.title,
    content: row.content,
    similarity: row.similarity,
    metadata: row.metadata,
  }));
}
```

#### 4.2 RAG (Retrieval-Augmented Generation)

```typescript
// apps/api/src/services/rag.service.ts

interface RAGResponse {
  answer: string;
  citations: Citation[];
  retrievedChunks: SearchResult[];
  confidence: number; // Model's confidence in grounded answer
}

interface Citation {
  documentId: string;
  documentTitle: string;
  chunkId: string;
  content: string;
  pageNumber?: number;
  section?: string;
}

async function generateGroundedAnswer(
  query: string,
  retrievedChunks: SearchResult[],
  userId: string
): Promise<RAGResponse> {
  // 1. Build context
  const context = retrievedChunks
    .map((chunk, idx) => `[Source ${idx + 1}]\n${chunk.content}\n`)
    .join('\n---\n');
  
  // 2. Build system prompt with grounding instructions
  const systemPrompt = `You are a helpful assistant. Answer the user's question based ONLY on the provided context.
  
Rules:
- If the context does not contain the answer, say "I don't have enough information to answer this."
- NEVER make up information or use knowledge outside the context.
- Always cite your sources using [Source N] format when referencing the context.
- Be concise and accurate.`;

  // 3. Call LLM (OpenAI, Anthropic, etc.)
  const response = await llmService.generateCompletion({
    systemPrompt,
    userMessage: query,
    context,
    temperature: 0.2, // Low temp for factuality
    maxTokens: 1024,
  });

  // 4. Parse answer and citations
  const { answer, citedSources } = parseAnswerCitations(response, retrievedChunks);
  
  // 5. Build citations
  const citations: Citation[] = citedSources.map(idx => ({
    documentId: retrievedChunks[idx].documentId,
    documentTitle: retrievedChunks[idx].documentTitle,
    chunkId: retrievedChunks[idx].chunkId,
    content: retrievedChunks[idx].content,
    pageNumber: retrievedChunks[idx].metadata.pageNumber,
    section: retrievedChunks[idx].metadata.section,
  }));

  // 6. Log for analytics
  await logSearchQuery({
    userId,
    query,
    retrievedChunkCount: retrievedChunks.length,
    answerGenerated: true,
    answerTokens: response.usage.completion_tokens,
  });

  return {
    answer,
    citations,
    retrievedChunks: retrievedChunks.slice(0, 3), // Top 3 for UI
    confidence: citedSources.length > 0 ? 0.95 : 0.6,
  };
}
```

**LLM Selection:**
- OpenAI: `gpt-4o-mini` (cost-effective, high quality)
- Anthropic Claude: `claude-3-5-sonnet` (excellent at citations)
- Local: Ollama `llama2` (privacy, no API cost)
- **Configurable:** `.env`'de seçilebilir

---

### 5. **Kimlik Doğrulama & Yetkilendirme (Auth & RBAC)**

#### 5.1 JWT-based Authentication

```typescript
// apps/api/src/middleware/auth.middleware.ts

interface JWTPayload {
  userId: string;
  email: string;
  role: 'user' | 'admin';
  iat: number;
  exp: number;
}

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  const user = await userRepository.findByEmail(email);
  if (!user || !await bcrypt.compare(password, user.hashedPassword)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  
  // Generate JWT tokens
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );
  
  // Store refresh token in DB
  await sessionRepository.create({
    userId: user.id,
    refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  
  res.json({
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, role: user.role },
  });
});

// Middleware: require auth
export const requireAuth = (minRole?: 'user' | 'admin') => {
  return (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Missing authorization token' });
    }
    
    try {
      const payload = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
      
      if (minRole && payload.role !== minRole && payload.role !== 'admin') {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      req.user = payload;
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};
```

#### 5.2 Role-Based Access Control (RBAC)

| Action | User | Admin |
|--------|------|-------|
| Search / Ask questions | ✅ | ✅ |
| View Chat history | ✅ | ✅ |
| View own profile | ✅ | ✅ |
| Upload documents | ❌ | ✅ |
| Trigger ingestion | ❌ | ✅ |
| View Dashboard | ❌ | ✅ |
| View analytics | ❌ | ✅ |
| Manage users | ❌ | ✅ |

```typescript
// Guard functions
const requireAdmin = requireAuth('admin');
const requireUser = requireAuth('user');

// Routes with guards
app.post('/api/documents/upload', requireAdmin, handleDocumentUpload);
app.get('/api/dashboard/stats', requireAdmin, getDashboardStats);
app.post('/api/search', requireUser, handleSearch);
```

---

### 6. **Frontend (Next.js + Tailwind CSS)**

#### 6.1 Route Structure

```
apps/web/src/app/
├── (auth)/
│   ├── login/
│   │   └── page.tsx
│   ├── register/
│   │   └── page.tsx
│   └── layout.tsx
├── (main)/
│   ├── chat/
│   │   ├── page.tsx          # Chat interface
│   │   └── [conversationId]/page.tsx
│   ├── dashboard/
│   │   ├── page.tsx          # Dashboard overview
│   │   ├── documents/page.tsx # Document management
│   │   └── analytics/page.tsx # Search analytics
│   ├── layout.tsx            # Main layout (sidebar, header)
│   └── profile/page.tsx      # User profile
├── api/
│   └── auth/[...nextauth]/route.ts
└── layout.tsx                 # Root layout
```

#### 6.2 Key Pages

**Chat Page (`apps/web/src/app/(main)/chat/page.tsx`):**
- Input area for natural language queries
- Real-time search results (retrieved chunks)
- Grounded answer with citations
- Citation links (click to expand source)
- Search history sidebar

**Dashboard Page (`apps/web/src/app/(main)/dashboard/page.tsx`):**
- Document upload area (drag & drop)
- Indexed documents table (status, size, created date)
- Ingestion status (live progress)
- Search analytics charts (queries over time, popular queries)
- System health (last index update, embedding coverage)

**Responsive Design:**
- Mobile-first Tailwind layout
- Touch-friendly inputs on mobile
- Collapsible sidebar on mobile
- Table pagination on small screens

---

### 7. **MCP Server (Model Context Protocol)**

#### 7.1 MCP Tool Definition

```typescript
// apps/mcp-server/src/server.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'rag-search-server',
  version: '1.0.0',
});

// Define search tool
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'semantic_search',
      description: 'Search the indexed document corpus semantically and retrieve grounded answers with citations.',
      inputSchema: {
        type: 'object' as const,
        properties: {
          query: {
            type: 'string',
            description: 'The natural language search query',
          },
          topK: {
            type: 'number',
            description: 'Number of relevant chunks to retrieve (default: 5)',
          },
        },
        required: ['query'],
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === 'semantic_search') {
    const { query, topK = 5 } = request.params.arguments as {
      query: string;
      topK?: number;
    };

    // Call the backend API
    const result = await fetch(`${process.env.API_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MCP_API_TOKEN}`,
      },
      body: JSON.stringify({ query, topK }),
    }).then(r => r.json());

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  return { content: [{ type: 'text' as const, text: 'Tool not found' }] };
});

// Start server
const transport = new StdioServerTransport();
await server.connect(transport);
```

#### 7.2 MCP Client Usage

```bash
# Example: How to connect to the MCP server
# In your .claude_usage or client config:

{
  "mcpServers": {
    "rag-search": {
      "command": "node",
      "args": ["path/to/mcp-server/dist/server.js"],
      "env": {
        "API_URL": "http://localhost:3000",
        "MCP_API_TOKEN": "your-token-here"
      }
    }
  }
}
```

---

### 8. **Teknoloji Stack Özeti**

| Katman | Teknoloji | Gerekçe |
|--------|-----------|--------|
| **Monorepo** | pnpm workspaces + Turborepo | Lightweight, fast, shared types |
| **Frontend** | Next.js 14+ (App Router) | SSR, API routes, built-in auth |
| **Styling** | Tailwind CSS 3+ | Responsive, utility-first, low overhead |
| **Backend** | Express.js / Fastify | Lightweight, flexible, industry standard |
| **ORM** | Drizzle ORM | Type-safe, migrations, PostgreSQL native |
| **Database** | PostgreSQL + pgvector | ACID compliance, vektör support, one DB to rule them all |
| **Job Queue** | Bull / BullMQ | Reliable job processing, retry logic, Redis-backed |
| **Cache/Queue** | Redis | Session management, job queue, rate limiting |
| **Embedding** | OpenAI text-embedding-3-small | Cost-effective, high quality (configurable) |
| **LLM** | OpenAI GPT-4o-mini / Claude 3.5 | High quality answers, citations support |
| **Auth** | JWT + sessions | Stateless, scalable, standard |
| **Validation** | Zod | Runtime type checking, great DX |
| **Testing** | Vitest + Playwright | Fast unit tests, E2E browser tests |

---

### 9. **Environment Variables (.env.example)**

```bash
# Database
DATABASE_URL=postgresql://dev:dev_password@localhost:5432/rag_search_dev
REDIS_URL=redis://localhost:6379

# API Server
API_PORT=3000
API_URL=http://localhost:3000
NODE_ENV=development

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_REFRESH_SECRET=your-refresh-secret-key-change-in-production

# Embedding & LLM
OPENAI_API_KEY=sk-...
EMBEDDING_MODEL=text-embedding-3-small
LLM_MODEL=gpt-4o-mini

# MCP Server
MCP_API_TOKEN=your-mcp-token-here
MCP_PORT=3001

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3000

# Chunking
CHUNK_SIZE=512
CHUNK_OVERLAP=50
```

---

### 10. **Development & Running**

#### Setup (Fresh Machine)

```bash
# 1. Clone repo
git clone <repo-url>
cd rag-search-app

# 2. Install dependencies
pnpm install

# 3. Start services (PostgreSQL + Redis)
docker-compose up -d

# 4. Run migrations
pnpm run db:migrate

# 5. Seed demo users
pnpm run db:seed

# 6. Start backend
cd apps/api
pnpm run dev

# 7. Start frontend (new terminal)
cd apps/web
pnpm run dev

# 8. Start MCP server (optional, new terminal)
cd apps/mcp-server
pnpm run dev
```

#### Demo Credentials

```
Admin User:
Email: admin@example.com
Password: admin123

Regular User:
Email: user@example.com
Password: user123
```

---

### 11. **Key Design Decisions Explained**

| Decision | Why |
|----------|-----|
| PostgreSQL + Pgvector (not Pinecone) | Single DB simplifies dev setup & hosting; no external dependencies |
| Chunking with overlap | Prevents losing context at chunk boundaries; improves retrieval quality |
| Bull queue (not background jobs) | Reliable job processing with retry logic; observable progress |
| JWT tokens (not sessions) | Stateless, scales to distributed system; refresh token for security |
| Drizzle ORM | Type-safe queries, migrations, no code generation, lightweight |
| Express (not full Next.js API) | Separation of concerns; frontend doesn't tie backend to Next.js ecosystem |
| Semantic chunking first | Simpler than LLM-based chunking, good retrieval quality, no LLM cost for ingestion |
| OpenAI embeddings (configurable) | High quality, familiar, cost-effective; easy to swap in `.env` |

---

### 12. **Must-Have Checklist**

- [ ] **Monorepo**: Web, API, MCP Server, Shared packages
- [ ] **Ingestion**: Chunking (512 tokens), embeddings, vector storage, job tracking
- [ ] **Search**: Semantic search via pgvector, retrieval quality > 5 chunks
- [ ] **RAG**: LLM grounding, citations, "I don't know" handling
- [ ] **Chat Page**: Query input, results display, citations UI
- [ ] **Dashboard**: Document management, ingestion status, analytics
- [ ] **MCP Server**: Search tool exposed, callable by external clients
- [ ] **Auth & RBAC**: Login, JWT, role-based dashboard access
- [ ] **Error Handling**: Try-catch, meaningful error messages
- [ ] **Type Safety**: TypeScript everywhere, Zod validation
- [ ] **Documentation**: README, AI_USAGE.md, .env.example, API docs
- [ ] **Responsive UI**: Mobile, tablet, desktop support

---

### 13. **Bonus Features (Future Phases)**

- **Self-updating pipeline**: File system watcher + incremental indexing
- **Hybrid search**: Keyword (BM25) + vector, combined ranking
- **Reranking**: LLM-based or learned re-ranking of top-K results
- **Live deployment**: Docker + GitHub Actions → AWS/Railway/Vercel
- **OIDC for MCP**: OAuth2 JWT signing for secure MCP calls
- **User management**: Admin UI to invite/manage users
- **Query rewriting**: LLM rewrites user query before search
- **Streaming answers**: SSE for real-time answer generation

---

## Özet

**Orijinal plana kıyasla:**
1. ✅ **Backend'i ayrılaştır** (Express, Next.js API routing karışmasını önle)
2. ✅ **PostgreSQL + pgvector** (SQLite'ın ötesine geç, single DB advantage)
3. ✅ **Bull Queue + Redis** (observable, reliable ingestion)
4. ✅ **Drizzle ORM** (type-safe, lightweight, built-in migrations)
5. ✅ **Chunking strategy belirt** (recursive, overlap)
6. ✅ **Citation mechanism** (chunk ID → document mapping)
7. ✅ **Bonus'a hazırlı** (MCP server, async pipeline, auth infrastructure ready)

Bu mimari, **must-have'leri 2 gün içerisinde** tamamlamaya yeterlidir, ve bonus features'a kolayca genişletilebilir.

---

**Sorular?** Belirli bir component hakkında daha detaylı bilgi istersen (örn. chunking logic, RAG prompting, job queue patterns), kodla beraber açıklayabilirim.
