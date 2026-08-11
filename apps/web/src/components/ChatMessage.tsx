'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Bot, User, Sparkles, AlertCircle, ThumbsUp, ThumbsDown,
  BookOpen, Clock, FileText, FileCode, ScrollText, Zap,
} from 'lucide-react';
import { apiClient } from '../lib/api-client';
import type { RAGResponse, Citation } from '@rag/shared';

export interface MessageItem {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  ragData?: RAGResponse;
  timestamp: string;
}

interface ChatMessageProps {
  message: MessageItem;
  onSelectCitation: (citation: Citation) => void;
}

// Pick an icon based on file extension
function CitationFileIcon({ filename }: { filename: string }) {
  const ext = filename?.split('.').pop()?.toLowerCase();
  if (ext === 'pdf') return <ScrollText className="h-3.5 w-3.5" />;
  if (ext === 'ts' || ext === 'js') return <FileCode className="h-3.5 w-3.5" />;
  return <FileText className="h-3.5 w-3.5" />;
}

// Deduce a short readable label from the filename or title
function shortLabel(title: string, filename: string): string {
  if (title && title.length < 32) return title;
  return filename
    .replace(/\.[^.]+$/, '')        // strip extension
    .replace(/-/g, ' ')             // dashes → spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Title Case
}

// Strip [Source N] markers from answer text — they'll be shown as chips below
function stripSourceMarkers(text: string): string {
  return text
    .replace(/\[Source\s*\d+(?:,\s*\d+)*\]/gi, '')
    .replace(/\[Source\s*\d+(?:,\s*Source\s*\d+)*\]/gi, '')
    .trim();
}

export function ChatMessage({ message, onSelectCitation }: ChatMessageProps) {
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);
  const isUser = message.role === 'user';
  const rag = message.ragData;

  const handleFeedback = async (type: 'helpful' | 'not_helpful') => {
    if (feedback === type) return;
    setFeedback(type);
    try {
      await apiClient.post('/api/search/feedback', { queryId: message.id, feedback: type });
    } catch {
      // Ignore
    }
  };

  // ─── User bubble ────────────────────────────────────────────────────────────
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

  // ─── Assistant bubble ────────────────────────────────────────────────────────
  const isUnknown = rag && !rag.isCorpusGrounded;
  const cleanedContent = stripSourceMarkers(message.content);

  return (
    <div className="flex justify-start mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-3.5 max-w-3xl w-full">

        {/* Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-glow-accent mt-0.5">
          <Bot className="h-5 w-5" />
        </div>

        {/* Card */}
        <div className="flex-1 rounded-2xl glass-card border border-slate-800 shadow-xl overflow-hidden">

          {/* Top meta bar */}
          {rag && (
            <div className="flex items-center justify-between bg-slate-900/60 border-b border-slate-800/80 px-5 py-2.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 font-semibold text-brand-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  Gemini Grounded RAG
                </span>
                <span className="text-slate-700">•</span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px]">
                  <Clock className="h-3 w-3" />
                  {rag.executionTimeMs}ms
                </span>
                {rag.confidence > 0 && (
                  <>
                    <span className="text-slate-700">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Zap className="h-3 w-3 text-amber-400" />
                      <span className="text-amber-300 font-semibold">{(rag.confidence * 100).toFixed(0)}% confidence</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="p-5 space-y-4">
            {/* Grounding warning */}
            {isUnknown && (
              <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-xs text-amber-300">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>
                  <strong>Strict Grounding:</strong> The indexed document corpus does not contain sufficient facts
                  to answer this question. No hallucinated citations were created.
                </span>
              </div>
            )}

            {/* ── Markdown-rendered answer ── */}
            <div className="rag-prose text-sm leading-relaxed text-slate-100">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Headings
                  h1: ({ children }) => <h1 className="text-lg font-bold text-white mt-4 mb-2 border-b border-slate-700 pb-1">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-bold text-white mt-3 mb-1.5">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mt-2 mb-1">{children}</h3>,
                  // Paragraphs
                  p: ({ children }) => <p className="mb-2 last:mb-0 text-slate-100">{children}</p>,
                  // Lists
                  ul: ({ children }) => <ul className="list-disc list-inside space-y-1 mb-2 text-slate-200 pl-1">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 mb-2 text-slate-200 pl-1">{children}</ol>,
                  li: ({ children }) => <li className="text-slate-200 leading-relaxed">{children}</li>,
                  // Emphasis
                  strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                  em: ({ children }) => <em className="text-slate-300 italic">{children}</em>,
                  // Code
                  code: ({ children, className }) => {
                    const isBlock = className?.includes('language-');
                    return isBlock
                      ? <code className="block bg-slate-900 border border-slate-700 rounded-lg p-3 text-xs font-mono text-emerald-300 overflow-x-auto my-2 whitespace-pre">{children}</code>
                      : <code className="bg-slate-800 text-emerald-300 rounded px-1.5 py-0.5 text-xs font-mono">{children}</code>;
                  },
                  pre: ({ children }) => <pre className="my-2">{children}</pre>,
                  // Blockquotes
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-2 border-brand-500 pl-4 text-slate-300 italic my-2 bg-brand-500/5 py-1 rounded-r-lg">
                      {children}
                    </blockquote>
                  ),
                  // Horizontal rule
                  hr: () => <hr className="border-slate-700 my-3" />,
                  // Tables
                  table: ({ children }) => <div className="overflow-x-auto my-2"><table className="w-full text-xs border-collapse">{children}</table></div>,
                  thead: ({ children }) => <thead className="bg-slate-800/60">{children}</thead>,
                  th: ({ children }) => <th className="border border-slate-700 px-3 py-2 text-left font-semibold text-slate-200">{children}</th>,
                  td: ({ children }) => <td className="border border-slate-700 px-3 py-2 text-slate-300">{children}</td>,
                  tr: ({ children }) => <tr className="even:bg-slate-800/30">{children}</tr>,
                  // Links
                  a: ({ href, children }) => (
                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:text-brand-300 underline underline-offset-2 transition">
                      {children}
                    </a>
                  ),
                }}
              >
                {cleanedContent}
              </ReactMarkdown>
            </div>

            {/* ── Citation chips ── */}
            {rag?.citations && rag.citations.length > 0 && (
              <div className="pt-3 border-t border-slate-800/80 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <BookOpen className="h-3.5 w-3.5 text-brand-400" />
                  Verified Sources ({rag.citations.length})
                </div>

                <div className="flex flex-wrap gap-2 pt-0.5">
                  {rag.citations.map((citation, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSelectCitation(citation)}
                      title={`View excerpt from ${citation.filename}`}
                      className="group flex items-center gap-2 rounded-xl bg-slate-800/80 hover:bg-brand-500/15 border border-slate-700 hover:border-brand-500/50 px-3 py-2 text-xs text-slate-200 transition-all duration-150 shadow-sm hover:shadow-brand-500/10 hover:shadow-md"
                    >
                      {/* Numbered badge */}
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-500/20 text-brand-300 font-bold text-[10px] group-hover:bg-brand-500 group-hover:text-white transition">
                        {citation.sourceIndex || idx + 1}
                      </span>

                      {/* File-type icon */}
                      <span className="text-slate-400 group-hover:text-brand-300 transition shrink-0">
                        <CitationFileIcon filename={citation.filename} />
                      </span>

                      {/* Document label */}
                      <span className="font-medium truncate max-w-[180px] text-slate-200 group-hover:text-white transition">
                        {shortLabel(citation.documentTitle, citation.filename)}
                      </span>

                      {/* Optional page number */}
                      {citation.pageNumber && (
                        <span className="shrink-0 rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-400">
                          p.{citation.pageNumber}
                        </span>
                      )}

                      {/* Section tag */}
                      {citation.section && (
                        <span className="hidden sm:inline shrink-0 rounded bg-brand-500/10 border border-brand-500/20 px-1.5 py-0.5 text-[10px] text-brand-400 font-medium truncate max-w-[100px]">
                          {citation.section}
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
  );
}
