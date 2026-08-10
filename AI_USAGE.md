# AI Usage & Engineering Log

This document records the interactions, architectural decisions, and error corrections made during the development of the Playable Factory RAG & Vector Search application.

---

## 1. Overview of AI Assistance

AI (Google Antigravity Agentic Pair Programmer with Gemini) was utilized collaboratively as a development accelerator for:
1. **Architecture Planning & Refinement**: Analyzing case study requirements from `PlayableFactory_AI_SE_Case_RAG.pdf`, structuring a scalable TypeScript monorepo layout, and revising the design to use Express.js + Next.js 14 App Router + PostgreSQL pgvector.
2. **Schema & Data Modeling**: Defining type-safe Drizzle ORM schemas for the 7 relational tables with `vector(768)` embedding columns.
3. **Core Services Implementation**: Writing the recursive semantic chunking algorithm with overlap, Google Gemini `text-embedding-004` embedding adapter, and Gemini 2.0 Flash grounded prompt engineering.
4. **Interactive Frontend Surfaces**: Creating the Chat interface with interactive citation modals and the Admin Operations Dashboard with telemetry charts.
5. **Model Context Protocol (MCP)**: Structuring the standalone stdio MCP server for tool integration with Claude Desktop / Cursor.
6. **Automated Evaluation Suite**: Building the benchmark test runner against all questions from `sample_dataset/sample_questions.md`.

---

## 2. Where AI Encountered Errors & How They Were Resolved

During the automated build and testing cycles, several real-world issues were identified and corrected:

### Issue 1: `pnpm` v11 Build Script Approvals (`[ERR_PNPM_IGNORED_BUILDS]`)
- **Problem**: `pnpm` v11 defaults to blocking native build scripts (e.g. `esbuild`, `bcrypt`) unless explicitly approved.
- **Root Cause**: Stricter security defaults in pnpm 11 in non-interactive CI/shell mode.
- **Resolution**: Configured `.npmrc` with `enable-pre-post-scripts=true`, added `pnpm.onlyBuiltDependencies` to `package.json`, and executed `pnpm approve-builds --all`.

### Issue 2: TypeScript TS2742 Inferred Type Portability on Express Routes
- **Problem**: `tsc` emitted `error TS2742: The inferred type of 'router' cannot be named without a reference to '@types/express-serve-static-core'`.
- **Root Cause**: When compiling TypeScript with `"declaration": true`, exporting inferred variables (`const router = Router()`) across package boundaries requires explicit typing.
- **Resolution**: Added explicit type annotations `const router: Router = Router();` and `export const app: Express = express();`.

### Issue 3: Discriminated Union Narrowing in `CitationModal.tsx`
- **Problem**: Next.js build failed with `Type error: Property 'metadata' does not exist on type 'Citation | SearchResult'`.
- **Root Cause**: `Citation` objects have flattened fields (`section`, `heading`), whereas `SearchResult` objects nest them under `metadata`.
- **Resolution**: Implemented type guards `const searchRes = 'metadata' in citation ? citation : null;` to safely access both shapes without runtime exceptions.

---

## 3. Human Oversight & Design Verification

Every generated component was systematically verified:
- ✅ **Unit & Integration Tests**: Executed via `vitest run` across `@rag/shared` and `@rag/api`.
- ✅ **Static Type Checking**: Validated across all monorepo workspaces via `tsc`.
- ✅ **Production Bundling**: Verified with `next build`, generating static prerendered routes with zero bundle warnings.
- ✅ **Hallucination Prevention**: Verified via the evaluation test suite against off-corpus negative questions.

---

## 4. Key Architectural Insights

- **Single Database Strategy**: Combining relational tables with vector columns in PostgreSQL 16 (`pgvector`) eliminated synchronization bugs that commonly occur between separate relational and vector databases.
- **Gemini Free Tier Advantage**: Moving to `gemini-2.0-flash` and `text-embedding-004` (768-dim) allowed the case study to achieve high-performance grounding with zero mandatory cloud expenses.
