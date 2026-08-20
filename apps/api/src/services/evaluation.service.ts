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
    id: 'q1_spotify_apple_lufs',
    query: 'What are the integrated LUFS targets and true peak limits for Spotify vs Apple Music?',
    category: 'DAW & Mastering Specs',
    expectedDocuments: ['digital-audio-workstation-and-mastering-specs.md'],
    expectedKeywords: ['-14 LUFS', '-16 LUFS', '-1.0 dBTP', 'true peak'],
    isNegativeControl: false,
  },
  {
    id: 'q2_pro_rata_vs_user_centric',
    query: 'How does the pro-rata streaming royalty model work compared to the user-centric model?',
    category: 'Streaming Royalties',
    expectedDocuments: ['streaming-royalties-and-payouts.md'],
    expectedKeywords: ['market share', 'royalty bucket', 'user-centric', 'SoundCloud'],
    isNegativeControl: false,
  },
  {
    id: 'q3_dual_sync_licensing',
    query: 'What two licenses are required for a commercial sync placement in a film or TV show?',
    category: 'Sync & Licensing',
    expectedDocuments: ['music-licensing-and-sync-guide.md'],
    expectedKeywords: ['master use license', 'synchronization license', 'record label', 'music publisher'],
    isNegativeControl: false,
  },
  {
    id: 'q4_isrc_vs_iswc',
    query: 'What is the difference between an ISRC code and an ISWC code?',
    category: 'Metadata Standards',
    expectedDocuments: ['music-distribution-and-metadata-standards.md'],
    expectedKeywords: ['sound recording', 'musical composition', 'CC-XXX-YY-NNNNN', 'T-000000000-C'],
    isNegativeControl: false,
  },
  {
    id: 'q5_live_touring_deals',
    query: 'What is the difference between a flat guarantee and a door split in live touring performance contracts?',
    category: 'Live Touring',
    expectedDocuments: ['live-touring-and-performance-contracts.md'],
    expectedKeywords: ['flat fee', 'ticket sales revenue', 'door split', 'promoter'],
    isNegativeControl: false,
  },
  {
    id: 'q6_360_record_deals',
    query: 'What revenue streams does a record label participate in under a 360 deal?',
    category: 'Record Label Contracts',
    expectedDocuments: ['record-label-deals-and-contracts.md'],
    expectedKeywords: ['touring', 'merchandise', 'sync placement', 'master earnings'],
    isNegativeControl: false,
  },
  {
    id: 'q7_sample_clearance_master_publishing',
    query: 'What steps are required to legally clear a music sample from both master and publishing owners?',
    category: 'Copyright & Sampling',
    expectedDocuments: ['music-copyright-and-samplers-guide.md'],
    expectedKeywords: ['master sample clearance', 'publishing sample clearance', 'co-writing credit', 'royalty split'],
    isNegativeControl: false,
  },
  {
    id: 'q8_artist_release_timeline',
    query: 'What tasks must be completed 4 weeks before a music release date?',
    category: 'Release Rollout',
    expectedDocuments: ['artist-onboarding-and-release-checklist.md'],
    expectedKeywords: ['distributor upload', 'ISRC codes', 'PRO registration', 'MLC'],
    isNegativeControl: false,
  },
  {
    id: 'q9_turkish_spotify_lufs',
    query: 'spotify lufs sınırı kaç ve true peak ceiling ne kadar olmalı?',
    category: 'Turkish / Informal',
    expectedDocuments: ['digital-audio-workstation-and-mastering-specs.md'],
    expectedKeywords: ['-14 LUFS', '-1.0 dBTP'],
    isNegativeControl: false,
  },
  {
    id: 'q10_turkish_sync_lisans',
    query: 'dizilerde şarkı kullanmak için hangi iki lisansı almak gerekiyor?',
    category: 'Turkish / Informal',
    expectedDocuments: ['music-licensing-and-sync-guide.md'],
    expectedKeywords: ['master use', 'synchronization', 'sync'],
    isNegativeControl: false,
  },
  {
    id: 'q11_streaming_minimum_threshold',
    query: 'What is Spotify annual stream minimum threshold to qualify for royalties?',
    category: 'Streaming Royalties',
    expectedDocuments: ['streaming-royalties-and-payouts.md'],
    expectedKeywords: ['1,000 annual stream', 'royalty pool', 'short track'],
    isNegativeControl: false,
  },
  {
    id: 'q12_interpolation_vs_sampling',
    query: 'What is the difference between music sampling and musical interpolation?',
    category: 'Copyright & Sampling',
    expectedDocuments: ['music-copyright-and-samplers-guide.md'],
    expectedKeywords: ['re-recording', 'composition rights', 'master licensing fee'],
    isNegativeControl: false,
  },
  {
    id: 'q13_technical_sound_rider',
    query: 'What console and monitor specifications belong in a live performance technical rider?',
    category: 'Live Touring',
    expectedDocuments: ['live-touring-and-performance-contracts.md'],
    expectedKeywords: ['32-channel digital mixing console', 'In-Ear Monitor', 'IEM', 'stage plot'],
    isNegativeControl: false,
  },
  {
    id: 'q14_cover_art_metadata_specs',
    query: 'What are the resolution and format requirements for album cover art uploaded to distributors?',
    category: 'Metadata Standards',
    expectedDocuments: ['music-distribution-and-metadata-standards.md'],
    expectedKeywords: ['3000 x 3000 pixels', '1:1 square', 'RGB', 'JPEG or PNG'],
    isNegativeControl: false,
  },
  {
    id: 'q15_editorial_playlist_pitching',
    query: 'When must a track be submitted for Spotify editorial playlist pitching?',
    category: 'Release Rollout',
    expectedDocuments: ['artist-onboarding-and-release-checklist.md'],
    expectedKeywords: ['Spotify for Artists', '7 days', '21 days', 'editorial playlist'],
    isNegativeControl: false,
  },
  {
    id: 'q16_negative_control_vacation',
    query: 'What is the company annual vacation and sick leave policy?',
    category: 'Negative Control (Off-Corpus)',
    expectedDocuments: [],
    expectedKeywords: [],
    isNegativeControl: true,
  },
  {
    id: 'q17_negative_control_salaries',
    query: 'What are the software engineer salary bands and bonus structures?',
    category: 'Negative Control (Off-Corpus)',
    expectedDocuments: [],
    expectedKeywords: [],
    isNegativeControl: true,
  },
  {
    id: 'q18_negative_control_kubernetes',
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
