'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  ArrowRight,
  Radio,
  Database,
  Cpu,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Users,
  Layers,
} from 'lucide-react';
import { Github } from '../components/Icons';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-md shadow-indigo-500/20">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
              DevFlow
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-xl px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500 transition"
            >
              <span>Get Started</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-16 sm:py-24 max-w-5xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-medium text-indigo-300 backdrop-blur-md">
          <Radio className="h-3.5 w-3.5 text-indigo-400 animate-pulse" />
          <span>Real-Time Engineering Workspace & Collab Layer</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl leading-tight">
          High-Velocity Sprints with{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Real-Time Collaboration
          </span>{' '}
          & AI Copilot
        </h1>

        <p className="text-sm sm:text-base text-zinc-400 max-w-2xl leading-relaxed">
          DevFlow combines real-time Kanban sprint boards, Socket.IO live events, Gemini AI coding assistance, AES-256 encrypted GitHub sync, Redis caching, and automated audit logging in one unified workspace.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/login"
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 px-6 py-3.5 text-sm font-bold text-white shadow-xl shadow-indigo-600/25 hover:scale-105 transition"
          >
            <span>Launch Workspace</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href="/login"
            className="flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-5 py-3.5 text-sm font-semibold text-zinc-300 hover:border-zinc-700 hover:text-white transition"
          >
            <span>Try One-Click Demo</span>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-16 text-left w-full">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
              <Radio className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Live Socket.IO Sync</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Instant multi-user task moves, inline comments, team chat, private user notifications, and multi-device presence tracking.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Gemini AI Assistant</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Context-enriched code explanation, test generation, and bug fixing with pre-flight sensitive credential redaction.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Github className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-white">GitHub OAuth & Sync</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              AES-256-GCM encrypted tokens at rest. Sync repository details, commit history, pull requests, and issues directly inside your workspace.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Database className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Redis Cache & Rate Limiting</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              High-speed read caching with automatic mutation invalidation and sliding-window rate limiters with graceful memory fallback.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-white">BullMQ Background Jobs</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Non-blocking job queues for AI batching, notifications dispatch, GitHub syncing, and analytics with exponential backoff retries.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Audit Trail & RBAC</h3>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Full organizational audit logging with automatic credential scrubbing and role-based access control (OWNER, ADMIN, DEVELOPER, VIEWER).
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/80 bg-zinc-950/60 py-6 text-center text-xs text-zinc-500">
        DevFlow • Modern Real-Time Engineering Workspace • Built with Next.js, Express, PostgreSQL, Redis, Socket.IO & Gemini AI
      </footer>
    </div>
  );
}
