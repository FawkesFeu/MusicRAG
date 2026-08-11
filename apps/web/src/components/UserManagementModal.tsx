'use client';

import React, { useState } from 'react';
import { apiClient } from '../lib/api-client';
import {
  X,
  UserPlus,
  Shield,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Mail,
  Link as LinkIcon,
  Copy,
  Check,
  Sparkles,
} from 'lucide-react';
import type { UserRole } from '@rag/shared';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

export function UserManagementModal({ isOpen, onClose, onUserCreated }: UserManagementModalProps) {
  const [activeMode, setActiveMode] = useState<'invite' | 'direct'>('invite');

  // Invite Mode State
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('user');
  const [inviteDurationHours, setInviteDurationHours] = useState(48);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Direct Creation State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post('/api/auth/admin/invitations', {
        email: inviteEmail,
        role: inviteRole,
        expiresInHours: Number(inviteDurationHours),
      });

      const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
      const link = `${origin}/register?inviteToken=${res.token}`;
      setGeneratedInviteLink(link);
      onUserCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to generate invitation link.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!generatedInviteLink) return;
    navigator.clipboard.writeText(generatedInviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await apiClient.post('/api/auth/admin/create-user', {
        name,
        email,
        password,
        role,
      });
      setName('');
      setEmail('');
      setPassword('');
      setRole('user');
      onUserCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create user.');
    } finally {
      setLoading(false);
    }
  };

  const resetInviteState = () => {
    setInviteEmail('');
    setInviteRole('user');
    setGeneratedInviteLink(null);
    setCopied(false);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl glass-panel p-6 border border-slate-800 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Team Member</h2>
              <p className="text-xs text-slate-400">Generate secure invite links or assign credentials directly</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-dark-bg border border-dark-border">
          <button
            type="button"
            onClick={() => {
              setActiveMode('invite');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
              activeMode === 'invite'
                ? 'bg-brand-600 text-white shadow-glow-brand'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mail className="h-3.5 w-3.5" />
            <span>Generate Invite Link</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveMode('direct');
              setError(null);
            }}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold transition ${
              activeMode === 'direct'
                ? 'bg-brand-600 text-white shadow-glow-brand'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Direct Account Setup</span>
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* MODE 1: GENERATE INVITATION LINK */}
        {activeMode === 'invite' && (
          <>
            {!generatedInviteLink ? (
              <form onSubmit={handleGenerateInvite} className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Invited Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="e.g. dev@playablefactory.com"
                    className="w-full rounded-xl border border-dark-border bg-dark-card px-3.5 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    The user will complete password setup upon clicking their unique invite link.
                  </p>
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Assigned Role
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setInviteRole('user')}
                      className={`flex items-center justify-center gap-2 rounded-xl p-2.5 border text-xs font-semibold transition ${
                        inviteRole === 'user'
                          ? 'bg-brand-500/10 border-brand-500 text-brand-300'
                          : 'bg-dark-card border-dark-border text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                      <span>Standard User</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setInviteRole('admin')}
                      className={`flex items-center justify-center gap-2 rounded-xl p-2.5 border text-xs font-semibold transition ${
                        inviteRole === 'admin'
                          ? 'bg-purple-500/10 border-purple-500 text-purple-300 shadow-glow-purple'
                          : 'bg-dark-card border-dark-border text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Administrator</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Link Validity Duration
                  </label>
                  <select
                    value={inviteDurationHours}
                    onChange={(e) => setInviteDurationHours(Number(e.target.value))}
                    className="w-full rounded-xl border border-dark-border bg-dark-card px-3.5 py-2 text-xs text-white focus:border-brand-500 focus:outline-none"
                  >
                    <option value={24}>24 Hours (1 Day)</option>
                    <option value={48}>48 Hours (2 Days - Recommended)</option>
                    <option value={168}>7 Days (1 Week)</option>
                  </select>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-glow-brand transition disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}
                    <span>Generate Invite Link</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Sparkles className="h-4 w-4" />
                    <span>Invite Link Ready for {inviteEmail}</span>
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Send this link to the team member. It grants access with the{' '}
                    <strong className="text-emerald-300 uppercase">{inviteRole}</strong> role.
                  </p>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-dark-bg border border-dark-border">
                  <input
                    type="text"
                    readOnly
                    value={generatedInviteLink}
                    className="w-full bg-transparent font-mono text-[11px] text-slate-200 focus:outline-none select-all"
                  />
                  <button
                    onClick={handleCopyInviteLink}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-brand-600 hover:bg-brand-500 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={resetInviteState}
                    className="text-xs text-brand-400 hover:underline"
                  >
                    ← Invite another member
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* MODE 2: DIRECT USER ACCOUNT SETUP */}
        {activeMode === 'direct' && (
          <form onSubmit={handleDirectSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Elena Rostova"
                className="w-full rounded-xl border border-dark-border bg-dark-card px-3.5 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. elena@playablefactory.com"
                className="w-full rounded-xl border border-dark-border bg-dark-card px-3.5 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Password Setup
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min 8 chars, uppercase, number, symbol"
                className="w-full rounded-xl border border-dark-border bg-dark-card px-3.5 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Assigned Role</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 border text-xs font-semibold transition ${
                    role === 'user'
                      ? 'bg-brand-500/10 border-brand-500 text-brand-300'
                      : 'bg-dark-card border-dark-border text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>Standard User</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole('admin')}
                  className={`flex items-center justify-center gap-2 rounded-xl p-2.5 border text-xs font-semibold transition ${
                    role === 'admin'
                      ? 'bg-purple-500/10 border-purple-500 text-purple-300 shadow-glow-purple'
                      : 'bg-dark-card border-dark-border text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>Administrator</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-glow-brand transition disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                <span>Create Account</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
