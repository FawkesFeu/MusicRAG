'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, MessageSquare, Trash2, Loader2, HelpCircle } from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { ChatMessage, MessageItem } from '../../../components/ChatMessage';

const SAMPLE_QUESTIONS = [
  'What are the integrated LUFS targets and true peak limits for Spotify vs Apple Music?',
  'How does the pro-rata streaming royalty model work compared to the user-centric model?',
  'What two licenses are required for a commercial sync placement in a film or TV show?',
  'What is the difference between an ISRC code and an ISWC code?',
  'What revenue streams does a record label participate in under a 360 deal?',
  'What is the company vacation and salary policy?',
];

export default function ChatPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Typewriter pacing refs
  const tokenQueueRef = useRef<string[]>([]);
  const isTypingRef = useRef<boolean>(false);
  const pendingDoneRef = useRef<any>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeMsgIdRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load chat history from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('rag_chat_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (e) {
      console.warn('Failed to load chat history from localStorage:', e);
    }
  }, []);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const sanitized = messages.map((m) => ({ ...m, isStreaming: false }));
        localStorage.setItem('rag_chat_history', JSON.stringify(sanitized));
      } catch (e) {
        console.warn('Failed to persist chat history:', e);
      }
    }
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const stopTypewriter = () => {
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = null;
    }
    isTypingRef.current = false;
    tokenQueueRef.current = [];
    pendingDoneRef.current = null;
    activeMsgIdRef.current = null;
  };

  const startTypewriter = (assistantMsgId: string) => {
    activeMsgIdRef.current = assistantMsgId;
    if (isTypingRef.current) return;
    isTypingRef.current = true;

    const processNext = () => {
      if (tokenQueueRef.current.length > 0) {
        const qLen = tokenQueueRef.current.length;
        const popCount = qLen > 30 ? 3 : qLen > 12 ? 2 : 1;
        const nextTokens = tokenQueueRef.current.splice(0, popCount).join('');

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: msg.content + nextTokens }
              : msg
          )
        );

        const delay = qLen > 25 ? 12 : 22;
        typingTimerRef.current = setTimeout(processNext, delay);
      } else if (pendingDoneRef.current) {
        const doneData = pendingDoneRef.current;
        pendingDoneRef.current = null;
        isTypingRef.current = false;
        activeMsgIdRef.current = null;

        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: doneData.answer || msg.content,
                  ragData: doneData,
                  isStreaming: false,
                }
              : msg
          )
        );
        setLoading(false);
      } else {
        typingTimerRef.current = setTimeout(processNext, 25);
      }
    };

    processNext();
  };

  const handleSendMessage = async (queryText?: string) => {
    const text = queryText || input.trim();
    if (!text || loading) return;

    stopTypewriter();
    setInput('');
    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `asst-${Date.now()}`;

    const userMessage: MessageItem = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const initialAssistantMessage: MessageItem = {
      id: assistantMsgId,
      role: 'assistant',
      content: '',
      isStreaming: true,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, initialAssistantMessage]);
    setLoading(true);

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    let finalDoneData: any = null;

    try {
      await apiClient.streamSearch(
        {
          query: text,
          topK: 5,
          generateAnswer: true,
        },
        {
          onMetadata: (_meta) => {},
          onDelta: (delta) => {
            const tokens = delta.match(/\s+|[^\s]+/g) || [delta];
            tokenQueueRef.current.push(...tokens);
            startTypewriter(assistantMsgId);
          },
          onDone: (doneData) => {
            finalDoneData = doneData;
            pendingDoneRef.current = doneData;
            startTypewriter(assistantMsgId);
          },
          onError: (err) => {
            stopTypewriter();
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMsgId
                  ? {
                      ...msg,
                      content: `Error: ${err.message || 'Network error'}`,
                      isStreaming: false,
                    }
                  : msg
              )
            );
            setLoading(false);
          },
        },
        abortController.signal
      );

      // Ensure final state and citations are always locked in when stream concludes
      if (finalDoneData) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: finalDoneData.answer || msg.content,
                  ragData: finalDoneData,
                  isStreaming: false,
                }
              : msg
          )
        );
        stopTypewriter();
        setLoading(false);
      }
    } catch (err: any) {
      stopTypewriter();
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsgId
            ? {
                ...msg,
                content: `Error: ${err.message || 'Network error'}`,
                isStreaming: false,
              }
            : msg
        )
      );
      setLoading(false);
    }
  };

  const handleClearHistory = () => {
    stopTypewriter();
    if (abortControllerRef.current) abortControllerRef.current.abort();
    setMessages([]);
    try {
      localStorage.removeItem('rag_chat_history');
    } catch {}
    setLoading(false);
  };


  return (
    <div className="flex-1 flex flex-col max-w-6xl w-full mx-auto px-2 py-3 sm:px-6 sm:py-6">
      {/* Chat Container — citation modals are rendered inside each ChatMessage */}
      <div className="flex-1 flex flex-col rounded-2xl sm:rounded-3xl glass-panel border border-slate-800 shadow-2xl overflow-hidden min-h-[75vh] sm:min-h-[80vh]">
        {/* Chat Header */}
        <div className="flex items-center justify-between border-b border-dark-border px-3.5 py-3 sm:px-6 sm:py-4 bg-dark-card/60">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 text-white shadow-glow-brand shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-1.5 sm:gap-2">
                <span>Knowledge Assistant</span>
                <span className="rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20 px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold">
                  Gemini 3.5 Flash-Lite
                </span>
              </h2>
              <p className="hidden sm:block text-xs text-slate-400">
                Grounded semantic search with citations & document references
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              title="Clear chat history"
              className="flex items-center gap-1 sm:gap-1.5 rounded-lg border border-dark-border bg-dark-card px-2.5 py-1 sm:px-3 sm:py-1.5 text-xs text-slate-400 hover:text-red-400 hover:border-red-500/30 transition"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>

        {/* Message Thread Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-3 sm:space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8 space-y-4 sm:space-y-6 animate-in fade-in duration-300">
              <div className="flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl sm:rounded-3xl bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-glow-brand">
                <MessageSquare className="h-6 w-6 sm:h-8 sm:w-8" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-white">Ask Anything About Music Industry & Audio Specs</h3>
                <p className="text-xs leading-relaxed text-slate-400">
                  Search across streaming royalties, sync licensing, DAW specs, metadata standards, label contracts, and copyright clearance. Every answer is grounded with source citations.
                </p>
              </div>

              {/* Sample Prompt Chips */}
              <div className="w-full max-w-2xl space-y-2 pt-2 sm:pt-4">
                <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1.5">
                  <HelpCircle className="h-3.5 w-3.5 text-brand-400" />
                  Recommended Sample Queries from Corpus
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                  {SAMPLE_QUESTIONS.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(q)}
                      className="group flex items-start gap-2.5 rounded-xl sm:rounded-2xl glass-card p-3 sm:p-3.5 text-xs text-slate-300 hover:text-white hover:border-brand-500/40 hover:bg-slate-800/80 transition text-left"
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
              />
            ))
          )}

          {loading && !messages.some((m) => m.isStreaming) && (
            <div className="flex items-center gap-2.5 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl glass-card border border-slate-800 animate-pulse text-xs text-brand-300">
              <Loader2 className="h-4 w-4 animate-spin text-brand-400 shrink-0" />
              <span>Searching pgvector & synthesizing grounded answer with citations...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="border-t border-dark-border p-2.5 sm:p-4 bg-dark-card/40">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 sm:gap-3"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question about the corpus (e.g., Spotify LUFS, sync licenses, ISRC codes)..."
              disabled={loading}
              className="flex-1 rounded-xl sm:rounded-2xl border border-dark-border bg-dark-bg/80 px-3.5 py-2.5 sm:px-5 sm:py-3.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl sm:rounded-2xl bg-brand-600 text-white shadow-glow-brand hover:bg-brand-500 disabled:opacity-40 transition"
              title="Search and Generate Answer"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
              ) : (
                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
