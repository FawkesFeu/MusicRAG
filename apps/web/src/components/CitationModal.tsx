'use client';

import React, { useState } from 'react';
import { X, FileText, Copy, Check, ExternalLink, Bookmark } from 'lucide-react';
import type { Citation, SearchResult } from '@rag/shared';

interface CitationModalProps {
  citation: Citation | SearchResult | null;
  onClose: () => void;
}

export function CitationModal({ citation, onClose }: CitationModalProps) {
  const [copied, setCopied] = useState(false);

  if (!citation) return null;

  const title = citation.documentTitle;
  const filename = citation.filename;
  const content = citation.content;
  const searchRes = 'metadata' in citation ? (citation as SearchResult) : null;
  const citationObj = 'section' in citation ? (citation as Citation) : null;
  const section = citationObj?.section || searchRes?.metadata?.section;
  const heading = citationObj?.heading || searchRes?.metadata?.heading;
  const similarity = searchRes?.similarity;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl glass-panel border border-slate-700/60 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-dark-border px-6 py-4 bg-dark-card/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">{title}</h3>
              <p className="text-xs font-mono text-slate-400">{filename}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-dark-hover hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Metadata badges */}
          <div className="flex flex-wrap gap-2 text-xs">
            {section && (
              <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 px-2.5 py-1">
                <Bookmark className="h-3 w-3" /> Section: {section}
              </span>
            )}
            {heading && (
              <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 px-2.5 py-1">
                Heading: {heading}
              </span>
            )}
            {similarity !== undefined && (
              <span className="inline-flex items-center rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 px-2.5 py-1 font-mono">
                Cosine Similarity: {(similarity * 100).toFixed(1)}%
              </span>
            )}
          </div>

          {/* Passage Content */}
          <div className="rounded-xl border border-dark-border bg-dark-bg/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Source Chunk Excerpt:
            </p>
            <div className="font-mono text-sm leading-relaxed text-slate-200 whitespace-pre-wrap">
              {content}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-dark-border px-6 py-4 bg-dark-card/40">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-lg border border-dark-border bg-dark-card px-4 py-2 text-xs font-medium text-slate-300 hover:bg-dark-hover hover:text-white transition"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                Copied to clipboard
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy excerpt
              </>
            )}
          </button>

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
