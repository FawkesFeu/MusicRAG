'use client';

import React, { useState } from 'react';
import { apiClient } from '../lib/api-client';
import { X, UserPlus, Shield, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import type { UserRole } from '@rag/shared';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

export function UserManagementModal({ isOpen, onClose, onUserCreated }: UserManagementModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl glass-panel p-6 border border-slate-800 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create New Account</h2>
              <p className="text-xs text-slate-400">Admin Privileged User Creation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
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
            <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1">Temporary Password</label>
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
              className="px-4 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-500 text-xs font-semibold shadow-glow-brand flex items-center gap-2"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              <span>Create Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
