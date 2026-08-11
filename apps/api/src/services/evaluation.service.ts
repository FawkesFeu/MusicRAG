import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { searchService } from './search.service.js';
import { ragService } from './rag.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface BenchmarkItem {
  id: string;
  query: string;
  category: string;
  expectedDocuments: string[];
  expectedKeywords: string[];
  isNegativeControl: boolean;
}

export interface EvaluationItemResult {
  id: string;
  category: string;
  query: string;
  retrievedDocs: string[];
  hitRank: number | null;
  recallAt5: boolean;
  reciprocalRank: number;
  isNegativeControl: boolean;
  abstentionPassed: boolean;
  latencyMs: number;
  answerSnippet: string;
}

export interface BenchmarkReport {
  timestamp: string;
  metrics: {
    totalQueries: number;
    meanRecallAt5: string;
    meanReciprocalRank: string;
    hitAt1Rate: string;
    negativeAbstentionRate: string;
    averageLatencyMs: number;
    rawMetrics: {
      recallAt5Percentage: number;
      hitAt1Percentage: number;
      mrrScore: number;
      abstentionPercentage: number;
    };
  };
  results: EvaluationItemResult[];
}

export interface BenchmarkProgressEvent {
  type: 'scenario_start' | 'scenario_complete' | 'benchmark_complete' | 'error';
  currentIndex?: number;
  total?: number;
  scenario?: {
    id: string;
    category: string;
    query: string;
    status: 'evaluating' | 'passed' | 'miss' | 'abstained' | 'failed';
    recallAt5?: boolean;
    hitRank?: number | null;
    retrievedDocs?: string[];
    answerSnippet?: string;
    latencyMs?: number;
  };
  report?: BenchmarkReport;
  error?: string;
}

export const evaluationService = {
  getReportFilePath(): string {
    return path.resolve(__dirname, '../evaluation/benchmark_report.json');
  },

  getQueriesFilePath(): string {
    return path.resolve(__dirname, '../evaluation/benchmark-queries.json');
  },

  /**
   * Retrieves the latest cached benchmark evaluation report.
   */
  async getLatestReport(): Promise<BenchmarkReport | null> {
    const reportPath = this.getReportFilePath();
    if (fs.existsSync(reportPath)) {
      try {
        const raw = await fs.promises.readFile(reportPath, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('[EvaluationService] Error reading benchmark report:', err);
      }
    }
    return null;
  },

  /**
   * Runs the complete evaluation suite across all benchmark scenarios,
   * emitting progress events for live UX streaming.
   */
  async runBenchmarkStream(onProgress?: (event: BenchmarkProgressEvent) => void): Promise<BenchmarkReport> {
    const queriesPath = this.getQueriesFilePath();
    if (!fs.existsSync(queriesPath)) {
      throw new Error(`Benchmark queries file not found at: ${queriesPath}`);
    }

    const items: BenchmarkItem[] = JSON.parse(await fs.promises.readFile(queriesPath, 'utf-8'));
    const results: EvaluationItemResult[] = [];

    console.log(`[EvaluationService] 🚀 Starting live benchmark evaluation across ${items.length} scenarios...`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      // Emit scenario start event
      if (onProgress) {
        onProgress({
          type: 'scenario_start',
          currentIndex: i + 1,
          total: items.length,
          scenario: {
            id: item.id,
            category: item.category,
            query: item.query,
            status: 'evaluating',
          },
        });
      }

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
          // Negative control: should abstain honestly with no fake citations
          abstentionPassed = !ragResponse.isCorpusGrounded || ragResponse.citations.length === 0;
        }

        const answerSnippet = ragResponse.answer.slice(0, 140).replace(/\n/g, ' ');

        const evalResult: EvaluationItemResult = {
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
          answerSnippet,
        };

        results.push(evalResult);

        // Emit scenario complete event
        if (onProgress) {
          onProgress({
            type: 'scenario_complete',
            currentIndex: i + 1,
            total: items.length,
            scenario: {
              id: item.id,
              category: item.category,
              query: item.query,
              status: item.isNegativeControl
                ? (abstentionPassed ? 'abstained' : 'failed')
                : (recallAt5 ? 'passed' : 'miss'),
              recallAt5,
              hitRank,
              retrievedDocs: retrievedFilenames,
              answerSnippet,
              latencyMs,
            },
          });
        }
      } catch (err: any) {
        console.error(`[EvaluationService] Error on query "${item.id}":`, err.message);
        const failResult: EvaluationItemResult = {
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
        };
        results.push(failResult);

        if (onProgress) {
          onProgress({
            type: 'scenario_complete',
            currentIndex: i + 1,
            total: items.length,
            scenario: {
              id: item.id,
              category: item.category,
              query: item.query,
              status: 'failed',
              recallAt5: false,
              hitRank: null,
              retrievedDocs: [],
              answerSnippet: `Error: ${err.message}`,
              latencyMs: Date.now() - startTime,
            },
          });
        }
      }

      // 1.2s pacing between questions to safeguard API quotas
      if (i < items.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }

    // Compute aggregated metrics
    const factualItems = results.filter((r) => !r.isNegativeControl);
    const negativeItems = results.filter((r) => r.isNegativeControl);

    const recallCount = factualItems.filter((r) => r.recallAt5).length;
    const meanRecallAt5 = factualItems.length > 0 ? (recallCount / factualItems.length) * 100 : 0;

    const totalRR = factualItems.reduce((acc, r) => acc + r.reciprocalRank, 0);
    const mrr = factualItems.length > 0 ? totalRR / factualItems.length : 0;

    const hitAt1Count = factualItems.filter((r) => r.hitRank === 1).length;
    const hitAt1Rate = factualItems.length > 0 ? (hitAt1Count / factualItems.length) * 100 : 0;

    const abstentionCount = negativeItems.filter((r) => r.abstentionPassed).length;
    const abstentionRate = negativeItems.length > 0 ? (abstentionCount / negativeItems.length) * 100 : 100;

    const avgLatency = results.length > 0 ? results.reduce((acc, r) => acc + r.latencyMs, 0) / results.length : 0;

    const report: BenchmarkReport = {
      timestamp: new Date().toISOString(),
      metrics: {
        totalQueries: results.length,
        meanRecallAt5: `${meanRecallAt5.toFixed(1)}%`,
        meanReciprocalRank: mrr.toFixed(3),
        hitAt1Rate: `${hitAt1Rate.toFixed(1)}%`,
        negativeAbstentionRate: `${abstentionRate.toFixed(1)}%`,
        averageLatencyMs: Math.round(avgLatency),
        rawMetrics: {
          recallAt5Percentage: Number(meanRecallAt5.toFixed(1)),
          hitAt1Percentage: Number(hitAt1Rate.toFixed(1)),
          mrrScore: Number(mrr.toFixed(3)),
          abstentionPercentage: Number(abstentionRate.toFixed(1)),
        },
      },
      results,
    };

    // Save to report file
    try {
      const reportPath = this.getReportFilePath();
      await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      console.log(`[EvaluationService] ✅ Benchmark report saved to: ${reportPath}`);
    } catch (saveErr) {
      console.error('[EvaluationService] Failed to persist report file:', saveErr);
    }

    if (onProgress) {
      onProgress({
        type: 'benchmark_complete',
        report,
      });
    }

    return report;
  },

  async runBenchmark(): Promise<BenchmarkReport> {
    return this.runBenchmarkStream();
  },
};
