'use client';

import React, { useState } from 'react';
import { Bot, User, Sparkles, AlertCircle, ThumbsUp, ThumbsDown, BookOpen, Clock } from 'lucide-react';
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

export function ChatMessage({ message, onSelectCitation }: ChatMessageProps) {
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);
  const isUser = message.role === 'user';
  const rag = message.ragData;

  const handleFeedback = async (type: 'helpful' | 'not_helpful') => {
    if (feedback === type) return;
    setFeedback(type);
    try {
      await apiClient.post('/api/search/feedback', {
        queryId: message.id,
        feedback: type,
      });
    } catch {
      // Ignore
    }
  };

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

  const isUnknown = rag && !rag.isCorpusGrounded;

  return (
    <div className="flex justify-start mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-start gap-3.5 max-w-3xl w-full">
        {/* Assistant Avatar */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-glow-accent">
          <Bot className="h-5 w-5" />
        </div>

        {/* Message Card */}
        <div className="flex-1 rounded-2xl glass-card p-5 border border-slate-800 shadow-xl space-y-4">
          {/* Header info badge */}
          {rag && (
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 text-xs text-slate-400">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 font-semibold text-brand-400">
                  <Sparkles className="h-3.5 w-3.5" />
                  Gemini Grounded RAG
                </span>
                <span className="text-slate-600">•</span>
                <span className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-400">
                  <Clock className="h-3 w-3" />
                  {rag.executionTimeMs}ms
                </span>
              </div>

              {rag.confidence > 0 && (
                <span className="rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-semibold">
                  {(rag.confidence * 100).toFixed(0)}% Confidence
                </span>
              )}
            </div>
          )}

          {/* Warning banner if question is not answered by corpus */}
          {isUnknown && (
            <div className="flex items-center gap-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3 text-xs text-amber-300">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>
                <strong>Strict Grounding:</strong> The indexed document corpus does not contain sufficient facts to answer this question. No hallucinated citations were created.
              </span>
            </div>
          )}

          {/* Main Answer Content */}
          <div className="text-sm leading-relaxed text-slate-100 whitespace-pre-wrap font-sans">
            {message.content}
          </div>

          {/* Citations & Sources Section */}
          {rag?.citations && rag.citations.length > 0 && (
            <div className="pt-3 border-t border-slate-800/80 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <BookOpen className="h-3.5 w-3.5 text-brand-400" />
                Verified Sources ({rag.citations.length}):
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {rag.citations.map((citation, idx) => (
                  <button
                    key={idx}
                    onClick={() => onSelectCitation(citation)}
                    className="group flex items-center gap-2 rounded-xl bg-slate-800/80 hover:bg-brand-500/15 border border-slate-700 hover:border-brand-500/40 px-3 py-1.5 text-xs text-slate-200 transition"
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-500/20 text-brand-300 font-bold text-[10px] group-hover:bg-brand-500 group-hover:text-white transition">
                      {citation.sourceIndex || idx + 1}
                    </span>
                    <span className="font-medium truncate max-w-[200px]">
                      {citation.documentTitle}
                    </span>
                    {citation.pageNumber && (
                      <span className="text-[10px] text-slate-400">p.{citation.pageNumber}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Feedback buttons */}
          <div className="flex items-center justify-end gap-1.5 pt-1 text-slate-400">
            <span className="text-[11px] text-slate-500 mr-1">Was this grounded answer helpful?</span>
            <button
              onClick={() => handleFeedback('helpful')}
              className={`rounded-lg p-1.5 transition ${
                feedback === 'helpful'
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : 'hover:bg-dark-hover hover:text-slate-200'
              }`}
              title="Helpful"
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => handleFeedback('not_helpful')}
              className={`rounded-lg p-1.5 transition ${
                feedback === 'not_helpful'
                  ? 'bg-red-500/20 text-red-400'
                  : 'hover:bg-dark-hover hover:text-slate-200'
              }`}
              title="Not helpful"
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
