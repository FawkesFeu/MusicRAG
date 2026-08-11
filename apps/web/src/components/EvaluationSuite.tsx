'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Play,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  Target,
  Award,
  ShieldCheck,
  TrendingUp,
  Activity,
  Layers,
  Search,
  ChevronDown,
  ChevronUp,
  Terminal,
  Radio,
  FileCode2,
  Check,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { apiClient, getAuthToken, getApiBaseUrl } from '../lib/api-client';

interface EvaluationItemResult {
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

interface BenchmarkReport {
  timestamp: string;
  metrics: {
    totalQueries: number;
    meanRecallAt5: string;
    meanReciprocalRank: string;
    hitAt1Rate: string;
    negativeAbstentionRate: string;
    averageLatencyMs: number;
  };
  results: EvaluationItemResult[];
}

interface LiveLogItem {
  id: string;
  index: number;
  total: number;
  query: string;
  category: string;
  status: 'evaluating' | 'passed' | 'miss' | 'abstained' | 'failed';
  hitRank?: number | null;
  latencyMs?: number;
  answerSnippet?: string;
  retrievedDocs?: string[];
}

interface EvaluationSuiteProps {
  report: BenchmarkReport | null;
  evaluating: boolean;
  onRunBenchmark: () => Promise<void>;
  onDownloadReport: () => void;
}

export function EvaluationSuite({
  report: initialReport,
  evaluating: externalEvaluating,
  onDownloadReport,
}: EvaluationSuiteProps) {
  const [report, setReport] = useState<BenchmarkReport | null>(initialReport);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [currentScenario, setCurrentScenario] = useState<{
    index: number;
    total: number;
    query: string;
    category: string;
  } | null>(null);
  const [liveLogs, setLiveLogs] = useState<LiveLogItem[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (initialReport) {
      setReport(initialReport);
    }
  }, [initialReport]);

  // Auto-scroll live logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [liveLogs, currentScenario]);

  const runLiveStreamingBenchmark = async () => {
    try {
      setIsEvaluating(true);
      setShowConsole(true);
      setLiveLogs([]);
      setCurrentScenario(null);

      const baseUrl = getApiBaseUrl();
      const token = getAuthToken();

      const response = await fetch(`${baseUrl}/api/evaluation/stream`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        },
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('ReadableStream not supported');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            try {
              const event = JSON.parse(trimmed.slice(6));

              if (event.type === 'scenario_start') {
                setCurrentScenario({
                  index: event.currentIndex,
                  total: event.total,
                  query: event.scenario.query,
                  category: event.scenario.category,
                });
              } else if (event.type === 'scenario_complete') {
                const s = event.scenario;
                setLiveLogs((prev) => [
                  ...prev,
                  {
                    id: s.id,
                    index: event.currentIndex,
                    total: event.total,
                    query: s.query,
                    category: s.category,
                    status: s.status,
                    hitRank: s.hitRank,
                    latencyMs: s.latencyMs,
                    answerSnippet: s.answerSnippet,
                    retrievedDocs: s.retrievedDocs,
                  },
                ]);
              } else if (event.type === 'benchmark_complete') {
                if (event.report) {
                  setReport(event.report);
                }
                setCurrentScenario(null);
              } else if (event.type === 'error') {
                console.error('Benchmark server error event:', event.error);
                setLiveLogs((prev) => [
                  ...prev,
                  {
                    id: `err-${Date.now()}`,
                    index: prev.length + 1,
                    total: 20,
                    query: 'Benchmark Error',
                    category: 'System',
                    status: 'failed',
                    answerSnippet: event.error || 'An error occurred during evaluation',
                  },
                ]);
              }
            } catch (err) {
              console.error('Error parsing SSE event chunk:', err);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Streaming benchmark failed:', err);
      // Fallback to standard HTTP run
      try {
        const res = await apiClient.post('/api/evaluation/run');
        setReport(res);
      } catch (fallbackErr) {
        console.error('Fallback benchmark also failed:', fallbackErr);
      }
    } finally {
      setIsEvaluating(false);
      setCurrentScenario(null);
    }
  };

  const categories = report
    ? ['all', ...Array.from(new Set(report.results.map((r) => r.category)))]
    : ['all'];

  const filteredResults = report
    ? report.results.filter((r) => {
        const matchesCat = selectedCategory === 'all' || r.category === selectedCategory;
        const matchesQuery =
          !searchFilter ||
          r.query.toLowerCase().includes(searchFilter.toLowerCase()) ||
          r.id.toLowerCase().includes(searchFilter.toLowerCase());
        return matchesCat && matchesQuery;
      })
    : [];

  const completedCount = liveLogs.length;
  const progressPercent = currentScenario
    ? Math.round((completedCount / currentScenario.total) * 100)
    : isEvaluating
    ? 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl glass-panel p-6 border border-dark-border flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-400" />
              <span>RAG Retrieval & Grounding Benchmark Suite</span>
            </h2>
            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/30 px-3 py-0.5 text-xs font-semibold text-emerald-300">
              20 Test Scenarios
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Automated empirical evaluation measuring Multi-Branch Recall@5, Hit@1 Accuracy, MRR, and Anti-Hallucination Negative Abstention.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onDownloadReport}
            disabled={!report || isEvaluating}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4 text-slate-400" />
            <span>Export JSON</span>
          </button>

          <button
            onClick={runLiveStreamingBenchmark}
            disabled={isEvaluating}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs shadow-glow-brand transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isEvaluating ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Running ({completedCount}/20)...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>Run Live Benchmark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ================= LIVE BENCHMARK EXECUTION CONSOLE ================= */}
      {(isEvaluating || showConsole) && (
        <div className="rounded-2xl glass-panel border border-brand-500/30 bg-dark-bg/95 overflow-hidden shadow-2xl transition-all">
          {/* Console Header */}
          <div className="p-4 bg-dark-card/90 border-b border-dark-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-mono text-[11px] text-slate-300">
                <Terminal className="h-3.5 w-3.5 text-brand-400" />
                <span>Live Evaluation Stream</span>
              </div>

              {isEvaluating ? (
                <div className="flex items-center gap-2 text-xs text-amber-300">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <span>Executing live pipeline test...</span>
                </div>
              ) : (
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Evaluation Completed</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-slate-400">
                Progress: <strong className="text-white">{completedCount}</strong> / 20 ({progressPercent}%)
              </span>
              <button
                onClick={() => setShowConsole(!showConsole)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                {showConsole ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-800 h-1.5">
            <div
              className="bg-brand-500 h-1.5 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Active Question Spotlight */}
          {currentScenario && isEvaluating && (
            <div className="px-5 py-3 bg-brand-500/10 border-b border-brand-500/20 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className="h-3.5 w-3.5 rounded-full border-2 border-brand-400 border-t-transparent animate-spin shrink-0" />
                <span className="text-brand-300 font-mono shrink-0">
                  [{currentScenario.index}/{currentScenario.total}]
                </span>
                <span className="text-slate-200 font-medium truncate">
                  &ldquo;{currentScenario.query}&rdquo;
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-brand-500/20 text-brand-300 text-[10px] uppercase font-bold shrink-0">
                {currentScenario.category}
              </span>
            </div>
          )}

          {/* Live Stream Activity Feed */}
          {showConsole && (
            <div
              ref={logContainerRef}
              className="p-4 max-h-72 overflow-y-auto space-y-2 font-sans text-xs scrollbar-thin scrollbar-thumb-slate-700"
            >
              {liveLogs.length === 0 && isEvaluating && (
                <div className="text-slate-500 italic py-4 text-center">
                  Initializing RAG retrieval and embedding pipeline...
                </div>
              )}

              {liveLogs.map((log) => {
                const isPass = log.status === 'passed' || log.status === 'abstained';
                return (
                  <div
                    key={log.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col gap-1.5 ${
                      isPass
                        ? 'bg-dark-card/60 border-slate-800 hover:border-slate-700'
                        : 'bg-red-500/10 border-red-500/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-mono text-slate-500 text-[11px] shrink-0">
                          [{log.index}/{log.total}]
                        </span>

                        {log.status === 'passed' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold shrink-0">
                            <Check className="h-3 w-3" />
                            <span>PASS {log.hitRank ? `(Rank #${log.hitRank})` : ''}</span>
                          </span>
                        )}

                        {log.status === 'abstained' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[11px] font-bold shrink-0">
                            <ShieldCheck className="h-3 w-3" />
                            <span>ABSTAINED (Zero Hallucination)</span>
                          </span>
                        )}

                        {log.status === 'miss' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/15 text-red-300 border border-red-500/30 text-[11px] font-bold shrink-0">
                            <XCircle className="h-3 w-3" />
                            <span>MISS</span>
                          </span>
                        )}

                        <span className="text-white font-medium truncate">{log.query}</span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[11px] font-mono text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                          {log.category}
                        </span>
                        <span>{log.latencyMs}ms</span>
                      </div>
                    </div>

                    {/* Clean Human-Readable Returned Answer Snippet */}
                    {log.answerSnippet && (
                      <div className="pl-6 text-[11px] text-slate-400 line-clamp-1 italic">
                        &ldquo;{log.answerSnippet}...&rdquo;
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Metrics Grid */}
      {report && (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {/* Recall@5 */}
            <div className="rounded-2xl glass-panel p-5 border border-dark-border space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Factual Recall@5</span>
                <Target className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-emerald-400">{report.metrics.meanRecallAt5}</p>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                <div
                  className="bg-emerald-400 h-1.5 rounded-full"
                  style={{ width: report.metrics.meanRecallAt5 }}
                />
              </div>
              <p className="text-[11px] text-slate-400 pt-1">Grounding target: &gt;90%</p>
            </div>

            {/* Hit@1 Accuracy */}
            <div className="rounded-2xl glass-panel p-5 border border-dark-border space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Hit@1 Accuracy</span>
                <Award className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold text-cyan-400">{report.metrics.hitAt1Rate}</p>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                <div
                  className="bg-cyan-400 h-1.5 rounded-full"
                  style={{ width: report.metrics.hitAt1Rate }}
                />
              </div>
              <p className="text-[11px] text-slate-400 pt-1">Top-1 Grounded precision</p>
            </div>

            {/* MRR */}
            <div className="rounded-2xl glass-panel p-5 border border-dark-border space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Mean Reciprocal Rank</span>
                <TrendingUp className="h-4 w-4 text-purple-400" />
              </div>
              <p className="text-2xl font-bold text-purple-400">{report.metrics.meanReciprocalRank}</p>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                <div
                  className="bg-purple-400 h-1.5 rounded-full"
                  style={{ width: `${Math.min(100, parseFloat(report.metrics.meanReciprocalRank) * 100)}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 pt-1">Rank quality score (0 to 1.0)</p>
            </div>

            {/* Negative Abstention */}
            <div className="rounded-2xl glass-panel p-5 border border-dark-border space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Negative Abstention</span>
                <ShieldCheck className="h-4 w-4 text-blue-400" />
              </div>
              <p className="text-2xl font-bold text-blue-400">{report.metrics.negativeAbstentionRate}</p>
              <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
                <div
                  className="bg-blue-400 h-1.5 rounded-full"
                  style={{ width: report.metrics.negativeAbstentionRate }}
                />
              </div>
              <p className="text-[11px] text-slate-400 pt-1">Zero-hallucination rate</p>
            </div>

            {/* Mean Latency */}
            <div className="rounded-2xl glass-panel p-5 border border-dark-border space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Mean Latency</span>
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-amber-400">{report.metrics.averageLatencyMs} ms</p>
              <p className="text-[11px] text-slate-400 pt-2">Includes rerank & generation</p>
            </div>
          </div>

          {/* Results Table Section */}
          <div className="rounded-2xl glass-panel border border-dark-border overflow-hidden">
            {/* Filter Bar */}
            <div className="p-4 border-b border-dark-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? 'bg-brand-600 text-white'
                        : 'bg-dark-card text-slate-400 hover:text-slate-200 border border-dark-border'
                    }`}
                  >
                    {cat === 'all' ? 'All Categories' : cat}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by question..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-dark-bg border border-dark-border text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-dark-card/50 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-dark-border">
                  <tr>
                    <th className="px-5 py-3">#</th>
                    <th className="px-5 py-3">Scenario / User Question</th>
                    <th className="px-5 py-3">Category</th>
                    <th className="px-5 py-3 text-center">Recall@5</th>
                    <th className="px-5 py-3 text-center">Hit Rank</th>
                    <th className="px-5 py-3 text-center">Abstention</th>
                    <th className="px-5 py-3 text-right">Latency</th>
                    <th className="px-5 py-3 text-center">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {filteredResults.map((item, idx) => {
                    const isExpanded = expandedRow === item.id;
                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          onClick={() => setExpandedRow(isExpanded ? null : item.id)}
                          className="hover:bg-dark-card/40 cursor-pointer transition"
                        >
                          <td className="px-5 py-4 font-mono text-slate-500">{idx + 1}</td>
                          <td className="px-5 py-4 font-medium text-white max-w-md">
                            <p className="line-clamp-2">{item.query}</p>
                            <span className="text-[10px] text-slate-500 font-mono">{item.id}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {item.isNegativeControl ? (
                              <span className="text-slate-500 text-[11px]">N/A (Neg)</span>
                            ) : item.recallAt5 ? (
                              <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold">
                                <CheckCircle2 className="h-4 w-4" />
                                <span>PASS</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-400 font-semibold">
                                <XCircle className="h-4 w-4" />
                                <span>MISS</span>
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            {item.isNegativeControl ? (
                              <span className="text-slate-500">-</span>
                            ) : item.hitRank === 1 ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                                #1
                              </span>
                            ) : item.hitRank ? (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                                #{item.hitRank}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 font-bold border border-red-500/30">
                                Miss
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            {item.isNegativeControl ? (
                              item.abstentionPassed ? (
                                <span className="inline-flex items-center gap-1 text-blue-400 font-semibold">
                                  <ShieldCheck className="h-4 w-4" />
                                  <span>Abstained</span>
                                </span>
                              ) : (
                                <span className="text-red-400 font-semibold">Failed</span>
                              )
                            ) : (
                              <span className="text-slate-500">-</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right font-mono text-slate-400">
                            {item.latencyMs}ms
                          </td>
                          <td className="px-5 py-4 text-center text-slate-400">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 inline" />
                            ) : (
                              <ChevronDown className="h-4 w-4 inline" />
                            )}
                          </td>
                        </tr>

                        {/* Expanded details row */}
                        {isExpanded && (
                          <tr className="bg-dark-card/60">
                            <td colSpan={8} className="px-6 py-4 space-y-3">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <h4 className="font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                                    <Layers className="h-3.5 w-3.5 text-brand-400" />
                                    <span>Retrieved Document Candidates:</span>
                                  </h4>
                                  <div className="space-y-1">
                                    {item.retrievedDocs.map((doc, dIdx) => (
                                      <div
                                        key={dIdx}
                                        className="flex items-center gap-2 p-1.5 rounded-lg bg-dark-bg/80 border border-dark-border font-mono text-[11px] text-slate-300"
                                      >
                                        <span className="text-slate-500">#{dIdx + 1}</span>
                                        <span>{doc}</span>
                                      </div>
                                    ))}
                                    {item.retrievedDocs.length === 0 && (
                                      <p className="text-slate-500 italic">No candidates retrieved.</p>
                                    )}
                                  </div>
                                </div>

                                <div>
                                  <h4 className="font-semibold text-slate-300 mb-1.5">
                                    Generated Grounded Answer Snippet:
                                  </h4>
                                  <div className="p-3 rounded-lg bg-dark-bg/80 border border-dark-border text-slate-300 leading-relaxed font-sans text-xs">
                                    &ldquo;{item.answerSnippet}...&rdquo;
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
