'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, LayoutDashboard, LogOut, Sparkles, Shield, User as UserIcon, Menu, X } from 'lucide-react';

export function Header() {
  const pathname = usePathname();
  const { user, logout, isAdmin } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-dark-border bg-dark-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-3 sm:px-6 lg:px-8">
        {/* Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/chat" className="flex items-center gap-2 sm:gap-2.5 transition hover:opacity-90">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 to-cyan-400 text-white shadow-glow-brand shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-bold tracking-tight text-white">
                Playable<span className="text-brand-400">RAG</span>
              </span>
              <span className="hidden sm:inline text-[10px] uppercase tracking-wider text-slate-400">
                Vector Search Engine
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="ml-6 hidden md:flex items-center gap-1.5">
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

        {/* Mobile Quick Tab Switcher (Visible on small screens for instant 1-tap navigation) */}
        {user && (
          <div className="flex md:hidden items-center gap-1 bg-dark-card/90 p-1 rounded-xl border border-dark-border">
            <Link
              href="/chat"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                pathname.startsWith('/chat')
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Chat</span>
            </Link>

            {isAdmin && (
              <Link
                href="/dashboard"
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  pathname.startsWith('/dashboard')
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Dashboard</span>
              </Link>
            )}
          </div>
        )}

        {/* User Profile & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* Desktop User Info */}
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
                  <span className="max-w-[120px] truncate">{user.email}</span>
                </span>
              </div>

              {/* Desktop Logout Button */}
              <button
                onClick={() => logout()}
                title="Logout"
                className="hidden sm:flex h-9 w-9 items-center justify-center rounded-lg border border-dark-border bg-dark-card text-slate-400 transition hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400"
              >
                <LogOut className="h-4 w-4" />
              </button>

              {/* Mobile Hamburger / Profile Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="flex sm:hidden h-8 w-8 items-center justify-center rounded-lg border border-dark-border bg-dark-card text-slate-300 transition hover:text-white"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
            </>
          ) : (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <Link
                href="/login"
                className="rounded-lg px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-slate-300 hover:bg-dark-card transition"
              >
                Sign In
              </Link>
              <Link
                href="/register"
                className="rounded-lg bg-brand-600 px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-white shadow-glow-brand hover:bg-brand-500 transition"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Slide-Down Dropdown Menu */}
      {mobileMenuOpen && user && (
        <div className="sm:hidden border-t border-dark-border bg-dark-card/95 px-4 py-3 space-y-3 backdrop-blur-xl animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex flex-col">
              <span className="text-sm font-bold text-white">{user.name}</span>
              <span className="text-xs text-slate-400">{user.email}</span>
            </div>
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                <Shield className="h-3 w-3" /> ADMIN
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold bg-brand-500/20 text-brand-300 border border-brand-500/30">
                <UserIcon className="h-3 w-3" /> USER
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Link
              href="/chat"
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
                pathname.startsWith('/chat')
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-dark-bg text-slate-300 border border-dark-border'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              Chat
            </Link>

            {isAdmin && (
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-semibold transition ${
                  pathname.startsWith('/dashboard')
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-dark-bg text-slate-300 border border-dark-border'
                }`}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            )}
          </div>

          <button
            onClick={() => {
              setMobileMenuOpen(false);
              logout();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>
      )}
    </header>
  );
}
