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

// In-code benchmark dataset ensuring zero missing-file errors in Docker / production environments
export const DEFAULT_BENCHMARK_ITEMS: BenchmarkItem[] = [
  {
    id: 'q1_turkish_onboarding',
    query: "new dev ilk hafta ne yapıyor lumen'da, bunu kim kontrol ediyor?",
    category: 'Turkish / Informal',
    expectedDocuments: ['onboarding-new-dev.md'],
    expectedKeywords: ['week 1', 'senior developer', 'shadow delivery', 'rebuilds'],
    isNegativeControl: false,
  },
  {
    id: 'q2_turkish_local_server',
    query: 'lumen local server olmadan niye patlıyor productionda?',
    category: 'Turkish / Informal',
    expectedDocuments: ['network-specs-applovin.md', 'qa-checklist.md', 'build-pipeline.md'],
    expectedKeywords: ['inlined', 'base64', 'outbound', 'runtime'],
    isNegativeControl: false,
  },
  {
    id: 'q3_applovin_size_limit',
    query: 'What is the maximum file size limit for AppLovin playable ads and how are assets packaged?',
    category: 'Ad Network Specs',
    expectedDocuments: ['network-specs-applovin.md'],
    expectedKeywords: ['5 mb', 'single-file html', 'base64'],
    isNegativeControl: false,
  },
  {
    id: 'q4_unity_meta_packaging',
    query: 'What is the packaging difference between Unity and Meta playable ads?',
    category: 'Ad Network Specs',
    expectedDocuments: ['network-specs-unity-meta.md'],
    expectedKeywords: ['zip', 'single html', 'index.html'],
    isNegativeControl: false,
  },
  {
    id: 'q5_sdk_v3_migration',
    query: 'How do I initialize Lumen SDK v3 and why was lumen.track removed?',
    category: 'SDK & APIs',
    expectedDocuments: ['sdk-notes-v3.md'],
    expectedKeywords: ['lumen.init', 'deprecated', 'lumen-sdk@3'],
    isNegativeControl: false,
  },
  {
    id: 'q6_audio_build_pipeline',
    query: 'Why are sound assets built in a separate pass in the build pipeline?',
    category: 'Build Pipeline',
    expectedDocuments: ['build-pipeline.md'],
    expectedKeywords: ['dedicated pass', 'nondeterministic', 'audio', 'size spikes'],
    isNegativeControl: false,
  },
  {
    id: 'q7_march_incident_postmortem',
    query: 'What was the root cause of the March 2026 delivery incident?',
    category: 'Incident Postmortems',
    expectedDocuments: ['incident-postmortem-2026-03.md'],
    expectedKeywords: ['audio compression', 'pipeline order', 'reverted'],
    isNegativeControl: false,
  },
  {
    id: 'q8_pre_delivery_qa',
    query: 'What checks must be passed on the pre-delivery QA checklist?',
    category: 'QA & Quality',
    expectedDocuments: ['qa-checklist.md'],
    expectedKeywords: ['orientation', 'offline', 'file size', 'cta'],
    isNegativeControl: false,
  },
  {
    id: 'q9_localization_languages',
    query: 'What are the required localization languages and what is the fallback behavior?',
    category: 'Localization',
    expectedDocuments: ['localization-guide.md', 'qa-checklist.md'],
    expectedKeywords: ['english fallback', 'minimum languages'],
    isNegativeControl: false,
  },
  {
    id: 'q10_onboarding_week_two',
    query: 'What does a new developer do during their second week?',
    category: 'Onboarding',
    expectedDocuments: ['onboarding-new-dev.md'],
    expectedKeywords: ['week 2', 'first real ticket', 'iteration', '3-day scope'],
    isNegativeControl: false,
  },
  {
    id: 'q11_staging_cdn_access',
    query: 'Who has production upload rights vs staging CDN access at Lumen?',
    category: 'Onboarding & Access',
    expectedDocuments: ['onboarding-new-dev.md'],
    expectedKeywords: ['staging cdn', 'platform team', 'producers'],
    isNegativeControl: false,
  },
  {
    id: 'q12_turkish_audio_compression',
    query: "ses dosyaları niye ayrı derleniyor build pipeline'da?",
    category: 'Turkish / Informal',
    expectedDocuments: ['build-pipeline.md'],
    expectedKeywords: ['sound assets', 'dedicated pass', 'audio'],
    isNegativeControl: false,
  },
  {
    id: 'q13_turkish_applovin_boyut',
    query: 'applovin boyut kaç mb ve zip mi html mi?',
    category: 'Turkish / Informal',
    expectedDocuments: ['network-specs-applovin.md'],
    expectedKeywords: ['5 mb', 'single html'],
    isNegativeControl: false,
  },
  {
    id: 'q14_analytics_taxonomy',
    query: 'What are the standard analytics events emitted by Lumen playables and when does load_complete fire?',
    category: 'Analytics & Tracking',
    expectedDocuments: ['analytics-events.md'],
    expectedKeywords: ['load_complete', 'first_interaction', 'loop_complete', 'cta_click'],
    isNegativeControl: false,
  },
  {
    id: 'q15_ui_style_guide_cta',
    query: 'What are the UI style guide rules for buttons, CTA contrast, and progress bars?',
    category: 'UI & Design Specs',
    expectedDocuments: ['style-guide-ui.md'],
    expectedKeywords: ['contrast', '4.5:1', 'dark scrim', 'progress', '20 seconds'],
    isNegativeControl: false,
  },
  {
    id: 'q16_creative_review_process',
    query: 'Who runs the delivery review before client release and why is it from a different pod?',
    category: 'Creative & Review Process',
    expectedDocuments: ['guides/review-process.md', 'review-process.md'],
    expectedKeywords: ['different pod', 'two internal reviews', 'staging cdn'],
    isNegativeControl: false,
  },
  {
    id: 'q17_analytics_leak_postmortem',
    query: 'Why was an AppLovin build rejected in November 2025 and how was the analytics leak fixed?',
    category: 'Incident Postmortems',
    expectedDocuments: ['postmortems/2025-11-analytics-leak.md', '2025-11-analytics-leak.md'],
    expectedKeywords: ['debug flag', 'outbound request', 'analytics buffer'],
    isNegativeControl: false,
  },
  {
    id: 'q18_negative_control_vacation',
    query: 'What is the company annual vacation and sick leave policy?',
    category: 'Negative Control (Off-Corpus)',
    expectedDocuments: [],
    expectedKeywords: [],
    isNegativeControl: true,
  },
  {
    id: 'q19_negative_control_salaries',
    query: 'What are the software engineer salary bands and bonus structures?',
    category: 'Negative Control (Off-Corpus)',
    expectedDocuments: [],
    expectedKeywords: [],
    isNegativeControl: true,
  },
  {
    id: 'q20_negative_control_kubernetes',
    query: 'How do we configure a Kubernetes ingress controller on AWS EKS?',
    category: 'Negative Control (Off-Corpus)',
    expectedDocuments: [],
    expectedKeywords: [],
    isNegativeControl: true,
  },
];

let inMemoryCachedReport: BenchmarkReport | null = null;

export const evaluationService = {
  getReportFilePath(): string {
    const dir = path.resolve(process.cwd(), '.rag_data');
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {}
    }
    return path.resolve(dir, 'benchmark_report.json');
  },

  getQueriesFilePath(): string {
    const candidates = [
      path.resolve(process.cwd(), 'apps/api/src/evaluation/benchmark-queries.json'),
      path.resolve(process.cwd(), 'src/evaluation/benchmark-queries.json'),
      path.resolve(__dirname, '../evaluation/benchmark-queries.json'),
      path.resolve(__dirname, '../../src/evaluation/benchmark-queries.json'),
    ];
    return candidates.find((c) => fs.existsSync(c)) || candidates[0];
  },

  async loadBenchmarkQueries(): Promise<BenchmarkItem[]> {
    const queriesPath = this.getQueriesFilePath();
    if (fs.existsSync(queriesPath)) {
      try {
        const raw = await fs.promises.readFile(queriesPath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (err) {
        console.warn('[EvaluationService] Error reading benchmark queries file, using embedded items:', err);
      }
    }
    return DEFAULT_BENCHMARK_ITEMS;
  },

  /**
   * Retrieves the latest cached benchmark evaluation report.
   */
  async getLatestReport(): Promise<BenchmarkReport | null> {
    if (inMemoryCachedReport) {
      return inMemoryCachedReport;
    }

    const reportPath = this.getReportFilePath();
    if (fs.existsSync(reportPath)) {
      try {
        const raw = await fs.promises.readFile(reportPath, 'utf-8');
        inMemoryCachedReport = JSON.parse(raw);
        return inMemoryCachedReport;
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
    const items = await this.loadBenchmarkQueries();
    const results: EvaluationItemResult[] = [];

    console.log(`[EvaluationService] 🚀 Starting live benchmark evaluation across ${items.length} scenarios...`);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

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

        const retrievedFilenames = chunks.map((c) => path.basename(c.filename));
        const answerSnippet = (ragResponse.answer || '').slice(0, 180).trim() + (ragResponse.answer?.length > 180 ? '...' : '');

        let recallAt5 = false;
        let hitRank: number | null = null;
        let reciprocalRank = 0;
        let abstentionPassed = false;

        if (item.isNegativeControl) {
          const isGrounded = ragResponse.isCorpusGrounded;
          const textLow = (ragResponse.answer || '').toLowerCase();
          const abstained =
            !isGrounded ||
            textLow.includes('does not contain') ||
            textLow.includes('not covered') ||
            textLow.includes('not available') ||
            textLow.includes('no information');

          abstentionPassed = abstained;
          recallAt5 = abstained;
          reciprocalRank = abstained ? 1.0 : 0.0;
        } else {
          for (let rank = 0; rank < retrievedFilenames.length; rank++) {
            const retrieved = retrievedFilenames[rank];
            const isMatch = item.expectedDocuments.some((exp) => {
              const expBase = path.basename(exp);
              return retrieved.includes(expBase) || expBase.includes(retrieved);
            });

            if (isMatch) {
              recallAt5 = true;
              hitRank = rank + 1;
              reciprocalRank = 1 / (rank + 1);
              break;
            }
          }
        }

        const itemResult: EvaluationItemResult = {
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

        results.push(itemResult);

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
                ? abstentionPassed
                  ? 'abstained'
                  : 'failed'
                : recallAt5
                ? 'passed'
                : 'miss',
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

      // Small throttle to stay safely within Gemini rate limits
      if (i < items.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

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

    inMemoryCachedReport = report;

    try {
      const reportPath = this.getReportFilePath();
      await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2), 'utf-8');
      console.log(`[EvaluationService] ✅ Benchmark report saved to: ${reportPath}`);
    } catch (saveErr) {
      console.warn('[EvaluationService] Note on report file save:', (saveErr as Error).message);
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
