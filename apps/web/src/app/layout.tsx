import React from 'react';
import type { Metadata } from 'next';
import { AuthProvider } from '../contexts/AuthContext';
import '../styles/globals.css';

export const metadata: Metadata = {
  title: 'Playable Factory - RAG Vector Search Platform',
  description: 'Grounded question answering, document indexing, and semantic search powered by Gemini & pgvector',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-dark-bg min-h-screen font-sans text-slate-100 selection:bg-brand-500 selection:text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
