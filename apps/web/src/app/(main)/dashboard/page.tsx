'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient } from '../../../lib/api-client';
import { AnalyticsCharts } from '../../../components/AnalyticsCharts';
import { DocumentUploadModal } from '../../../components/DocumentUploadModal';
import {
  UploadCloud,
  FileText,
  RotateCw,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Shield,
  Layers,
  Search,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import type { Document, AnalyticsStats } from '@rag/shared';

export default function DashboardPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [recentQueries, setRecentQueries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [reindexingId, setReindexingId] = useState<string | null>(null);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [docsData, statsData, queriesData] = await Promise.all([
        apiClient.get('/api/documents'),
        apiClient.get('/api/analytics/stats'),
        apiClient.get('/api/analytics/queries'),
      ]);

      setDocuments(docsData || []);
      setStats(statsData || null);
      setRecentQueries(queriesData || []);
    } catch (err) {
      console.error('Failed to fetch dashboard telemetry:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      if (!isAdmin) {
        router.replace('/chat');
      } else {
        loadDashboardData();
      }
    }
  }, [authLoading, isAdmin, router]);

  const handleReindex = async (docId: string) => {
    setReindexingId(docId);
    try {
      await apiClient.post(`/api/ingestion/${docId}/trigger`);
      await loadDashboardData();
    } catch (err) {
      console.error('Re-index error:', err);
    } finally {
      setReindexingId(null);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm('Are you sure you want to remove this document and its embeddings from the vector store?')) {
      return;
    }
    try {
      await apiClient.delete(`/api/documents/${docId}`);
      await loadDashboardData();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-dark-bg">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={loadDashboardData}
      />

      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Operations Dashboard</h1>
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2 py-0.5 text-xs font-semibold">
              <Shield className="h-3 w-3" /> RBAC Enforced
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage knowledge base corpus, monitor vector ingestion pipeline & search telemetry
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadDashboardData}
            title="Refresh Dashboard"
            className="flex items-center gap-2 rounded-xl border border-dark-border bg-dark-card px-3.5 py-2.5 text-xs font-medium text-slate-300 hover:bg-dark-hover transition"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-glow-brand hover:bg-brand-500 transition"
          >
            <UploadCloud className="h-4 w-4" />
            Upload Document
          </button>
        </div>
      </div>

      {/* System Health Banner */}
      <div className="rounded-2xl glass-card p-4 border border-brand-500/20 bg-brand-500/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-500/15 text-brand-400">
            <Cpu className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-white">System Architecture Health: Active</div>
            <div className="text-slate-400">
              Embedding Model: <code className="text-brand-300">text-embedding-004 (768-dim)</code> • LLM:{' '}
              <code className="text-brand-300">Gemini 2.0 Flash</code> • Vector Engine:{' '}
              <code className="text-brand-300">PostgreSQL pgvector (HNSW)</code>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-emerald-400 font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          Ingestion & MCP Tools Ready
        </div>
      </div>

      {/* Top 5 Analytics & Telemetry Cards */}
      <AnalyticsCharts stats={stats} recentQueries={recentQueries} />

      {/* Corpus Documents Management Table */}
      <div className="rounded-2xl glass-panel p-6 border border-slate-800 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="h-5 w-5 text-brand-400" />
            <h3 className="text-base font-bold text-white">Indexed Knowledge Base Corpus</h3>
            <span className="rounded-full bg-slate-800 border border-slate-700 px-2.5 py-0.5 text-xs font-mono text-slate-300">
              {documents.length} files
            </span>
          </div>

          <p className="text-xs text-slate-400">
            All files are recursively chunked and vectorized for semantic retrieval
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4 font-semibold">Document Title</th>
                <th className="py-3 px-4 font-semibold">File Type</th>
                <th className="py-3 px-4 font-semibold">File Size</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold">Indexed Chunks</th>
                <th className="py-3 px-4 font-semibold">Last Updated</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No documents found in corpus. Click &quot;Upload Document&quot; or run &quot;pnpm run db:seed&quot; to ingest sample files.
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/30 transition">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <FileText className="h-4 w-4 text-brand-400 shrink-0" />
                        <div>
                          <p className="font-semibold text-white">{doc.title}</p>
                          <p className="font-mono text-[11px] text-slate-500">{doc.filename}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 uppercase font-mono text-[11px] text-slate-400">
                      {doc.fileType}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4">
                      {doc.status === 'indexed' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 font-semibold text-[11px]">
                          <CheckCircle2 className="h-3 w-3" /> Indexed
                        </span>
                      )}
                      {doc.status === 'processing' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 font-semibold text-[11px]">
                          <Clock className="h-3 w-3 animate-spin" /> Ingesting...
                        </span>
                      )}
                      {doc.status === 'failed' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-0.5 font-semibold text-[11px]">
                          <AlertCircle className="h-3 w-3" /> Failed
                        </span>
                      )}
                      {doc.status === 'uploaded' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 text-slate-400 px-2.5 py-0.5 text-[11px]">
                          Queued
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-white">
                      {doc.chunkCount ?? '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {new Date(doc.updatedAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleReindex(doc.id)}
                          disabled={reindexingId === doc.id}
                          title="Re-index Document"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-dark-hover hover:text-brand-400 transition"
                        >
                          <RotateCw className={`h-4 w-4 ${reindexingId === doc.id ? 'animate-spin text-brand-400' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleDelete(doc.id)}
                          title="Delete Document"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
