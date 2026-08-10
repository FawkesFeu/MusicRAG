'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../contexts/AuthContext';
import { Sparkles, Shield, User, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { DEMO_CREDENTIALS } from '@rag/shared';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (role: 'admin' | 'user') => {
    const creds = role === 'admin' ? DEMO_CREDENTIALS.ADMIN : DEMO_CREDENTIALS.USER;
    setEmail(creds.email);
    setPassword(creds.password);
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-dark-bg">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 h-80 w-80 rounded-full bg-purple-500/10 blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md overflow-hidden rounded-3xl glass-panel p-8 border border-slate-800 shadow-2xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-400 text-white shadow-glow-brand mb-4">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Welcome Back</h1>
          <p className="text-xs text-slate-400">
            Sign in to access semantic search and the knowledge base
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-xl border border-dark-border bg-dark-card px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-dark-border bg-dark-card px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-glow-brand hover:bg-brand-500 disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Quick Fill Demo Credentials */}
        <div className="pt-2 border-t border-slate-800 space-y-3">
          <p className="text-center text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            1-Click Demo Credentials
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              className="flex items-center justify-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 hover:bg-amber-500/20 py-2 px-3 text-xs font-semibold text-amber-300 transition"
            >
              <Shield className="h-3.5 w-3.5" />
              Fill Admin
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('user')}
              className="flex items-center justify-center gap-2 rounded-xl border border-brand-500/20 bg-brand-500/10 hover:bg-brand-500/20 py-2 px-3 text-xs font-semibold text-brand-300 transition"
            >
              <User className="h-3.5 w-3.5" />
              Fill User
            </button>
          </div>
        </div>

        {/* Footer Link */}
        <div className="text-center text-xs text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="font-semibold text-brand-400 hover:underline">
            Create account
          </Link>
        </div>
      </div>
    </div>
  );
}
