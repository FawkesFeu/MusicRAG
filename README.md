# Music Industry - Full-Stack RAG & Vector Search System

> A production-grade, full-stack TypeScript Monorepo application that indexes document corpora into a vector database (PostgreSQL + pgvector), performs semantic hybrid retrieval, and generates strictly grounded answers with verifiable citations using Google Gemini 3.5 Flash-Lite and Google Embedding models.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-14.2-black.svg)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20+%20pgvector-336791.svg)](https://github.com/pgvector/pgvector)
[![LLM](https://img.shields.io/badge/LLM-Gemini%203.5%20Flash--Lite-orange.svg)](https://ai.google.dev/)
[![Embeddings](https://img.shields.io/badge/Embeddings-gemini--embedding--001%20(768d)-green.svg)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## 1. Project Description

This repository provides an end-to-end knowledge base retrieval and generation platform designed for music platforms, distributors, record labels, and audio engineering teams. It indexes streaming payout models, DAW audio mastering specs (LUFS, True Peak), sync licensing guides, metadata standards (ISRC, ISWC, UPC), live touring contract riders, 360 label deal mechanics, sample clearance procedures, and artist release checklists, providing grounded answers with interactive citations back to the source documents.

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

### Core Features
- ✅ **TypeScript Monorepo Architecture**: Clean package boundaries (`apps/web`, `apps/api`, `apps/mcp-server`, `packages/shared`).
- ✅ **Observable Ingestion Pipeline**: Recursive directory scanning, semantic chunking (`js-tiktoken`), checksum deduplication, and observable status tracking.
- ✅ **Semantic Search + Grounded RAG**: Multi-branch vector similarity + BM25 keyword search + strict anti-hallucination abstention.
- ✅ **Chat Page**: Clean conversational UI with real-time SSE streaming, token pacing, confidence metrics, and interactive citation popups.
- ✅ **Corpus & Analytics Dashboard**: File upload, deletion, re-index triggering, index health metrics, and query telemetry charts.
- ✅ **MCP Server for Search**: Model Context Protocol tool provider with full client configuration guide.
- ✅ **Authentication & Authorization (RBAC)**: JWT access/refresh token rotation, role guards (`admin` vs `user`), and Next.js edge middleware.
- ✅ **AI Usage Log**: Comprehensive `AI_USAGE.md` documenting human-AI collaboration, bug catches, and architectural decisions.

### Advanced Features
1. 🌟 **MCP Authentication via OIDC**: Full OpenID Connect Resource Server verification (`jose`) validating remote JWKS, `iss`, `aud`, `exp`, and `mcp:search` scopes.
2. 🌟 **Self-Updating Pipeline (File Watcher)**: Real-time `fs.watch` daemon monitoring `/corpus` for incremental indexing and automatic vector purging on file deletions.
3. 🌟 **Advanced Retrieval Quality**:
   - Multi-query decomposition & query rewriting for informal / colloquial queries.
   - Hybrid search: pgvector HNSW cosine distance + PostgreSQL `tsvector` BM25 full-text search.
   - Gemini Batch Structured Reranker with dynamic relevance filtering.
   - Document Diversity constraint (max 2 chunks per doc) to eliminate context cannibalization.
4. 🌟 **Empirical RAG Evaluation Suite**: Interactive benchmark engine measuring Recall@5, Hit@1, MRR, and Negative Abstention with real-time SSE execution and instant JSON export.
5. 🌟 **Streaming Answers & UI Polish**: Harf-harf SSE token streaming, smooth typography, responsive mobile hamburger drawer, and 1-tap quick navigation tabs.
6. 🌟 **User Management & Token Invitations**: Admin user management modal with cryptographic invitation links (`/register?inviteToken=...`), role promotion/demotion, and active user revocation.

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

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` in the root directory:
```bash
cp .env.example .env
```
Fill in your `GEMINI_API_KEY`:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### Step 3: Run Seed & Development Servers
```bash
# Seed database with sample music dataset corpus
pnpm db:seed

# Start API and Web servers concurrently
pnpm dev:all
```
- **Web App**: `http://localhost:3000`
- **API Server**: `http://localhost:8080` (or `3001`)

---

## 5. Sample Dataset Corpus

The default corpus located in `sample_dataset/corpus/` includes 8 detailed Markdown documents covering the Music Industry domain:

1. `streaming-royalties-and-payouts.md`: Spotify/Apple/Tidal royalty formulas, pro-rata vs. user-centric models, master vs. publishing splits, PROs, and minimum stream thresholds.
2. `music-licensing-and-sync-guide.md`: Commercial sync placement, Master Use License, Synchronization License, MFN clauses, and cue sheet submissions.
3. `digital-audio-workstation-and-mastering-specs.md`: DAW export resolution, 24-bit/44.1kHz standards, integrated LUFS targets (Spotify -14 LUFS, Apple -16 LUFS), and true peak ceilings (-1.0 dBTP).
4. `music-distribution-and-metadata-standards.md`: ISRC, ISWC, and UPC identifier specifications, mandatory metadata fields, DDEX ingestion, and album art specs.
5. `live-touring-and-performance-contracts.md`: Flat guarantees, door splits, 32-channel technical riders, IEM specifications, and force majeure clauses.
6. `record-label-deals-and-contracts.md`: Major vs. indie label structures, 360 deal revenue participation, profit splits, advance recoupment, and cross-collateralization.
7. `music-copyright-and-samplers-guide.md`: Circle-C vs Circle-P copyrights, master/publishing sample clearances, interpolations vs sampling, and AI music eligibility.
8. `artist-onboarding-and-release-checklist.md`: 6-week rollout timeline, Spotify for Artists pitching, pre-save campaigns, and post-release analytics tracking.

---

## 6. Model Context Protocol (MCP) Server

The repository includes a dedicated MCP server in `apps/mcp-server` for integration with desktop AI tools (Claude Desktop, Cursor, Cline).

### Connecting to Claude Desktop
Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "music-rag": {
      "command": "node",
      "args": ["/path/to/PlayableFactoryCaseStudy/apps/mcp-server/dist/server.js"],
      "env": {
        "API_URL": "http://localhost:8080",
        "MCP_API_TOKEN": "mcp-secret-token-rag-2026"
      }
    }
  }
}
```

---

## 7. Search & Grounded RAG Endpoints

### Query the Corpus
- `POST /api/search`
  ```json
  // Request
  {
    "query": "What are the integrated LUFS targets for Spotify vs Apple Music?",
    "topK": 5,
    "generateAnswer": true
  }
  
  // Response
  {
    "success": true,
    "data": {
      "query": "What are the integrated LUFS targets for Spotify vs Apple Music?",
      "answer": "According to [Source 1], Spotify targets an integrated loudness of -14 LUFS with a -1.0 dBTP true peak limit, whereas Apple Music targets -16 LUFS...",
      "citations": [
        {
          "sourceIndex": 1,
          "documentTitle": "DIGITAL AUDIO WORKSTATION AND MASTERING SPECS",
          "filename": "digital-audio-workstation-and-mastering-specs.md",
          "content": "Spotify: -14 LUFS | -1.0 dBTP peak limit. Apple Music: -16 LUFS | -1.0 dBTP...",
          "section": "Integrated Loudness Targets (LUFS)"
        }
      ],
      "confidence": 0.95,
      "executionTimeMs": 380,
      "isCorpusGrounded": true
    }
  }
  ```

---

## 8. Key Design Decisions

1. **PostgreSQL + pgvector (768-dim)**:
   - Storing relational metadata alongside vector embeddings in a single database prevents synchronization drift and simplifies deployment.
   - HNSW indexing delivers sub-10ms cosine similarity retrieval with zero external SaaS dependencies.

2. **Google Gemini 3.5 Flash-Lite & Google Embedding Model**:
   - `gemini-embedding-001` generates dense 768-dimensional embeddings leading MTEB retrieval benchmarks.
   - Gemini 3.5 Flash-Lite provides state-of-the-art grounded reasoning, ultra-fast token streaming, and strict adherence to negative abstention instructions.

3. **Recursive Semantic Chunking**:
   - Splits content on markdown headers (`#`, `##`, `###`), double newlines, and sentence boundaries with `js-tiktoken`.
   - Overlap of 50 tokens prevents query intent from falling between chunk boundaries.

4. **Multi-Branch Hybrid Retrieval & Cross-Encoder Reranking**:
   - Combines dense vector similarity with BM25 full-text tsvector search.
   - Query rewriter decomposes informal or multi-lingual questions into canonical technical search terms.
   - Gemini structured batch reranker evaluates candidate chunks with document diversity constraints.

---

## 9. Automated Tests & Quality Assurance

```bash
# 1. Run unit & integration test suites
pnpm test

# 2. Run automated RAG evaluation benchmark
pnpm evaluate

# 3. Type check and verify production builds
pnpm -r build
```

---

## 10. License

This project is licensed under the [MIT License](LICENSE).
