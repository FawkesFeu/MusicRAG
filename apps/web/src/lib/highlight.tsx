import React from 'react';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
  'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were',
  'will', 'with', 'what', 'how', 'why', 'where', 'when', 'which', 'who', 'does',
  'do', 'did', 'about', 'can', 'could', 'should', 'would', 'or', 'if', 'then',
  'into', 'up', 'out', 'my', 'your', 'their', 'our', 'them', 'they', 'this',
  'these', 'those', 'during', 'before', 'after', 'above', 'below', 'between',
  'much', 'many', 'some', 'any', 'tell', 'me', 'give', 'show', 'please'
]);

export function extractSearchKeywords(query?: string): string[] {
  if (!query || typeof query !== 'string') return [];

  // Match words, hyphenated words, dots (e.g. spotify, LUFS, ISRC, ASCAP)
  const rawTokens = query
    .replace(/["'?.,!]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim().toLowerCase())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));

  return Array.from(new Set(rawTokens));
}

export function highlightText(
  text: string,
  keywords: string[],
  active: boolean = true
): React.ReactNode {
  if (!text || !keywords || keywords.length === 0 || !active) {
    return text;
  }

  // Escape special regex characters
  const escaped = keywords
    .filter((k) => k.length > 1)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

  if (escaped.length === 0) return text;

  const regex = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(regex);

  return parts.map((part, idx) => {
    const isMatch = keywords.some(
      (kw) => kw.toLowerCase() === part.toLowerCase()
    );

    if (isMatch) {
      return (
        <mark
          key={idx}
          className="bg-amber-400/25 text-amber-200 border border-amber-400/40 rounded px-1 py-0.5 font-semibold shadow-sm"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}
