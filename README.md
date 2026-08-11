# Playable Factory - Full-Stack RAG & Vector Search System

> A production-grade, full-stack TypeScript Monorepo application that indexes document corpora into a vector database (PostgreSQL + pgvector), performs semantic hybrid retrieval, and generates strictly grounded answers with verifiable citations using Google Gemini 3.5 Flash-Lite and Google Embedding models.

[![Live Demo](https://img.shields.io/badge/Live_Demo-playable--rag.up.railway.app-success?style=for-the-badge&logo=railway)](https://playable-rag.up.railway.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20+%20pgvector-336791.svg)](https://github.com/pgvector/pgvector)
[![LLM](https://img.shields.io/badge/LLM-Gemini%203.5%20Flash--Lite-orange.svg)](https://ai.google.dev/)
[![Embeddings](https://img.shields.io/badge/Embeddings-gemini--embedding--001%20(768d)-green.svg)](https://ai.google.dev/)

---

## 🌐 Live Deployment & Public Demo

The system is already **fully deployed and live in production on Railway**! Evaluators do not need to perform any local deployment or database setup to test the complete application:

🔗 **Live Application URL**: [https://playable-rag.up.railway.app](https://playable-rag.up.railway.app)

- **Admin Account**: `admin@example.com` / `admin123Password!` (or 1-Click Fill on Login screen)
- **User Account**: `user@example.com` / `user123Password!` (or 1-Click Fill on Login screen)

> [!WARNING]
> **API Rate Limits Notice**:
> Since the live system operates on Google Gemini API free-tier quotas (15 RPM - Requests Per Minute), rapid back-to-back queries or concurrent benchmark runs by multiple users may temporarily trigger rate limits (HTTP 429). If this occurs, please wait ~30 seconds before retrying, or configure your own dedicated API keys as detailed in the local setup guide below.

---

## 1. Project Description

This repository provides an end-to-end knowledge base retrieval and generation platform designed for game studios and playable ad production teams. It indexes engineering documentation, network specifications (AppLovin, Unity, Meta), QA checklists, changelogs, and incident postmortems, providing grounded answers with interactive citations back to the source documents.

### Key Surfaces
1. **Chat Page (`/chat`)**: Interactive experience for natural language questioning, instant semantic retrieval, grounded answers with real-time SSE token streaming, and interactive source citation links that expand exact document excerpts.
2. **Admin Dashboard (`/dashboard`)**: Role-gated dashboard for corpus management, drag-and-drop document uploads (Markdown, Plain Text, PDF), real-time ingestion observability, user management, and search telemetry & query analytics.
3. **MCP Server (`apps/mcp-server`)**: Model Context Protocol tool provider allowing external AI agents (Claude Desktop, Cursor, Cline) to perform semantic searches against the indexed corpus over stdio or HTTP with OpenID Connect (OIDC) authentication.

---

## 2. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Monorepo** | `pnpm` workspaces | Fast package resolution, zero-duplication shared TypeScript type contracts |
| **Frontend** | Next.js 14+ (App Router) | Server/Client components, responsive layouts, high-performance static rendering |
| **Styling** | Tailwind CSS 3+ & Glassmorphism | Custom responsive modern dark-theme design system for desktop, tablet, and mobile |
| **Backend API** | Express.js 4+ & TypeScript | Dedicated modular REST API with strict separation of concerns |
| **Database & Vector Store** | PostgreSQL 16 + `pgvector` | Native ACID compliance, relational metadata, and HNSW cosine similarity search |
| **ORM** | Drizzle ORM | Zero-runtime overhead, type-safe SQL, TypeScript migrations |
| **LLM Provider** | Google Gemini 3.5 Flash-Lite | Ultra-fast inference, 1M+ context window, grounded reasoning |
| **Embedding Model** | Google `gemini-embedding-001` (768-dim) | State-of-the-art dense semantic embeddings |
| **Ingestion Queue** | BullMQ + Redis (with async memory fallback) | Observable document chunking, retries, and job tracking |
| **MCP Integration** | `@modelcontextprotocol/sdk` + `jose` (OIDC) | Standard tool interface with OIDC token validation |
| **Validation & Security** | Zod + JWT + bcrypt + Helmet | Runtime schema validation and RBAC token security |

---

## 3. Features List

### Must-Haves (Core Requirements)
- ✅ **TypeScript Monorepo Architecture**: Clean package boundaries (`apps/web`, `apps/api`, `apps/mcp-server`, `packages/shared`).
- ✅ **Observable Ingestion Pipeline**: Recursive directory scanning, semantic chunking (`js-tiktoken`), checksum deduplication, and observable status tracking.
- ✅ **Semantic Search + Grounded RAG**: Multi-branch vector similarity + BM25 keyword search + strict anti-hallucination abstention.
- ✅ **Chat Page**: Clean conversational UI with real-time SSE streaming, token pacing, confidence metrics, and interactive citation popups.
- ✅ **Corpus & Analytics Dashboard**: File upload, deletion, re-index triggering, index health metrics, and query telemetry charts.
- ✅ **MCP Server for Search**: Model Context Protocol tool provider with full client configuration guide.
- ✅ **Authentication & Authorization (RBAC)**: JWT access/refresh token rotation, role guards (`admin` vs `user`), and Next.js edge middleware.
- ✅ **AI Usage Log**: Comprehensive `AI_USAGE.md` documenting human-AI collaboration, bug catches, and architectural decisions.

### Bonus Features (All 7 Implemented)
1. 🌟 **MCP Authentication via OIDC**: Full OpenID Connect Resource Server verification (`jose`) validating remote JWKS, `iss`, `aud`, `exp`, and `mcp:search` scopes.
2. 🌟 **Self-Updating Pipeline (File Watcher)**: Real-time `fs.watch` daemon monitoring `/corpus` for incremental indexing and automatic vector purging on file deletions.
3. 🌟 **Live Cloud Deployment**: Fully deployed on Railway ([playable-rag.up.railway.app](https://playable-rag.up.railway.app)) with automated zero-touch database migrations.
4. 🌟 **Advanced Retrieval Quality**:
   - Multi-query decomposition & query rewriting for informal / colloquial queries.
   - Hybrid search: pgvector HNSW cosine distance + PostgreSQL `tsvector` BM25 full-text search.
   - Gemini Batch Structured Reranker with dynamic relevance filtering.
   - Document Diversity constraint (max 2 chunks per doc) to eliminate context cannibalization.
5. 🌟 **Empirical RAG Evaluation Suite**: Interactive 20-scenario benchmark engine measuring Recall@5, Hit@1, MRR, and Negative Abstention with real-time SSE execution and instant JSON export.
6. 🌟 **Streaming Answers & UI Polish**: Harf-harf SSE token streaming, smooth typography, responsive mobile hamburger drawer, and 1-tap quick navigation tabs.
7. 🌟 **User Management & Token Invitations**: Admin user management modal with cryptographic invitation links (`/register?inviteToken=...`), role promotion/demotion, and active user revocation.

---

## 4. Installation & Local Setup

### Prerequisites
- **Node.js**: v18+ (tested on Node.js v20 and v22)
- **pnpm**: v9+ (`npm install -g pnpm`)
- **Docker** (Optional, for PostgreSQL + Redis services)
- **Google Gemini API Key(s)** (Free tier from [Google AI Studio](https://aistudio.google.com/))

### Step 1: Clone & Install Dependencies
```bash
git clone https://github.com/FawkesFeu/PlayableFactoryCaseStudy.git
cd PlayableFactoryCaseStudy
pnpm install
```

### Step 2: Configure Environment Variables (.env)
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```

> 💡 **PRO TIP: Dual API Keys for Maximum Rate Limit Headroom**
> 
> We strongly recommend generating **two separate API keys** from [Google AI Studio](https://aistudio.google.com/) (one for the primary LLM/embeddings and one dedicated for the Reranker). This prevents any single key from hitting Google's free-tier 15 RPM (Requests Per Minute) rate limits during intensive queries or full benchmark evaluation runs:

```env
# ============= DATABASE (PostgreSQL + pgvector) =============
DATABASE_URL=postgresql://dev:dev_password@localhost:5432/rag_search_dev
REDIS_URL=redis://localhost:6379

# ============= API SERVER =============
PORT=8080
API_PORT=8080
API_URL=http://localhost:8080
NODE_ENV=development

# ============= AUTHENTICATION & JWT =============
JWT_SECRET=super-secret-jwt-key-minimum-32-characters-long-example
JWT_REFRESH_SECRET=super-secret-refresh-jwt-key-minimum-32-characters-long-example

# ============= PRIMARY LLM & EMBEDDINGS (Key 1) =============
GEMINI_API_KEY=AIzaSyYourFirstGeminiApiKeyHere...
GEMINI_MODEL=gemini-3.5-flash-lite
EMBEDDING_MODEL=gemini-embedding-001

# ============= DEDICATED RERANKER (Key 2 - Recommended) =============
GEMINI_RERANKER_API_KEY=AIzaSyYourSecondGeminiApiKeyHere...
GEMINI_RERANKER_MODEL=gemini-3.5-flash-lite

# ============= FRONTEND =============
NEXT_PUBLIC_API_URL=http://localhost:8080
FRONTEND_URL=http://localhost:3000
```
*(Note: If `GEMINI_API_KEY` is omitted, the system automatically switches to deterministic offline mock embedding & synthesis engines so you can still build and run tests without an internet connection!)*

### Step 3: Start Services & Seed Database
If using Docker for local database services:
```bash
docker compose up -d
pnpm db:migrate
pnpm db:seed
```
*`pnpm db:seed` automatically creates default test user accounts and recursively indexes all 142 documents from `sample_dataset/corpus`.*

### Step 4: Running the Application
To run both Frontend and Backend concurrently:
```bash
pnpm dev:all
```

Or run them individually:
```bash
pnpm --filter @rag/api dev   # API on http://localhost:8080
pnpm --filter @rag/web dev   # Web UI on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Demo Credentials

The database seeder pre-configures test accounts. On the **Login Page**, you can click the **"1-Click Fill"** buttons to auto-populate credentials:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@example.com` | `admin123Password!` | Full Access: Chat, Search, Document Upload/Delete, Ingestion Trigger, User Management, RAG Evaluation Suite |
| **Standard User** | `user@example.com` | `user123Password!` | Semantic Search, Chat Assistant, Citation Viewing |

---

## 6. Running the RAG Evaluation Suite

### CLI Mode
To run the automated empirical benchmark suite across all 20 test scenarios:
```bash
pnpm evaluate
```

### Interactive UI Mode
1. Log in as an **Admin** (`admin@example.com`) on [https://playable-rag.up.railway.app](https://playable-rag.up.railway.app).
2. Navigate to **Dashboard -> RAG Evaluation Suite** tab.
3. Click **"Run Live Benchmark"** to observe real-time SSE test execution across all 20 scenarios.
4. Click **"Export JSON"** to download the comprehensive benchmark report.

---

## 7. Model Context Protocol (MCP) Server with OIDC Authentication

The application includes an independent **Model Context Protocol (MCP) server** (`apps/mcp-server`) secured via an **OpenID Connect (OIDC) Resource Server** architecture using the `jose` library.

### Testing OIDC Security Suite
To run all 8 automated OIDC authentication & authorization tests:
```bash
pnpm test:mcp-auth
```

### Connecting to Claude Desktop / Cursor
Add the configuration from `.mcp-config.json` to your client configuration:

```json
{
  "mcpServers": {
    "playable-factory-rag": {
      "command": "node",
      "args": ["<PATH_TO_PROJECT>/apps/mcp-server/dist/server.js"],
      "env": {
        "API_URL": "https://playable-rag.up.railway.app",
        "OIDC_ISSUER": "https://auth.playablefactory.com/",
        "OIDC_AUDIENCE": "https://mcp.playablefactory.com",
        "OIDC_JWKS_URI": "https://auth.playablefactory.com/.well-known/jwks.json",
        "OIDC_REQUIRED_SCOPE": "mcp:search"
      }
    }
  }
}
```

### Exposed Tools
- `semantic_search`: Semantically searches the indexed corpus and retrieves grounded answers with document citations. Requires valid OIDC token with `mcp:search` scope.

---

## 8. API Documentation

All protected endpoints require `Authorization: Bearer <token>` in the request headers.

### Authentication Endpoints
- `POST /api/auth/register`: Register new account `{ name, email, password, inviteToken? }`
- `POST /api/auth/login`: Authenticate `{ email, password }` -> returns `{ accessToken, refreshToken, user }`
- `POST /api/auth/refresh`: Refresh JWT access token `{ refreshToken }`
- `POST /api/auth/logout`: Revoke session `{ refreshToken }`
- `GET /api/auth/me`: Current user profile

### Search & Grounded RAG Endpoints
- `POST /api/search`: Query the corpus
  ```json
  // Request
  {
    "query": "What is the maximum file size for an AppLovin playable?",
    "topK": 5,
    "generateAnswer": true
  }
  
  // Response
  {
    "success": true,
    "data": {
      "query": "What is the maximum file size for an AppLovin playable?",
      "answer": "According to [Source 1], the maximum file size for an AppLovin playable ad is 5MB...",
      "citations": [
        {
          "sourceIndex": 1,
          "documentTitle": "NETWORK SPECS APPLOVIN",
          "filename": "network-specs-applovin.md",
          "content": "Hard limits: Maximum file size: 5 MB for the final single HTML file...",
          "section": "Hard limits"
        }
      ],
      "confidence": 0.95,
      "executionTimeMs": 420,
      "isCorpusGrounded": true
    }
  }
  ```
- `POST /api/search/stream`: Real-time Server-Sent Events (SSE) token streaming endpoint for chat UI with immediate retrieval metadata and live token deltas.
- `POST /api/search/feedback`: Submit relevance feedback `{ queryId, feedback: 'helpful' | 'not_helpful' }`

### Documents & Ingestion (Admin Gated)
- `GET /api/documents`: List all corpus documents with chunk counts & statuses
- `POST /api/documents/upload`: Multipart file upload (`.md`, `.txt`, `.pdf`)
- `DELETE /api/documents/:id`: Remove document & cascade delete vector embeddings
- `GET /api/ingestion/:documentId/status`: Check live job progress
- `POST /api/ingestion/:documentId/trigger`: Re-index document

### Evaluation & Analytics (Admin Gated)
- `GET /api/evaluation/latest`: Get latest cached benchmark report
- `GET /api/evaluation/stream`: Real-time SSE live benchmark stream
- `POST /api/evaluation/run`: Run full benchmark suite
- `GET /api/analytics/stats`: Corpus metrics, 24h search volume, average latency, feedback ratio
- `GET /api/analytics/queries`: Recent query logs with performance metrics

---

## 9. Key Design Decisions

1. **PostgreSQL + pgvector (768-dim) vs. Standalone Vector DBs**:
   - Storing relational metadata (users, sessions, documents, jobs, analytics, invitations) alongside vector embeddings in a single database prevents synchronization drift and simplifies deployment.
   - HNSW indexing delivers sub-10ms cosine similarity retrieval with zero external SaaS dependencies.

2. **Google Gemini 3.5 Flash-Lite & Google Embedding Model**:
   - `gemini-embedding-001` generates dense 768-dimensional embeddings leading MTEB retrieval benchmarks.
   - Gemini 3.5 Flash-Lite provides state-of-the-art grounded reasoning, ultra-fast token streaming, and strict adherence to negative abstention instructions.

3. **Recursive Semantic Chunking with Boundary Awareness**:
   - Splits content on markdown headers (`#`, `##`, `###`), double newlines, and sentence boundaries with `js-tiktoken`.
   - Overlap of 50 tokens prevents query intent from falling between chunk boundaries.
   - Extracts section and heading metadata stored directly in JSONB for rich citation chips in the UI.

4. **Multi-Branch Hybrid Retrieval & Cross-Encoder Reranking**:
   - Combines dense vector similarity with BM25 full-text tsvector search.
   - Query rewriter decomposes informal or multi-lingual questions into canonical technical search terms.
   - Gemini structured batch reranker evaluates Top 18-20 candidate chunks with document diversity constraints.

5. **Bilingual Language Concordance**:
   - Retains facts strictly from the English corpus while automatically answering in the language the user asked in (e.g. natural Turkish when asked in Turkish, English when asked in English), preserving verifiable `[Source X]` citations.

---

## 10. Automated Tests & Quality Assurance

```bash
# 1. Run unit & integration test suites (26 passing tests across all packages)
pnpm test

# 2. Run automated RAG evaluation benchmark (20 scenarios)
pnpm evaluate

# 3. Type check and verify production builds
pnpm -r build
```

---

## 11. Production Deployment Guide (Railway / Docker)

The application is containerized with multi-stage Dockerfiles and self-migrating database routines.

🔗 **Live Public Demo**: [https://playable-rag.up.railway.app](https://playable-rag.up.railway.app)

### Local Production Run with Docker Compose
```bash
docker compose -f docker-compose.prod.yml up --build -d
```
- **Web Interface:** `http://localhost:3000`
- **Backend API:** `http://localhost:8080`

### Railway Cloud Architecture
1. **PostgreSQL Service**: Railway managed PostgreSQL 16 with native `pgvector` extension.
2. **API Service**: Containerized Express backend on port `8080` (`Dockerfile.api`) running zero-touch migrations and seed scripts on boot.
3. **Web Service**: Containerized Next.js frontend (`Dockerfile.web`) serving SSR/static assets connected to the API public domain.

---

## 12. Deliverables Checklist

- [x] Complete TypeScript Monorepo source code
- [x] `README.md` with complete installation, architecture, and deployment documentation
- [x] `AI_USAGE.md` with detailed human-AI pair programming logs
- [x] `.env.example` configuration files and seeding scripts
- [x] Live cloud demo deployment on Railway ([playable-rag.up.railway.app](https://playable-rag.up.railway.app))
- [x] Model Context Protocol (MCP) server with OIDC security suite

---

## 13. License

Proprietary case study implementation for Playable Factory evaluation.
