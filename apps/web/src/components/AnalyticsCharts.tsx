'use client';

import React from 'react';
import { FileText, Layers, Search, Clock, ThumbsUp, Activity } from 'lucide-react';
import type { AnalyticsStats } from '@rag/shared';

interface AnalyticsChartsProps {
  stats: AnalyticsStats | null;
  recentQueries: any[];
}

export function AnalyticsCharts({ stats, recentQueries }: AnalyticsChartsProps) {
  if (!stats) return null;

  const totalFeedback = stats.helpfulFeedbackCount + stats.notHelpfulFeedbackCount;
  const helpfulRate = totalFeedback > 0 ? ((stats.helpfulFeedbackCount / totalFeedback) * 100).toFixed(0) : '100';

  return (
    <div className="space-y-6">
      {/* 5 Key Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-2xl glass-card p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Documents</span>
            <FileText className="h-4 w-4 text-brand-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalDocuments}</div>
          <p className="text-[11px] text-emerald-400 font-medium">
            {stats.indexedDocuments} indexed in vector DB
          </p>
        </div>

        <div className="rounded-2xl glass-card p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Chunks</span>
            <Layers className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalChunks}</div>
          <p className="text-[11px] text-slate-400">768-dim embeddings</p>
        </div>

        <div className="rounded-2xl glass-card p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Queries (24h)</span>
            <Search className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.queriesLast24h}</div>
          <p className="text-[11px] text-slate-400">Natural language searches</p>
        </div>

        <div className="rounded-2xl glass-card p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Avg Latency</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.averageExecutionTimeMs} ms</div>
          <p className="text-[11px] text-slate-400">pgvector + Gemini RAG</p>
        </div>

        <div className="rounded-2xl glass-card p-5 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Helpful Rate</span>
            <ThumbsUp className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">{helpfulRate}%</div>
          <p className="text-[11px] text-slate-400">{stats.helpfulFeedbackCount} positive feedbacks</p>
        </div>
      </div>

      {/* Recent Queries Log Table */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Recent Search Queries & Analytics</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Live Search Telemetry</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">User Query</th>
                <th className="py-3 px-4 font-semibold">Chunks Retrieved</th>
                <th className="py-3 px-4 font-semibold">Answer Generated</th>
                <th className="py-3 px-4 font-semibold">Latency</th>
                <th className="py-3 px-4 font-semibold">Feedback</th>
                <th className="py-3 px-4 font-semibold">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {recentQueries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-500">
                    No search queries recorded yet. Ask a question on the Chat page to see live analytics!
                  </td>
                </tr>
              ) : (
                recentQueries.slice(0, 10).map((q) => (
                  <tr key={q.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4 font-medium text-white max-w-xs truncate">{q.query}</td>
                    <td className="py-3 px-4 font-mono">{q.retrievedChunkCount} chunks</td>
                    <td className="py-3 px-4">
                      {q.answerGenerated ? (
                        <span className="rounded-full bg-emerald-500/10 text-emerald-400 px-2 py-0.5 font-semibold">
                          Yes
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-800 text-slate-400 px-2 py-0.5">
                          No
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">{q.executionTime}ms</td>
                    <td className="py-3 px-4">
                      {q.relevanceFeedback === 'helpful' && (
                        <span className="text-emerald-400 font-semibold">👍 Helpful</span>
                      )}
                      {q.relevanceFeedback === 'not_helpful' && (
                        <span className="text-red-400 font-semibold">👎 Not Helpful</span>
                      )}
                      {!q.relevanceFeedback && <span className="text-slate-600">—</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-mono">
                      {new Date(q.createdAt).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
