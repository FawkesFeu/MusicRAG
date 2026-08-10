'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageSquare, BookOpen, Trash2, ArrowRight, Loader2, HelpCircle } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { ChatMessage, MessageItem } from '../../../components/ChatMessage';
import { CitationModal } from '../../../components/CitationModal';
import type { Citation } from '@rag/shared';

const SAMPLE_QUESTIONS = [
  'What is the maximum file size for an AppLovin playable, and how does it ship?',
  'How do I initialize the current Lumen SDK, and what happened to lumen.track?',
  'Why are sound assets built in a separate pass?',
  'What caused the March 2026 AppLovin rejections and what was fixed?',
  'Which languages must every playable ship with, and what is the fallback?',
  'What is the company vacation and salary policy?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (queryText?: string) => {
    const text = queryText || input.trim();
    if (!text || loading) return;

    setInput('');
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `asst-${Date.now()}`;

    // Add user message
    const userMessage: MessageItem = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setLoading(true);

    try {
      const response = await apiClient.post('/api/search', {
        query: text,
        topK: 5,
        generateAnswer: true,
      });

      const assistantMessage: MessageItem = {
        id: assistantMsgId,
        role: 'assistant',
        content: response.answer,
        ragData: response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: MessageItem = {
        id: assistantMsgId,
        role: 'assistant',
        content: `Error retrieving grounded answer: ${err.message || 'Network error'}. Please ensure the backend is running.`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    setMessages([]);
  };

  return (
    <div className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-4 py-6 sm:px-6">
      {/* Citation Details Modal */}
      <CitationModal citation={selectedCitation} onClose={() => setSelectedCitation(null)} />

      {/* Chat Container */}
      <div className="flex-1 flex flex-col rounded-3xl glass-panel border border-slate-800 shadow-2xl overflow-hidden min-h-[75vh]">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-dark-border px-6 py-4 bg-dark-card/60">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-glow-brand">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Knowledge Base Assistant
                <span className="rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 text-[10px] font-semibold">
                  Gemini 2.0 Flash
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Grounded semantic search with citations & document references
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              title="Clear chat history"
              className="flex items-center gap-1.5 rounded-lg border border-dark-border bg-dark-card px-3 py-1.5 text-xs text-slate-400 hover:text-red-400 hover:border-red-500/30 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>

        {/* Message Thread Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-6 animate-in fade-in duration-300">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-glow-brand">
                <MessageSquare className="h-8 w-8" />
              </div>
              <div className="max-w-md space-y-2">
                <h3 className="text-lg font-bold text-white">Ask Anything About Playables</h3>
                <p className="text-xs leading-relaxed text-slate-400">
                  Search across network specs, SDK guidelines, build pipelines, postmortems, and release notes. Every answer is grounded with source citations.
                </p>
              </div>

              {/* Sample Prompt Chips */}
              <div className="w-full max-w-2xl space-y-2.5 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-brand-400" />
                  Recommended Sample Queries from Case Study
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {SAMPLE_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      className="group flex items-start gap-2.5 rounded-2xl glass-card p-3.5 text-xs text-slate-300 hover:text-white hover:border-brand-500/40 hover:bg-slate-800/80 transition text-left"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-500/10 text-brand-400 font-bold text-[10px] group-hover:bg-brand-500 group-hover:text-white transition mt-0.5">
                        {idx + 1}
                      </span>
                      <span className="flex-1 font-medium">{q}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onSelectCitation={(citation) => setSelectedCitation(citation)}
              />
            ))
          )}

          {loading && (
            <div className="flex items-center gap-3 p-4 rounded-2xl glass-card border border-slate-800 animate-pulse text-xs text-brand-300">
              <Loader2 className="h-4 w-4 animate-spin text-brand-400" />
              <span>Searching pgvector & synthesizing grounded answer with citations...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-dark-border p-4 bg-dark-card/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about the corpus (e.g., AppLovin specs, Lumen SDK v3, build pipeline)..."
              disabled={loading}
              className="flex-1 rounded-2xl border border-dark-border bg-dark-bg/80 px-5 py-3.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-glow-brand hover:bg-brand-500 disabled:opacity-40 transition"
              title="Search and Generate Answer"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
