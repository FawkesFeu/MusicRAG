'use client';

import React, { useState, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot, User, Sparkles, AlertCircle, ThumbsUp, ThumbsDown,
  BookOpen, Clock, FileText, FileCode, ScrollText,
} from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { CitationModal, GroupedCitation } from './CitationModal';
import type { RAGResponse, Citation } from '@rag/shared';

export interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ragData?: RAGResponse;
  timestamp: string;
  isStreaming?: boolean;
}

interface ChatMessageProps {
  message: MessageItem;
  // Not used externally anymore — modal is managed internally per message
  onSelectCitation?: (citation: Citation) => void;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function CitationFileIcon({ filename }: { filename: string }) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <ScrollText className="h-3.5 w-3.5" />;
  if (ext === 'ts' || ext === 'js') return <FileCode className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

function shortLabel(title: string, filename: string): string {
  const candidate = title || filename.replace(/\.[^.]+$/, '').replace(/-/g, ' ');
  if (candidate.length <= 28) return candidate;
  return candidate.slice(0, 26) + '…';
}

/**
 * Group raw citations by filename, then renumber sequentially (1, 2, 3…).
 * Each file gets ONE chip. Original backend sourceIndex values are kept inside
 * each chunk object so the inline marker mapper can still match them.
 */
function groupCitations(citations: Citation[]): GroupedCitation[] {
  // First pass: build groups preserving insertion order
  const map = new Map<string, GroupedCitation>();
  for (const c of citations) {
    const key = c.filename;
    if (!map.has(key)) {
      map.set(key, {
        filename: c.filename,
        documentTitle: c.documentTitle,
        chunks: [c],
        displayIndex: c.sourceIndex ?? 1, // temporary — overwritten below
      });
    } else {
      const group = map.get(key)!;
      group.chunks.push(c);
      // Keep the lowest original sourceIndex as ordering key
      if ((c.sourceIndex ?? 999) < group.displayIndex) {
        group.displayIndex = c.sourceIndex ?? group.displayIndex;
      }
    }
  }

  // Sort by the first-seen original sourceIndex, then RENUMBER sequentially
  const sorted = Array.from(map.values()).sort((a, b) => a.displayIndex - b.displayIndex);
  sorted.forEach((g, i) => { g.displayIndex = i + 1; });
  return sorted;
}



/**
 * Replace [Source N] / [Source N, M] patterns in the answer text with
 * inline icon chips that match the deduped citation chips below.
 *
 * The chip shows the file icon + the display badge number of the first
 * group that contains sourceIndex N.
 */
function buildInlineContent(
  text: string,
  groups: GroupedCitation[],
  onOpen: (g: GroupedCitation) => void,
): React.ReactNode[] {
  // Map: original sourceIndex → owning group
  const indexToGroup = new Map<number, GroupedCitation>();
  groups.forEach((g) => {
    g.chunks.forEach((c) => {
      if (c.sourceIndex != null) indexToGroup.set(c.sourceIndex, g);
    });
  });

  // Split on [Source N] / [Source N, M] / [Source N, Source M]
  const pattern = /\[Source\s*([\d,\s]+(?:,\s*Source\s*[\d,\s]+)*)\]/gi;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;

  for (const match of text.matchAll(new RegExp(pattern.source, 'gi'))) {
    const raw = match[0];
    const start = match.index!;

    // Push preceding plain text
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }

    // Parse numbers from the marker
    const nums = [...raw.matchAll(/\d+/g)].map((m) => parseInt(m[0]));
    const uniqueGroups: GroupedCitation[] = [];
    nums.forEach((n) => {
      const g = indexToGroup.get(n);
      if (g && !uniqueGroups.includes(g)) uniqueGroups.push(g);
    });

    if (uniqueGroups.length === 0) {
      parts.push(raw);
    } else {
      uniqueGroups.forEach((g, i) => {
        if (i > 0) parts.push(' ');
        parts.push(
          <button
            key={`${start}-${i}`}
            onClick={() => onOpen(g)}
            title={`Source: ${g.documentTitle}`}
            className="inline-flex items-center gap-1 mx-0.5 align-middle rounded-md bg-brand-500/15 hover:bg-brand-500/30 border border-brand-500/30 px-1.5 py-0.5 text-[11px] font-semibold text-brand-300 transition cursor-pointer"
            style={{ verticalAlign: 'middle' }}
          >
            <span className="flex h-4 w-4 items-center justify-center rounded bg-brand-500/30 text-brand-200 text-[9px] font-bold">
              {g.displayIndex}
            </span>
            <span className="text-brand-400 opacity-80">
              <CitationFileIcon filename={g.filename} />
            </span>
          </button>
        );
      });
    }

    lastIndex = start + raw.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}

/**
 * Apply buildInlineContent to every direct string child of a React node list.
 * Non-string children (e.g. <strong>, <em>) are returned as-is so that
 * react-markdown's own nesting is preserved.
 */
function enrichChildren(
  children: React.ReactNode,
  groups: GroupedCitation[],
  onOpen: (g: GroupedCitation) => void,
): React.ReactNode {
  return React.Children.map(children, (child) => {
    if (typeof child !== 'string') return child;
    const nodes = buildInlineContent(child, groups, onOpen);
    if (nodes.length === 1 && typeof nodes[0] === 'string') return nodes[0];
    return <>{nodes}</>;
  });
}

// ── Component ────────────────────────────────────────────────────────────────

export function ChatMessage({ message }: ChatMessageProps) {
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<GroupedCitation | null>(null);
  const isUser = message.role === 'user';
  const rag = message.ragData;

  const groups = useMemo(() => {
    if (!rag?.citations?.length) return [];
    return groupCitations(rag.citations);
  }, [rag?.citations]);

  const handleFeedback = async (type: 'helpful' | 'not_helpful') => {
    if (feedback === type) return;
    setFeedback(type);
    try {
      await apiClient.post('/api/search/feedback', { queryId: message.id, feedback: type });
    } catch { /* ignore */ }
  };

  // ── User bubble ────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <div className="flex justify-end mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-start gap-3 max-w-2xl">
          <div className="rounded-2xl bg-gradient-to-tr from-brand-600 to-brand-500 px-5 py-3.5 text-sm text-white shadow-glow-brand">
            {message.content}
          </div>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-slate-700 text-slate-300">
            <User className="h-4 w-4" />
          </div>
        </div>
      </div>
    );
  }

  // ── Assistant bubble ────────────────────────────────────────────────────
  const isUnknown = rag && !rag.isCorpusGrounded;

  // Build inline content nodes (replaces [Source N] with chips)
  const inlineNodes = useMemo(() => {
    if (!message.content) return [];
    return buildInlineContent(message.content, groups, setSelectedGroup);
  }, [message.content, groups]);

  return (
    <>
      {/* Per-message citation modal */}
      {selectedGroup && (
        <CitationModal
          citation={selectedGroup}
          query={rag?.query}
          onClose={() => setSelectedGroup(null)}
        />
      )}

      <div className="flex justify-start mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-start gap-3.5 max-w-3xl w-full">

          {/* Avatar */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-glow-accent mt-0.5">
            <Bot className="h-5 w-5" />
          </div>

          {/* Card */}
          <div className="flex-1 rounded-2xl glass-card border border-slate-800 shadow-xl overflow-hidden">

            {/* Top meta bar */}
            {message.isStreaming ? (
              <div className="flex items-center gap-2 bg-slate-900/60 border-b border-slate-800/80 px-5 py-2.5 text-xs text-brand-300 animate-pulse">
                <Sparkles className="h-3.5 w-3.5 animate-spin text-brand-400" />
                <span className="font-semibold">Synthesizing grounded response in real-time...</span>
              </div>
            ) : rag ? (
              <div className="flex items-center gap-2 bg-slate-900/60 border-b border-slate-800/80 px-5 py-2.5 text-xs text-slate-400">
                <span className="inline-flex items-center gap-1 font-semibold text-brand-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  Gemini Grounded RAG
                </span>
                <span className="text-slate-700">•</span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                  <Clock className="h-3 w-3" />
                  {rag.executionTimeMs}ms
                </span>
              </div>
            ) : null}

            <div className="p-5 space-y-4">

              {/* Grounding warning */}
              {isUnknown && !message.isStreaming && (
                <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-xs text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>
                    <strong>Strict Grounding:</strong> The indexed document corpus does not contain sufficient facts
                    to answer this question. No hallucinated citations were created.
                  </span>
                </div>
              )}

              {/* ── Answer with inline citation chips ── */}
              <div className="rag-prose text-sm leading-relaxed text-slate-100">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="text-lg font-bold text-white mt-4 mb-2 border-b border-slate-700 pb-1">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-base font-bold text-white mt-3 mb-1.5">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-1">{children}</h3>,
                    p: ({ children }) => {
                      return <p className="mb-2 last:mb-0 text-slate-100">{enrichChildren(children, groups, setSelectedGroup)}</p>;
                    },
                    ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-slate-200 pl-1">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-slate-200 pl-1">{children}</ol>,
                    li: ({ children }) => <li className="text-slate-200 leading-relaxed">{enrichChildren(children, groups, setSelectedGroup)}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-white">{enrichChildren(children, groups, setSelectedGroup)}</strong>,
                    em: ({ children }) => <em className="text-slate-300 italic">{enrichChildren(children, groups, setSelectedGroup)}</em>,
                    code: ({ children, className }) => {
                      const isBlock = className?.includes('language-');
                      return isBlock
                        ? <code className="block bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-emerald-300 overflow-x-auto my-2 whitespace-pre">{children}</code>
                        : <code className="bg-slate-800 text-emerald-300 rounded px-1.5 py-0.5 text-xs font-mono">{children}</code>;
                    },
                    pre: ({ children }) => <pre className="my-2">{children}</pre>,
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-brand-500 pl-4 text-slate-300 italic my-2 bg-brand-500/5 py-1 rounded-r-lg">
                        {children}
                      </blockquote>
                    ),
                    hr: () => <hr className="border-slate-700 my-3" />,
                    table: ({ children }) => <div className="overflow-x-auto my-2"><table className="w-full text-xs border-collapse">{children}</table></div>,
                    thead: ({ children }) => <thead className="bg-slate-800/60">{children}</thead>,
                    th: ({ children }) => <th className="border border-slate-700 px-3 py-2 text-left font-semibold text-slate-200">{children}</th>,
                    td: ({ children }) => <td className="border border-slate-700 px-3 py-2 text-slate-300">{children}</td>,
                    tr: ({ children }) => <tr className="even:bg-slate-800/30">{children}</tr>,
                    a: ({ href, children }) => (
                      <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition">
                        {children}
                      </a>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {message.isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 bg-brand-400 animate-pulse align-middle rounded-sm" />
                )}
              </div>


              {/* ── Deduped citation chips (one per file) ── */}
              {groups.length > 0 && (
                <div className="pt-3 border-t border-slate-800/80 space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                    <BookOpen className="h-3.5 w-3.5 text-brand-400" />
                    Verified Sources ({groups.length} file{groups.length > 1 ? 's' : ''})
                    {rag!.citations.length > groups.length && (
                      <span className="text-slate-600 font-normal">
                        · {rag!.citations.length} chunks total
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-0.5">
                    {groups.map((group) => (
                      <button
                        key={group.filename}
                        onClick={() => setSelectedGroup(group)}
                        title={`${group.filename} — ${group.chunks.length} chunk${group.chunks.length > 1 ? 's' : ''}`}
                        className="group flex items-center gap-2 rounded-xl bg-slate-800/80 hover:bg-brand-500/15 border border-slate-700 hover:border-brand-500/50 px-3 py-2 text-xs text-slate-200 transition-all duration-150 shadow-sm hover:shadow-brand-500/10 hover:shadow-md"
                      >
                        {/* Badge */}
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-500/20 text-brand-300 font-bold text-[10px] group-hover:bg-brand-500 group-hover:text-white transition">
                          {group.displayIndex}
                        </span>

                        {/* File icon */}
                        <span className="text-slate-400 group-hover:text-brand-300 transition shrink-0">
                          <CitationFileIcon filename={group.filename} />
                        </span>

                        {/* Label */}
                        <span className="font-medium text-slate-200 group-hover:text-white transition truncate max-w-[180px]">
                          {shortLabel(group.documentTitle, group.filename)}
                        </span>

                        {/* Multi-chunk indicator */}
                        {group.chunks.length > 1 && (
                          <span className="shrink-0 rounded bg-brand-500/10 border border-brand-500/20 px-1.5 py-0.5 text-[10px] text-brand-400 font-semibold">
                            ×{group.chunks.length}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Feedback ── */}
              <div className="flex items-center justify-end gap-1.5 pt-1 text-slate-400">
                <span className="text-[11px] text-slate-500 mr-1">Was this helpful?</span>
                <button
                  onClick={() => handleFeedback('helpful')}
                  className={`rounded-lg p-1.5 transition ${feedback === 'helpful' ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-dark-hover hover:text-slate-200'}`}
                  title="Helpful"
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleFeedback('not_helpful')}
                  className={`rounded-lg p-1.5 transition ${feedback === 'not_helpful' ? 'bg-red-500/20 text-red-400' : 'hover:bg-dark-hover hover:text-slate-200'}`}
                  title="Not helpful"
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
