'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { Sparkles, ArrowRight, ShieldCheck, Code, Eye, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { login, quickLogin, isLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);
    const success = await login(email, password);
    setIsSubmitting(false);

    if (success) {
      router.push('/dashboard');
    }
  };

  const handleDemoLogin = async (demoEmail: string) => {
    setErrorMsg('');
    setIsSubmitting(true);
    const success = await quickLogin(demoEmail);
    setIsSubmitting(false);

    if (success) {
      router.push('/dashboard');
    }
  };

  const demoAccounts = [
    { name: 'Alex Mercer', role: 'OWNER', email: 'alex@devflow.io', color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300' },
    { name: 'Charlie Davis', role: 'ADMIN', email: 'charlie@devflow.io', color: 'border-purple-500/30 bg-purple-500/10 text-purple-300' },
    { name: 'Bob Smith', role: 'DEVELOPER', email: 'bob@devflow.io', color: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' },
    { name: 'Dana Lee', role: 'VIEWER', email: 'dana@devflow.io', color: 'border-zinc-700 bg-zinc-800 text-zinc-300' },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-zinc-950 to-zinc-950">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/25">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Welcome to DevFlow
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400">
            Real-time engineering workspace for high-velocity software teams.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {errorMsg && (
            <div className="mb-4 rounded-xl bg-rose-950/60 border border-rose-500/30 p-3 text-xs text-rose-300">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1.5">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-zinc-300">Password</label>
                <span className="text-[11px] text-zinc-500">Default: Password123!</span>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950/80 pl-10 pr-3.5 py-2.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In to Workspace'}
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Quick Demo Logins */}
          <div className="mt-6 pt-5 border-t border-zinc-800">
            <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider text-center mb-3">
              One-Click Demo Roles
            </div>
            <div className="grid grid-cols-2 gap-2">
              {demoAccounts.map((acc) => (
                <button
                  key={acc.email}
                  type="button"
                  onClick={() => handleDemoLogin(acc.email)}
                  disabled={isSubmitting}
                  className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition hover:scale-[1.02] ${acc.color}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-white truncate">{acc.name}</span>
                    <span className="text-[9px] uppercase px-1 rounded bg-black/30 font-mono">
                      {acc.role}
                    </span>
                  </div>
                  <span className="text-[10px] opacity-75 truncate w-full">{acc.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Navigation */}
        <p className="text-center text-xs text-zinc-500">
          Don't have a DevFlow account?{' '}
          <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-4">
            Create an organization
          </Link>
        </p>
      </div>
    </div>
  );
}
