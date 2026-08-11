# Playable Factory - Full-Stack RAG & Vector Search System

> A production-grade, full-stack TypeScript Monorepo application that indexes document corpora into a vector database (PostgreSQL + pgvector), performs semantic retrieval, and generates strictly grounded answers with verifiable citations using Google Gemini 2.0 Flash and Google `text-embedding-004`.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20+%20pgvector-336791.svg)](https://github.com/pgvector/pgvector)
[![Gemini](https://img.shields.io/badge/LLM-Gemini%202.0%20Flash-orange.svg)](https://ai.google.dev/)
[![Embeddings](https://img.shields.io/badge/Embeddings-text--embedding--004%20(768d)-green.svg)](https://ai.google.dev/)

---

## 1. Project Overview

This repository provides an end-to-end knowledge base retrieval and generation platform designed for game studios and playable ad production teams.

### Key Surfaces
1. **Chat Page (`/chat`)**: End-user interactive experience for natural language questioning, instant semantic retrieval, grounded answers, and interactive source citation links that expand the exact document excerpts.
2. **Admin Dashboard (`/dashboard`)**: Role-gated dashboard for corpus management, drag-and-drop document uploads (Markdown, Plain Text, PDF), real-time ingestion observability, and search telemetry & query analytics.
3. **MCP Server (`apps/mcp-server`)**: Model Context Protocol tool provider allowing external AI agents (Claude Desktop, Cursor, Cline) to perform semantic searches against the indexed corpus over stdio.

---

## 2. Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Monorepo** | `pnpm` workspaces | Fast package resolution, shared TypeScript type contracts |
| **Frontend** | Next.js 14+ (App Router) | Server/Client components, high-performance static rendering |
| **Styling** | Tailwind CSS 3+ & Glassmorphism | Responsive modern dark-theme design system |
| **Backend API** | Express.js 4+ & TypeScript | Dedicated modular REST API with separation of concerns |
| **Database & Vector Store** | PostgreSQL 16 + `pgvector` | Native ACID compliance, HNSW cosine similarity search |
| **ORM** | Drizzle ORM | Zero-runtime overhead, type-safe SQL, TypeScript migrations |
| **LLM Provider** | Google Gemini 2.0 Flash | Ultra-fast inference, 1M+ context window, free tier available |
| **Embedding Model** | Google `text-embedding-004` (768-dim) | State-of-the-art MTEB retrieval performance |
| **Ingestion Queue** | BullMQ + Redis (with async fallback) | Observable document chunking, retries, and job tracking |
| **MCP Integration** | `@modelcontextprotocol/sdk` | Standard tool interface for external AI assistants |
| **Validation & Security** | Zod + JWT + bcrypt | Runtime type-checking and RBAC token security |

---

## 3. Monorepo Architecture

```
PlayableFactoryCaseStudy/
├── apps/
│   ├── web/                        # Next.js 14 Frontend (App Router, Tailwind CSS)
│   │   ├── src/app/                # Routes: (auth)/login, (auth)/register, (main)/chat, (main)/dashboard
│   │   ├── src/components/         # ChatMessage, CitationModal, DocumentUploadModal, AnalyticsCharts
│   │   └── src/contexts/           # AuthContext (JWT persistence, RBAC guards)
│   │
│   ├── api/                        # Express.js Backend API
│   │   ├── src/db/                 # Drizzle Schema (7 tables), Client & Migrations
│   │   ├── src/services/           # Chunking, Embedding, RAG, Ingestion, Search, Watcher
│   │   ├── src/repositories/       # Typed Data Access Repositories
│   │   ├── src/routes/             # /auth, /search, /documents, /ingestion, /analytics
│   │   └── src/evaluation/         # Case Study Evaluation Suite
│   │
│   └── mcp-server/                 # Model Context Protocol (MCP) Server
│       └── src/server.ts           # Exposes 'semantic_search' tool via Stdio
│
├── packages/
│   └── shared/                     # Shared TypeScript types, Zod schemas, and constants
│
├── sample_dataset/                 # Sample Case Study Corpus & sample_questions.md
├── docker-compose.yml              # PostgreSQL + pgvector & Redis services
├── .mcp-config.json                # Claude / Cursor MCP client configuration
└── AI_USAGE.md                     # AI usage and architectural decision log
```

---

## 4. Quick Start Guide (5 Minutes Setup)

### Prerequisites
- **Node.js**: v18+ (tested on Node.js v22)
- **pnpm**: v9+ (`corepack enable` or `npm install -g pnpm`)
- **Docker** (Optional, for PostgreSQL + Redis dev services)
- **Google Gemini API Key** (Free tier from [Google AI Studio](https://aistudio.google.com/))

### Step 1: Install Dependencies
```bash
pnpm install
pnpm approve-builds --all
```

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Open `.env` and add your `GEMINI_API_KEY`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
EMBEDDING_MODEL=text-embedding-004
DATABASE_URL=postgresql://dev:dev_password@localhost:5432/rag_search_dev
```
*(Note: If `GEMINI_API_KEY` is omitted, the system automatically uses a deterministic mock embedding & synthesizer engine so you can still run all tests offline!)*

### Step 3: Start Services & Seed Database
If using Docker:
```bash
docker-compose up -d
pnpm db:migrate
pnpm db:seed
```
*`pnpm db:seed` automatically creates the demo user accounts and indexes all Markdown documents from `sample_dataset/corpus`.*

### Step 4: Run the Application
In your terminal, you can start the backend, frontend, or both concurrently:

```bash
# Start both Frontend & Backend
pnpm dev:all

# OR start individually:
pnpm --filter @rag/api dev   # API on http://localhost:3001
pnpm --filter @rag/web dev   # Web UI on http://localhost:3000
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Demo Credentials

The database seeder pre-configures test accounts. On the **Login Page**, you can also click the **"1-Click Fill"** buttons to auto-populate credentials:

| Role | Email | Password | Permissions |
|---|---|---|---|
| **Admin** | `admin@example.com` | `admin123Password!` | Full Access: Chat, Search, Document Upload, Ingestion Trigger, Analytics Dashboard |
| **Standard User** | `user@example.com` | `user123Password!` | Search, Chat Assistant, Citation Viewing |

---

## 6. Running the Evaluation Suite

To test retrieval quality and hallucination prevention against all benchmark questions from `sample_dataset/sample_questions.md`:

```bash
pnpm evaluate
```

The automated evaluator tests:
1. **AppLovin File Size & Shipping**: Expects `network-specs-applovin.md` citation.
2. **Lumen SDK v3 vs v2 Deprecation**: Expects `sdk-notes-v3.md` and deprecation recognition.
3. **Separate Sound Assets Build Pass**: Expects `build-pipeline.md` and incident postmortem context.
4. **March 2026 Rejections**: Expects `incident-postmortem-2026-03.md`.
5. **Localization Requirements & Fallback**: Expects `localization-guide.md`.
6. **Corpus Negative Control**: Verifies that off-corpus questions (e.g. employee salaries) return an honest "Not covered in corpus" response with **0 fake citations**.

---

## 7. Model Context Protocol (MCP) Server with OIDC Authentication

The application includes an independent **Model Context Protocol (MCP) server** secured via an **OpenID Connect (OIDC) Resource Server** architecture using the `jose` library.

### Key Security Features
- **Remote JWKS Cryptographic Verification**: Dynamically fetches and caches public keys from the IdP (Auth0, Keycloak, Azure AD) via `/.well-known/jwks.json`.
- **Claims & Scope Enforcement**: Validates `iss` (Issuer), `aud` (Audience), `exp` (Expiration), and mandatory `mcp:search` scope.
- **Dual Transport Support**:
  - **HTTP Server (`http://localhost:3002`)**: Handles `/mcp` with HTTP `401 Unauthorized` and `WWW-Authenticate: Bearer` on invalid tokens.
  - **RFC Protected Resource Discovery**: Exposes `GET /.well-known/oauth-protected-resource` conforming to MCP OAuth metadata specifications.
  - **Stdio Transport**: Seamless local CLI & desktop agent integration.

### Testing OIDC Security Suite
To test all 8 authentication & authorization security scenarios (valid JWT, expired token, wrong issuer, insufficient scope, tampered signature):

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
        "API_URL": "http://localhost:3001",
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

All protected endpoints require `Authorization: Bearer <token>` or `Bearer <MCP_API_TOKEN>`.

### Authentication
- `POST /api/auth/register`: Register new account `{ name, email, password, role }`
- `POST /api/auth/login`: Authenticate `{ email, password }` -> returns `{ accessToken, refreshToken, user }`
- `POST /api/auth/refresh`: Refresh JWT access token `{ refreshToken }`
- `POST /api/auth/logout`: Revoke session `{ refreshToken }`
- `GET /api/auth/me`: Current user profile

### Search & RAG
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
          "content": "...",
          "section": "Specifications"
        }
      ],
      "confidence": 0.95,
      "executionTimeMs": 340,
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

### Analytics (Admin Gated)
- `GET /api/analytics/stats`: Corpus metrics, 24h search volume, average latency, feedback ratio
- `GET /api/analytics/queries`: Recent query logs with performance metrics

---

## 9. Key Design Decisions

1. **PostgreSQL + pgvector (768-dim) vs. Standalone Vector DBs**:
   - Storing relational metadata (users, sessions, documents, jobs, analytics) alongside vector embeddings in a single database prevents synchronization drift and simplifies deployment.
   - HNSW indexing delivers sub-10ms cosine similarity retrieval.

2. **Google Gemini 2.0 Flash + Google text-embedding-004**:
   - `text-embedding-004` generates dense 768-dimensional embeddings leading MTEB retrieval benchmarks.
   - Gemini 2.0 Flash provides state-of-the-art grounded reasoning with strict instructions to acknowledge missing information rather than hallucinating.
   - Fully free tier support on Google AI Studio.

3. **Recursive Semantic Chunking with Overlap**:
   - Splits content on markdown headers (`#`, `##`, `###`), double newlines, and sentence boundaries.
   - Overlap of 50 tokens prevents query intent from falling between chunk boundaries.
   - Extracts section and heading metadata stored directly in JSONB for rich citation chips in the UI.

4. **Self-Updating Pipeline (Bonus Feature)**:
   - Includes `watcherService` (`fs.watch`) monitoring `sample_dataset/corpus/`. When a developer edits or adds a file, it is automatically re-chunked and re-indexed incrementally without manual server restarts.

5. **Query Rewriting & Multi-Lingual Normalization (Bonus Feature)**:
   - Normalizes colloquial, multi-lingual (e.g. Turkish slang), or abbreviation-laden questions into technical search terms before vector embedding.

6. **Gemini Batch Structured Reranker & Document Diversity (Bonus Feature)**:
   - Evaluates Top 18-20 hybrid candidate chunks via a single structured batch call (`responseMimeType: 'application/json'`) scoring factual relevance (0.0 to 1.0) using document title, section heading, and content.
   - Enforces **Document Diversity** (maximum 2 chunks per document to prevent context cannibalization).
   - Enforces **Dynamic Thresholding** (drops irrelevant/noisy chunks below relevance threshold).

---

## 10. Automated Tests & Benchmark Verification

```bash
# 1. Run unit & integration test suites (26 passing tests across all packages)
pnpm test

# 2. Run automated RAG benchmark (Recall@5, MRR, Precision, Negative Abstention)
pnpm evaluate:retrieval

# 3. Build all packages & Next.js production bundle
pnpm build
```

---

## 11. Production & Cloud Deployment Guide (Railway / Docker)

The application is containerized with production-ready multi-stage Dockerfiles and self-migrating database routines.

### Option A: 1-Click Local / Server Production Run with Docker Compose
To run the full stack (PostgreSQL with pgvector, API server, and Next.js frontend) with a single command:

```bash
# Copy example environment variables
cp .env.example .env

# Fill in your GEMINI_API_KEY in .env, then run:
docker compose -f docker-compose.prod.yml up --build -d
```
- **Web Interface:** `http://localhost:3000`
- **Backend API:** `http://localhost:3001`
- **PostgreSQL pgvector:** `localhost:5432`

---

### Option B: Railway Cloud Deployment (Step-by-Step)

Railway provides native PostgreSQL + pgvector support and zero-config monorepo Docker deployment:

1. **Create a New Project on Railway**:
   - Go to [railway.app](https://railway.app) and create a new project.

2. **Add PostgreSQL Database**:
   - Click **+ New** -> **Database** -> **Add PostgreSQL**.
   - Under database settings or query editor, ensure pgvector is enabled (Railway enables it automatically).

3. **Deploy Backend API Service**:
   - Click **+ New** -> **GitHub Repo** -> select this repository.
   - Go to **Settings**:
     - **Dockerfile Path**: `Dockerfile.api` (or `apps/api/Dockerfile`)
   - Go to **Variables**:
     - `DATABASE_URL`: `${{Postgres.DATABASE_URL}}` (select Reference from PostgreSQL service)
     - `GEMINI_API_KEY`: `<YOUR_GOOGLE_GEMINI_API_KEY>`
     - `GEMINI_MODEL`: `gemini-3.5-flash-lite`
     - `EMBEDDING_MODEL`: `gemini-embedding-001`
     - `JWT_SECRET`: `<MINIMUM_32_CHARACTERS_SECRET>`
     - `JWT_REFRESH_SECRET`: `<MINIMUM_32_CHARACTERS_SECRET>`
     - `NODE_ENV`: `production`
   - Under **Networking**, click **Generate Domain** to get your public API URL (e.g. `https://rag-api-production.up.railway.app`).

4. **Deploy Frontend Web Service**:
   - Click **+ New** -> **GitHub Repo** -> select this repository.
   - Go to **Settings**:
     - **Dockerfile Path**: `Dockerfile.web` (or `apps/web/Dockerfile`)
   - Go to **Variables**:
     - `NEXT_PUBLIC_API_URL`: `<YOUR_RAILWAY_API_URL_FROM_STEP_3>` (e.g. `https://rag-api-production.up.railway.app`)
     - `NODE_ENV`: `production`
   - Under **Networking**, click **Generate Domain** to get your public Web URL (e.g. `https://rag-web-production.up.railway.app`).

5. **Zero-Touch Automatic Database Setup**:
   - The backend API automatically executes `CREATE EXTENSION IF NOT EXISTS vector;`, creates all relational and HNSW vector tables, and seeds default demo accounts (`admin@playablefactory.com` and `user@playablefactory.com`) and corpus files on first boot!

---

## 12. License

Proprietary case study implementation for Playable Factory evaluation.

