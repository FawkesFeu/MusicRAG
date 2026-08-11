import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchService } from '../services/search.service.js';
import { ragService } from '../services/rag.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface BenchmarkItem {
  id: string;
  query: string;
  category: string;
  expectedDocuments: string[];
  expectedKeywords: string[];
  isNegativeControl: boolean;
}

interface EvaluationResult {
  id: string;
  category: string;
  query: string;
  retrievedDocs: string[];
  hitRank: number | null; // 1-based rank of first expected doc
  recallAt5: boolean;
  reciprocalRank: number;
  isNegativeControl: boolean;
  abstentionPassed: boolean;
  latencyMs: number;
  answerSnippet: string;
}

async function runRetrievalBenchmark() {
  console.log('\n======================================================================');
  console.log('🚀 RUNNING RAG RETRIEVAL & GROUNDING BENCHMARK (16 Test Scenarios)');
  console.log('======================================================================\n');

  const benchmarkPath = path.join(__dirname, 'benchmark-queries.json');
  const items: BenchmarkItem[] = JSON.parse(fs.readFileSync(benchmarkPath, 'utf-8'));

  const results: EvaluationResult[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    console.log(`[${i + 1}/${items.length}] Testing: "${item.query}" (${item.category})...`);

    const startTime = Date.now();

    try {
      const chunks = await searchService.search(item.query, {
        topK: 5,
        useHybrid: true,
        useRewriting: true,
        useReranking: true,
      });

      const ragResponse = await ragService.generateAnswer(item.query, chunks);
      const latencyMs = Date.now() - startTime;

      const retrievedFilenames = chunks.map((c) => c.filename);

      let hitRank: number | null = null;
      let recallAt5 = false;
      let reciprocalRank = 0;
      let abstentionPassed = true;

      if (!item.isNegativeControl) {
        for (let r = 0; r < retrievedFilenames.length; r++) {
          const fn = retrievedFilenames[r];
          if (item.expectedDocuments.some((exp) => fn.toLowerCase().includes(exp.toLowerCase()))) {
            hitRank = r + 1;
            recallAt5 = true;
            reciprocalRank = 1 / hitRank;
            break;
          }
        }
      } else {
        // Negative control: should abstain honestly
        abstentionPassed = !ragResponse.isCorpusGrounded || ragResponse.citations.length === 0;
      }

      results.push({
        id: item.id,
        category: item.category,
        query: item.query,
        retrievedDocs: retrievedFilenames,
        hitRank,
        recallAt5,
        reciprocalRank,
        isNegativeControl: item.isNegativeControl,
        abstentionPassed,
        latencyMs,
        answerSnippet: ragResponse.answer.slice(0, 100).replace(/\n/g, ' '),
      });
    } catch (err: any) {
      console.error(`  ❌ Error evaluating query: ${err.message}`);
      results.push({
        id: item.id,
        category: item.category,
        query: item.query,
        retrievedDocs: [],
        hitRank: null,
        recallAt5: false,
        reciprocalRank: 0,
        isNegativeControl: item.isNegativeControl,
        abstentionPassed: false,
        latencyMs: Date.now() - startTime,
        answerSnippet: `Error: ${err.message}`,
      });
    }

    // Pacing delay to stay cleanly within API quotas
    if (i < items.length - 1) {
      await new Promise((r) => setTimeout(r, 1600));
    }
  }

  // ── Calculate Summary Metrics ──
  const factualItems = results.filter((r) => !r.isNegativeControl);
  const negativeItems = results.filter((r) => r.isNegativeControl);

  const recallCount = factualItems.filter((r) => r.recallAt5).length;
  const meanRecallAt5 = (recallCount / factualItems.length) * 100;

  const totalRR = factualItems.reduce((acc, r) => acc + r.reciprocalRank, 0);
  const mrr = totalRR / factualItems.length;

  const hitAt1Count = factualItems.filter((r) => r.hitRank === 1).length;
  const hitAt1Rate = (hitAt1Count / factualItems.length) * 100;

  const abstentionCount = negativeItems.filter((r) => r.abstentionPassed).length;
  const abstentionRate = (abstentionCount / negativeItems.length) * 100;

  const avgLatency = results.reduce((acc, r) => acc + r.latencyMs, 0) / results.length;

  console.log('\n==================== BENCHMARK RESULTS SUMMARY ====================');
  console.log(`📊 Total Queries Evaluated: ${results.length}`);
  console.log(`🎯 Factual Recall@5:        ${meanRecallAt5.toFixed(1)}% (${recallCount}/${factualItems.length})`);
  console.log(`🥇 Hit@1 Accuracy:          ${hitAt1Rate.toFixed(1)}% (${hitAt1Count}/${factualItems.length})`);
  console.log(`📈 Mean Reciprocal Rank:    ${mrr.toFixed(3)}`);
  console.log(`🛡️ Negative Abstention:    ${abstentionRate.toFixed(1)}% (${abstentionCount}/${negativeItems.length})`);
  console.log(`⚡ Mean Latency:            ${avgLatency.toFixed(0)}ms`);
  console.log('===================================================================\n');

  // Detailed breakdown table
  console.table(
    results.map((r) => ({
      ID: r.id,
      Category: r.category,
      'Recall@5': r.isNegativeControl ? 'N/A (Neg)' : r.recallAt5 ? '✅ YES' : '❌ NO',
      Rank: r.isNegativeControl ? '-' : r.hitRank ? `#${r.hitRank}` : 'Miss',
      Abstention: r.isNegativeControl ? (r.abstentionPassed ? '✅ Passed' : '❌ Failed') : '-',
      'Latency (ms)': r.latencyMs,
    }))
  );

  const outReportPath = path.join(__dirname, 'benchmark_report.json');
  fs.writeFileSync(
    outReportPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        metrics: {
          totalQueries: results.length,
          meanRecallAt5: `${meanRecallAt5.toFixed(1)}%`,
          meanReciprocalRank: mrr.toFixed(3),
          hitAt1Rate: `${hitAt1Rate.toFixed(1)}%`,
          negativeAbstentionRate: `${abstentionRate.toFixed(1)}%`,
          averageLatencyMs: Math.round(avgLatency),
        },
        results,
      },
      null,
      2
    )
  );

  console.log(`\n📁 Full JSON benchmark report saved to: ${outReportPath}\n`);
}

runRetrievalBenchmark().catch((err) => {
  console.error('Benchmark runner fatal error:', err);
  process.exit(1);
});
