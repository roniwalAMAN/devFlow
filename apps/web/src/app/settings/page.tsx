'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Navbar } from '../../components/Navbar';
import { api } from '../../lib/api';
import { useToast } from '../../components/Toast';
import {
  Settings,
  User,
  Building,
  Shield,
  Sparkles,
  Database,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { Github } from '../../components/Icons';

export default function SettingsPage() {
  const router = useRouter();
  const { user, currentOrg, currentRole, isAuthenticated, isLoading: authLoading, logout } = useAuth();
  const { success, error } = useToast();

  const [githubConn, setGithubConn] = useState<any>(null);
  const [healthInfo, setHealthInfo] = useState<any>(null);
  const [isLoadingIntegrations, setIsLoadingIntegrations] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }

    if (isAuthenticated) {
      Promise.all([api.getGitHubConnection(), api.getFullHealth()])
        .then(([ghRes, healthRes]) => {
          if (ghRes.success && ghRes.data) {
            setGithubConn(ghRes.data);
          }
          if (healthRes.success) {
            setHealthInfo(healthRes);
          }
        })
        .finally(() => setIsLoadingIntegrations(false));
    }
  }, [authLoading, isAuthenticated, router]);

  const handleDisconnectGitHub = async () => {
    if (!confirm('Are you sure you want to disconnect your GitHub account?')) return;
    try {
      const res = await api.disconnectGitHub();
      if (res.success) {
        success('GitHub account disconnected.');
        setGithubConn(null);
      } else {
        error(res.message || 'Failed to disconnect GitHub.');
      }
    } catch (err: any) {
      error(err.message || 'An error occurred.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-5xl w-full px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="h-6 w-6 text-indigo-400" />
            Workspace & Engineering Settings
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-zinc-400">
            Manage your developer profile, workspace configurations, and active service integrations.
          </p>
        </div>

        {/* Section 1: User Profile */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-400" />
              Developer Profile
            </h2>
            <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 text-xs text-indigo-300 font-mono">
              {currentRole || 'DEVELOPER'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="h-16 w-16 rounded-2xl object-cover border border-zinc-700" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white">
                {user?.name ? user.name[0].toUpperCase() : 'U'}
              </div>
            )}

            <div className="space-y-1">
              <div className="text-base font-bold text-white">{user?.name || 'Engineer'}</div>
              <div className="text-xs text-zinc-400">{user?.email || 'developer@devflow.io'}</div>
              <div className="text-[11px] text-zinc-500 font-mono">User ID: {user?.id}</div>
            </div>
          </div>
        </div>

        {/* Section 2: Active Workspace */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Building className="h-4 w-4 text-indigo-400" />
              Active Workspace
            </h2>
            <span className="text-xs text-zinc-500 font-mono">Slug: {currentOrg?.slug}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
              <span className="text-zinc-500">Workspace Name</span>
              <p className="font-bold text-white mt-1">{currentOrg?.name || 'Acme Engineering'}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
              <span className="text-zinc-500">Assigned Role</span>
              <p className="font-bold text-emerald-400 mt-1">{currentRole || 'OWNER'}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
              <span className="text-zinc-500">Workspace ID</span>
              <p className="font-mono text-zinc-300 mt-1 truncate">{currentOrg?.id}</p>
            </div>
          </div>
        </div>

        {/* Section 3: Engineering Integrations Status */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Cpu className="h-4 w-4 text-indigo-400" />
              Engineering Integrations & Health
            </h2>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Services Operational
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* GitHub Integration */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 text-white" />
                  <span className="font-bold text-white">GitHub Integration</span>
                </div>
                {githubConn ? (
                  <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 font-semibold">
                    Connected
                  </span>
                ) : (
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-400">
                    Not Linked
                  </span>
                )}
              </div>

              <p className="text-[11px] text-zinc-400">
                AES-256-GCM encrypted tokens for repository synchronization, commits, pull requests, and issues.
              </p>

              {githubConn ? (
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/80">
                  <span className="font-mono text-zinc-300">@{githubConn.username}</span>
                  <button
                    onClick={handleDisconnectGitHub}
                    className="text-rose-400 hover:text-rose-300 transition text-[11px] font-semibold"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <a
                  href="/api/github/connect"
                  className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition text-[11px] font-semibold"
                >
                  Connect GitHub Account <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* AI Assistant Service */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span className="font-bold text-white">Gemini AI Assistant</span>
                </div>
                <span className="rounded bg-purple-500/10 px-2 py-0.5 text-[10px] text-purple-300 font-semibold">
                  Active
                </span>
              </div>

              <p className="text-[11px] text-zinc-400">
                Context-aware code explanation, debugging, implementation advice, and sanitized error analysis.
              </p>

              <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
                <span>Model: gemini-1.5-flash</span>
                <span className="text-emerald-400">Credential Redaction ON</span>
              </div>
            </div>

            {/* Redis Cache & Rate Limiting */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-rose-400" />
                  <span className="font-bold text-white">Redis & Caching</span>
                </div>
                <span
                  className={`rounded px-2 py-0.5 text-[10px] font-semibold ${
                    healthInfo?.services?.redis?.status === 'healthy'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-amber-500/10 text-amber-300'
                  }`}
                >
                  {healthInfo?.services?.redis?.status === 'healthy' ? 'Online' : 'In-Memory Fallback'}
                </span>
              </div>

              <p className="text-[11px] text-zinc-400">
                High-speed caching with automatic mutation invalidation and sliding-window rate limiters.
              </p>
            </div>

            {/* BullMQ Background Queues */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-amber-400" />
                  <span className="font-bold text-white">BullMQ Job Queues</span>
                </div>
                <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-400 font-semibold">
                  4 Queues Ready
                </span>
              </div>

              <p className="text-[11px] text-zinc-400">
                Background queues for AI batching, notifications dispatch, GitHub synchronization, and analytics.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Sign Out */}
        <div className="flex items-center justify-between rounded-2xl border border-rose-500/20 bg-rose-950/20 p-6 backdrop-blur-sm">
          <div>
            <h3 className="text-sm font-bold text-white">Sign Out of DevFlow</h3>
            <p className="text-xs text-zinc-400 mt-0.5">End your active authenticated session on this browser.</p>
          </div>
          <button
            onClick={() => logout()}
            className="flex items-center gap-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 transition"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </main>
    </div>
  );
}
