'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, LayoutDashboard, LogOut, Sparkles, Shield, User as UserIcon } from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-dark-border bg-dark-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href="/chat" className="flex items-center gap-2.5 transition hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 text-white shadow-glow-brand">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight text-white">
                Playable<span className="text-brand-400">RAG</span>
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400">
                Vector Search Engine
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="ml-8 hidden md:flex items-center gap-1">
            <Link
              href="/chat"
              className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                pathname.startsWith('/chat')
                  ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-sm'
                  : 'text-slate-400 hover:bg-dark-card hover:text-slate-200'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Chat Assistant
            </Link>

            {isAdmin && (
              <Link
                href="/dashboard"
                className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  pathname.startsWith('/dashboard')
                    ? 'bg-brand-500/10 text-brand-400 border border-brand-500/20 shadow-sm'
                    : 'text-slate-400 hover:bg-dark-card hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Admin Dashboard
              </Link>
            )}
          </nav>
        </div>

        {/* User profile & Actions */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-medium text-slate-200">{user.name}</span>
                <span className="flex items-center justify-end gap-1 text-xs text-slate-400">
                  {isAdmin ? (
                    <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      <Shield className="h-2.5 w-2.5" /> ADMIN
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                      <UserIcon className="h-2.5 w-2.5" /> USER
                    </span>
                  )}
                  {user.email}
                </span>
              </div>

              <button
                onClick={() => logout()}
                title="Logout"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-dark-border bg-dark-card text-slate-400 transition hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 hover:bg-dark-card transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-glow-brand hover:bg-brand-500 transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
