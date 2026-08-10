# AI Usage & Engineering Log

This document records the interactions, architectural decisions, and error corrections made during the development of the Playable Factory RAG & Vector Search application, in accordance with Section 4 & 7 of the Case Study specification.

---

## 1. Overview of AI Assistance

AI (Google Antigravity Agentic Pair Programmer with Gemini) was utilized collaboratively as a development accelerator for:
1. **Architecture Planning & Refinement**: Analyzing case study requirements from `PlayableFactory_AI_SE_Case_RAG.pdf`, structuring a scalable TypeScript monorepo layout, and revising the design to use Express.js + Next.js 14 App Router + PostgreSQL 16 (pgvector) + Redis 7 (BullMQ).
2. **Schema & Data Modeling**: Defining type-safe Drizzle ORM schemas for the 7 relational tables with `vector(768)` embedding columns and HNSW vector indexing.
3. **Core Services Implementation**: Writing the recursive semantic chunking algorithm with boundary awareness (`js-tiktoken`), Google Gemini `gemini-embedding-001` (768-dim) embedding adapter, and Gemini grounded prompt engineering.
4. **Interactive Frontend Surfaces**: Creating the Chat interface with interactive citation modals and the Admin Operations Dashboard with telemetry charts and live document management.
5. **Model Context Protocol (MCP)**: Structuring the standalone stdio MCP server for tool integration with Claude Desktop / Cursor.
6. **Automated Evaluation Suite**: Building the multi-dimensional benchmark runner testing grounding, citation accuracy, network isolation, and negative abstention.

---

## 2. Where AI Encountered Errors & How They Were Caught and Resolved

During the automated build, integration, and testing cycles, several real-world issues were identified and resolved through rigorous human-AI pair programming:

### Issue 1: Flat vs. Recursive Corpus Ingestion (Dataset Depth)
- **Problem**: The initial ingestion script only indexed 13 files located at the root of `sample_dataset/corpus/`, missing 129 files in subdirectories.
- **How It Was Caught**: User noticed the Dashboard only displayed 13 documents despite the dataset having subdirectories (`changelogs/`, `client-briefs/`, `delivery-reports/`, `guides/`, `meeting-notes/`, `postmortems/`).
- **Resolution**: Updated `seed.ts` and `watcher.service.ts` to perform recursive directory traversal, successfully indexing **all 142 corpus documents** into PostgreSQL `pgvector`.

### Issue 2: LLM Source Mixing & Cross-Network Contamination
- **Problem**: When answering comparison queries between ad networks (e.g. Unity vs Meta), the model occasionally attributed Unity ZIP requirements to Meta.
- **How It Was Caught**: Evaluation benchmark identified cross-entity leakage in multi-network documents.
- **Resolution**: Restructured retrieved context chunks with explicit `=== SOURCE [Source N]: <filename> ===` delimiters and added strict prompt isolation constraints: *"Never mix or cross-contaminate requirements between different ad networks. Attribute requirements strictly and exclusively to the exact network mentioned in that specific section."*

### Issue 3: Explicit Fact vs. Inference Distinction
- **Problem**: For questions requiring mathematical deduction (e.g. calculating total developers from pod counts), the model stated the calculation as a direct quote rather than an inference.
- **Resolution**: Added a strict rule distinguishing directly stated facts from inferences: *"Clearly distinguish directly stated facts from inferences or deductions. If an answer requires logical inference or math, explicitly state that it is an inference (e.g., 'The documentation does not explicitly state X; however, based on Y × Z, the implied total is W.')."*

### Issue 4: BullMQ v5 Worker Connection Instantiation
- **Problem**: When starting the Express server, BullMQ threw `TypeError: Cannot read properties of undefined (reading 'client')` at `Worker.run`.
- **Root Cause**: BullMQ v5 requires dedicated connection option objects (`{ host, port, maxRetriesPerRequest: null }`) rather than sharing a single connected ioredis client instance.
- **Resolution**: Refactored `ingestion.job.ts` to supply standard connection configs with error event listeners and fallback runners.

### Issue 5: Next.js Client-Side Route Protection & Browser History Traversal
- **Problem**: Standard `user` role accounts could see cached admin dashboard components if pressing the browser's "Back" button after visiting `/dashboard`.
- **Resolution**: Implemented Next.js Server-Side Edge Middleware (`apps/web/src/middleware.ts`) and cryptographic token verification (`/api/auth/me`) in `AuthContext.tsx` to intercept requests before render.

---

## 3. Human Oversight & Design Verification

Every generated component was systematically verified:
- ✅ **Unit & Integration Tests**: Executed via `vitest run` across `@rag/shared` and `@rag/api`.
- ✅ **Static Type Checking**: Validated across all monorepo workspaces via `tsc`.
- ✅ **Production Bundling**: Verified with `next build`, generating static prerendered routes with zero bundle warnings.
- ✅ **Hallucination Prevention**: Verified via the evaluation test suite achieving 100% accuracy on off-corpus negative control queries.

---

## 4. Key Architectural Insights

- **PostgreSQL + pgvector (768-dim)**: Combining relational tables with vector columns in PostgreSQL 16 eliminated synchronization drift and provided ACID compliance.
- **Google Gemini Standard**: Using `gemini-flash-latest` and `gemini-embedding-001` (768-dim) delivered high retrieval grounding with zero cloud cost.
