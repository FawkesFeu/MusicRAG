'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../contexts/AuthContext';
import { apiClient, setAuthTokens } from '../../../lib/api-client';
import {
  Sparkles,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Shield,
  Mail,
} from 'lucide-react';
import type { UserRole } from '@rag/shared';

function RegisterForm() {
  const { register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('inviteToken');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [invitedRole, setInvitedRole] = useState<UserRole | null>(null);
  const [validatingInvite, setValidatingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validate invitation token if provided in URL
  useEffect(() => {
    if (!inviteToken) return;

    const validateToken = async () => {
      setValidatingInvite(true);
      setInviteError(null);
      try {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API_URL}/api/auth/invitation/${inviteToken}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Invalid or expired invitation token.');
        }

        setEmail(data.data.email);
        setInvitedRole(data.data.role);
      } catch (err: any) {
        setInviteError(err.message || 'Invitation link is no longer valid.');
      } finally {
        setValidatingInvite(false);
      }
    };

    validateToken();
  }, [inviteToken]);

  // Live Password Strength Criteria Checks
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSymbol = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password);
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && hasSymbol;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPasswordValid) {
      setError('Please satisfy all password security requirements below.');
      return;
    }

    setLoading(true);

    try {
      if (inviteToken && invitedRole) {
        // Accept invitation flow
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API_URL}/api/auth/accept-invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: inviteToken,
            name,
            password,
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to accept invitation.');
        }

        setAuthTokens(data.data.accessToken, data.data.refreshToken);
        if (typeof window !== 'undefined') {
          localStorage.setItem('rag_user', JSON.stringify(data.data.user));
        }

        if (data.data.user.role === 'admin') {
          router.replace('/dashboard');
        } else {
          router.replace('/chat');
        }
      } else {
        // Standard registration
        await register(name, email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (validatingInvite) {
    return (
      <div className="flex flex-col items-center justify-center p-8 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-brand-400" />
        <p className="text-xs text-slate-400 font-mono">Validating invitation token...</p>
      </div>
    );
  }

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-3xl glass-panel p-8 border border-slate-800 shadow-2xl space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-600 to-cyan-400 text-white shadow-glow-brand mb-4">
          <Sparkles className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {invitedRole ? 'Accept Team Invitation' : 'Create Account'}
        </h1>
        <p className="text-xs text-slate-400">
          {invitedRole
            ? 'Complete your profile to access Playable Factory RAG'
            : 'Join Playable Factory Vector Search Platform'}
        </p>
      </div>

      {invitedRole && (
        <div className="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-purple-300 font-semibold">
            {invitedRole === 'admin' ? (
              <ShieldCheck className="h-4 w-4" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            <span>Invited Role: {invitedRole.toUpperCase()}</span>
          </div>
          <span className="text-[11px] text-purple-400 font-mono">Verified Invite</span>
        </div>
      )}

      {inviteError && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3.5 text-xs text-amber-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{inviteError}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs text-red-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Morgan"
            className="w-full rounded-xl border border-dark-border bg-dark-card px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            required
            readOnly={!!invitedRole}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@example.com"
            className={`w-full rounded-xl border border-dark-border bg-dark-card px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 ${
              invitedRole ? 'opacity-80 cursor-not-allowed text-slate-300' : ''
            }`}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            Password Setup
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min 8 chars, uppercase, number, symbol"
            className="w-full rounded-xl border border-dark-border bg-dark-card px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />

          {/* Live Password Checklist */}
          {password.length > 0 && (
            <div className="mt-2.5 space-y-1.5 rounded-xl bg-slate-900/60 p-3 border border-slate-800 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
                <span className="font-semibold text-slate-300">Password Policy Requirements:</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasMinLength ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasMinLength ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                <span>At least 8 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasUpper ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                <span>At least one uppercase letter (A-Z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasLower ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                <span>At least one lowercase letter (a-z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasNumber ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                <span>At least one number (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasSymbol ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasSymbol ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                <span>At least one special symbol (!@#$%^&*...)</span>
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-glow-brand transition hover:bg-brand-500 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <span>{invitedRole ? 'Accept Invite & Join' : 'Create Standard Account'}</span>
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>

      <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-brand-400 hover:text-brand-300">
          Sign In
        </Link>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-dark-bg">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-brand-500/10 blur-[120px] pointer-events-none" />
      <Suspense fallback={<div className="h-8 w-8 animate-spin text-brand-500" />}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}
