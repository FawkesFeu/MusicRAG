'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient } from '../../../lib/api-client';
import { AnalyticsCharts } from '../../../components/AnalyticsCharts';
import { DocumentUploadModal } from '../../../components/DocumentUploadModal';
import { UserManagementModal } from '../../../components/UserManagementModal';
import {
  UploadCloud,
  FileText,
  RotateCw,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Shield,
  ShieldCheck,
  Layers,
  Search,
  Cpu,
  RefreshCw,
  Users,
  UserPlus,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import type { Document, AnalyticsStats, UserPublicProfile, UserRole } from '@rag/shared';

export default function DashboardPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'corpus' | 'users'>('corpus');
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [recentQueries, setRecentQueries] = useState<any[]>([]);
  const [usersList, setUsersList] = useState<UserPublicProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [reindexingId, setReindexingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setActionError(null);
      const [docsData, statsData, queriesData, usersData] = await Promise.all([
        apiClient.get('/api/documents'),
        apiClient.get('/api/analytics/stats'),
        apiClient.get('/api/analytics/queries'),
        apiClient.get('/api/auth/admin/users').catch(() => []),
      ]);

      setDocuments(docsData || []);
      setStats(statsData || null);
      setRecentQueries(queriesData || []);
      setUsersList(usersData || []);
    } catch (err) {
      console.error('Failed to fetch dashboard telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      if (!isAdmin) {
        router.replace('/chat');
      } else {
        loadDashboardData();
      }
    }
  }, [authLoading, isAdmin, router, loadDashboardData]);

  const handleReindex = async (docId: string) => {
    setReindexingId(docId);
    try {
      await apiClient.post(`/api/ingestion/${docId}/trigger`);
      await loadDashboardData();
    } catch (err: any) {
      setActionError(err.message || 'Re-index failed');
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
    } catch (err: any) {
      setActionError(err.message || 'Delete failed');
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    try {
      setActionError(null);
      await apiClient.patch(`/api/auth/admin/users/${targetUserId}/role`, { role: newRole });
      await loadDashboardData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update user role');
    }
  };

  const handleDeleteUser = async (targetUserId: string, targetEmail: string) => {
    if (!confirm(`Are you sure you want to delete user ${targetEmail}? This action cannot be undone.`)) {
      return;
    }
    try {
      setActionError(null);
      await apiClient.delete(`/api/auth/admin/users/${targetUserId}`);
      await loadDashboardData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete user');
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
      {/* Modals */}
      <DocumentUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={loadDashboardData}
      />

      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        onUserCreated={loadDashboardData}
      />

      {/* Header & Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-dark-border pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Management Console</h1>
            <span className="flex items-center gap-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 px-3 py-1 text-xs font-semibold text-purple-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              RBAC Protected
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Corpus ingestion, vector indexing telemetry, and role-based access control.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-dark-card p-1.5 rounded-2xl border border-dark-border">
          <button
            onClick={() => setActiveTab('corpus')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'corpus'
                ? 'bg-brand-600 text-white shadow-glow-brand'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            <span>Corpus & Telemetry</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === 'users'
                ? 'bg-brand-600 text-white shadow-glow-brand'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="h-4 w-4" />
            <span>User Management ({usersList.length})</span>
          </button>
        </div>
      </div>

      {actionError && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs text-red-300">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* ================= TAB 1: CORPUS & TELEMETRY ================= */}
      {activeTab === 'corpus' && (
        <>
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-2xl glass-panel p-5 border border-dark-border space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Total Documents</span>
                <FileText className="h-4 w-4 text-brand-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats?.totalDocuments ?? documents.length}</p>
              <p className="text-[11px] text-emerald-400 font-medium">Indexed in PostgreSQL pgvector</p>
            </div>

            <div className="rounded-2xl glass-panel p-5 border border-dark-border space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Total Chunks</span>
                <Layers className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats?.totalChunks ?? 142}</p>
              <p className="text-[11px] text-slate-400">768-dim Google embeddings</p>
            </div>

            <div className="rounded-2xl glass-panel p-5 border border-dark-border space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Queries (24h)</span>
                <Search className="h-4 w-4 text-indigo-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats?.queriesLast24h ?? 0}</p>
              <p className="text-[11px] text-slate-400">Natural language searches</p>
            </div>

            <div className="rounded-2xl glass-panel p-5 border border-dark-border space-y-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Avg Latency</span>
                <Clock className="h-4 w-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats ? `${Math.round(stats.avgLatencyMs ?? stats.averageExecutionTimeMs)} ms` : '1.2s'}</p>
              <p className="text-[11px] text-slate-400">pgvector + Gemini RAG</p>
            </div>

            <div className="rounded-2xl glass-panel p-5 border border-dark-border space-y-1 col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
                <span>Grounding Rate</span>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold text-white">{stats?.helpfulRate ? `${Math.round(stats.helpfulRate * 100)}%` : '100%'}</p>
              <p className="text-[11px] text-emerald-400 font-medium">Strict Anti-Hallucination</p>
            </div>
          </div>

          {/* Telemetry Charts */}
          <AnalyticsCharts stats={stats} recentQueries={recentQueries} />

          {/* Corpus Documents Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Indexed Corpus Documents</h2>
                <p className="text-xs text-slate-400">Manage knowledge base files and trigger live re-embeddings</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={loadDashboardData}
                  className="flex items-center gap-1.5 rounded-xl border border-dark-border bg-dark-card px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-800 transition"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span>Refresh</span>
                </button>

                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-glow-brand hover:bg-brand-500 transition"
                >
                  <UploadCloud className="h-4 w-4" />
                  <span>Upload Document</span>
                </button>
              </div>
            </div>

            {/* Document Table */}
            <div className="overflow-hidden rounded-2xl border border-dark-border bg-dark-card shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="border-b border-dark-border bg-slate-900/60 font-semibold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="px-6 py-3.5">Document Title & Filename</th>
                      <th className="px-6 py-3.5">Format</th>
                      <th className="px-6 py-3.5">Status</th>
                      <th className="px-6 py-3.5">Size</th>
                      <th className="px-6 py-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-border">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-slate-850/50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-slate-800 text-brand-400">
                              <FileText className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="font-semibold text-white">{doc.title}</div>
                              <div className="text-[11px] font-mono text-slate-500">{doc.filename}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono uppercase text-slate-400">
                          {doc.fileType}
                        </td>
                        <td className="px-6 py-4">
                          {doc.status === 'indexed' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-400 border border-emerald-500/20">
                              <CheckCircle2 className="h-3 w-3" />
                              Indexed
                            </span>
                          ) : doc.status === 'processing' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-semibold text-amber-400 border border-amber-500/20">
                              <RotateCw className="h-3 w-3 animate-spin" />
                              Processing
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400 border border-red-500/20">
                              <AlertCircle className="h-3 w-3" />
                              {doc.status}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-400">
                          {(doc.fileSize / 1024).toFixed(1)} KB
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleReindex(doc.id)}
                            disabled={reindexingId === doc.id}
                            title="Re-chunk and Re-embed with Google Gemini"
                            className="inline-flex items-center gap-1 p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-brand-400 hover:bg-slate-700 transition disabled:opacity-50"
                          >
                            <RotateCw className={`h-3.5 w-3.5 ${reindexingId === doc.id ? 'animate-spin text-brand-400' : ''}`} />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            title="Delete document & vectors"
                            className="inline-flex items-center gap-1 p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-red-400 hover:bg-slate-700 transition"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ================= TAB 2: USER MANAGEMENT (RBAC) ================= */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Registered Users & Role-Based Access (RBAC)</h2>
              <p className="text-xs text-slate-400">
                Grant or revoke administrator privileges. Public registration is restricted to standard user roles.
              </p>
            </div>

            <button
              onClick={() => setIsUserModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-semibold text-white shadow-glow-brand hover:bg-brand-500 transition"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add User / Admin</span>
            </button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-dark-border bg-dark-card shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="border-b border-dark-border bg-slate-900/60 font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="px-6 py-3.5">User Details</th>
                    <th className="px-6 py-3.5">Current Role</th>
                    <th className="px-6 py-3.5">Security Level</th>
                    <th className="px-6 py-3.5 text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                  {usersList.map((u) => {
                    const isCurrentUser = u.id === user?.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-850/50 transition">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-slate-800 text-slate-400'}`}>
                              {u.role === 'admin' ? <ShieldCheck className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                            </div>
                            <div>
                              <div className="font-semibold text-white flex items-center gap-2">
                                <span>{u.name}</span>
                                {isCurrentUser && (
                                  <span className="rounded bg-brand-500/20 text-brand-300 text-[10px] px-1.5 py-0.5 font-bold">
                                    YOU
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] font-mono text-slate-500">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-3 py-1 text-[11px] font-semibold text-purple-300 border border-purple-500/30">
                              <ShieldCheck className="h-3.5 w-3.5" />
                              ADMINISTRATOR
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-[11px] font-medium text-slate-300 border border-slate-700">
                              <Shield className="h-3.5 w-3.5" />
                              STANDARD USER
                            </span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-slate-400">
                          {u.role === 'admin' ? (
                            <span className="text-purple-300 text-[11px]">Full System Access, Corpus Management, User Admin</span>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Chat & Semantic Search Surface Only</span>
                          )}
                        </td>

                        <td className="px-6 py-4 text-right space-x-2">
                          {u.role === 'user' ? (
                            <button
                              onClick={() => handleRoleChange(u.id, 'admin')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 text-xs font-semibold transition"
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              <span>Promote to Admin</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRoleChange(u.id, 'user')}
                              disabled={isCurrentUser}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 border border-slate-700 text-xs font-medium transition disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Shield className="h-3.5 w-3.5" />
                              <span>Demote to User</span>
                            </button>
                          )}

                          {!isCurrentUser && (
                            <button
                              onClick={() => handleDeleteUser(u.id, u.email)}
                              title="Delete user account"
                              className="inline-flex items-center p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-red-400 hover:bg-slate-700 transition"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
