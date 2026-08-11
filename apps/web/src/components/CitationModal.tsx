'use client';

import React, { useState } from 'react';
import { X, FileText, Copy, Check, Bookmark, ChevronDown, ChevronRight } from 'lucide-react';
import type { Citation } from '@rag/shared';

export interface GroupedCitation {
  filename: string;
  documentTitle: string;
  /** All chunks from this file, in sourceIndex order */
  chunks: Citation[];
  /** The lowest sourceIndex assigned (used for display badge number) */
  displayIndex: number;
}

interface CitationModalProps {
  citation: GroupedCitation | null;
  onClose: () => void;
}

function ChunkCard({ chunk, index, defaultOpen }: { chunk: Citation; index: number; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(chunk.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl border border-dark-border overflow-hidden">
      {/* Chunk header — clickable to toggle */}
      <button
        className="w-full flex items-center justify-between bg-dark-card/60 px-4 py-3 text-xs text-left group hover:bg-slate-800/60 transition"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-brand-500/20 text-brand-300 font-bold text-[10px]">
            {index + 1}
          </span>
          <div className="flex items-center gap-2 text-slate-300 truncate">
            {chunk.section && (
              <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2 py-0.5 shrink-0">
                <Bookmark className="h-3 w-3" />
                {chunk.section}
              </span>
            )}
            {chunk.heading && (
              <span className="text-slate-400 truncate">{chunk.heading}</span>
            )}
            {!chunk.section && !chunk.heading && (
              <span className="text-slate-500">Chunk excerpt {index + 1}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleCopy(); }}
            className="p-1 rounded text-slate-500 hover:text-slate-200 transition"
            title="Copy chunk"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          {open ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {/* Chunk content */}
      {open && (
        <div className="bg-dark-bg/60 px-4 py-3">
          <p className="font-mono text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
            {chunk.content}
          </p>
        </div>
      )}
    </div>
  );
}

export function CitationModal({ citation, onClose }: CitationModalProps) {
  if (!citation) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl glass-panel border border-slate-700/60 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-dark-border px-6 py-4 bg-dark-card/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-white truncate">{citation.documentTitle}</h3>
              <p className="text-xs font-mono text-slate-400 truncate">{citation.filename}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="ml-4 shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-dark-hover hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Sub-header: chunk count */}
        <div className="flex items-center gap-2 px-6 py-2.5 bg-slate-900/40 border-b border-dark-border text-xs text-slate-400">
          <span className="font-semibold text-slate-300">{citation.chunks.length} chunk{citation.chunks.length > 1 ? 's' : ''}</span>
          <span>retrieved from this document</span>
        </div>

        {/* Chunks list */}
        <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
          {citation.chunks.map((chunk, idx) => (
            <ChunkCard key={idx} chunk={chunk} index={idx} defaultOpen={idx === 0} />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-dark-border px-6 py-4 bg-dark-card/40">
          <button
            onClick={onClose}
            className="rounded-lg bg-brand-600 px-4 py-2 text-xs font-medium text-white shadow-glow-brand hover:bg-brand-500 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
