'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { api } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import {
  Building,
  CheckCircle2,
  AlertTriangle,
  Shield,
  ArrowRight,
  Sparkles,
  LogIn,
  Loader2,
  UserCheck,
  LogOut,
} from 'lucide-react';

export default function AcceptInvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) || '';

  const { user, isAuthenticated, isLoading: authLoading, refreshOrganizations, switchOrganization, logout } = useAuth();
  const { success, error } = useToast();

  const [status, setStatus] = useState<'idle' | 'accepting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successData, setSuccessData] = useState<{ organizationId: string; role: string } | null>(null);

  const handleAcceptInvite = async () => {
    if (!token) {
      setErrorMessage('Invitation token is missing from the URL.');
      setStatus('error');
      return;
    }

    if (!isAuthenticated) {
      return;
    }

    setStatus('accepting');
    setErrorMessage('');

    try {
      const res = await api.acceptInvite(token);

      if (res.success && res.data?.organizationId) {
        setStatus('success');
        setSuccessData(res.data);
        success(
          `Invitation accepted! You have joined the workspace as ${res.data.role}.`,
          'Welcome to the Workspace'
        );

        // Refresh user organizations in state
        await refreshOrganizations();
        switchOrganization(res.data.organizationId);

        // Redirect to the organization details/workspace page
        setTimeout(() => {
          router.push(`/organizations/${res.data.organizationId}`);
        }, 1200);
      } else {
        setStatus('error');
        const message = res.message || 'Failed to accept invitation. Please check the link or contact your workspace admin.';
        setErrorMessage(message);
        error(message, 'Acceptance Failed');
      }
    } catch (err: any) {
      setStatus('error');
      const message = err.message || 'A network error occurred while accepting the invitation.';
      setErrorMessage(message);
      error(message, 'Network Error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/40 via-zinc-950 to-zinc-950 text-zinc-100">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <Link href="/dashboard" className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg shadow-indigo-500/25 group hover:scale-105 transition">
            <Sparkles className="h-6 w-6 text-white" />
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Workspace Invitation
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
            You have been invited to collaborate on an engineering workspace in DevFlow.
          </p>
        </div>

        {/* Main Card */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          {/* State: Initial Checking / Loading */}
          {authLoading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
              <p className="text-xs text-zinc-400">Verifying session credentials...</p>
            </div>
          )}

          {/* State: Not Authenticated */}
          {!authLoading && !isAuthenticated && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-3">
                <div className="flex items-center gap-2.5 text-amber-400 font-semibold text-sm">
                  <LogIn className="h-4 w-4" />
                  <span>Authentication Required</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  To accept this invitation, you must be logged into DevFlow with the email address where the invitation was received.
                </p>
              </div>

              <div className="space-y-3">
                <Link
                  href="/login"
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/30"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Log In to Accept Invitation</span>
                </Link>

                <div className="text-center">
                  <span className="text-xs text-zinc-400">Don&apos;t have an account yet? </span>
                  <Link href="/register" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition">
                    Create Account
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* State: Authenticated - Ready to Accept or Accepting */}
          {!authLoading && isAuthenticated && status !== 'success' && (
            <div className="space-y-6">
              {/* Account Confirmation Banner */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-medium text-zinc-400">
                    <UserCheck className="h-4 w-4 text-indigo-400" />
                    <span>Logged In Account</span>
                  </div>
                  <button
                    onClick={() => logout()}
                    className="flex items-center gap-1 text-[11px] font-semibold text-zinc-400 hover:text-rose-400 transition"
                    title="Switch Account"
                  >
                    <LogOut className="h-3 w-3" />
                    <span>Switch Account</span>
                  </button>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-full object-cover border border-zinc-700" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">
                      {user?.name ? user.name[0].toUpperCase() : 'U'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-white truncate">{user?.name}</div>
                    <div className="text-xs text-indigo-300 font-mono truncate">{user?.email}</div>
                  </div>
                </div>
              </div>

              {/* Error Message Display */}
              {status === 'error' && errorMessage && (
                <div className="rounded-2xl border border-rose-500/30 bg-rose-950/40 p-4 space-y-2 animate-in fade-in">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
                    <span>Unable to Accept Invitation</span>
                  </div>
                  <p className="text-xs text-rose-200/90 leading-relaxed pl-6">
                    {errorMessage}
                  </p>
                </div>
              )}

              {/* Workspace Benefits Info */}
              <div className="space-y-2.5 text-xs text-zinc-400">
                <div className="flex items-start gap-2.5">
                  <Shield className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>Access project backlogs, Kanban boards, and sprint tasks.</span>
                </div>
                <div className="flex items-start gap-2.5">
                  <Building className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <span>Collaborate with teammates via live sync and real-time chat.</span>
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2 space-y-3">
                <button
                  onClick={handleAcceptInvite}
                  disabled={status === 'accepting'}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition shadow-lg shadow-indigo-600/30"
                >
                  {status === 'accepting' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Joining Workspace...</span>
                    </>
                  ) : (
                    <>
                      <span>Accept Invitation & Join Workspace</span>
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-4 text-xs text-zinc-500">
                  <Link href="/dashboard" className="hover:text-zinc-300 transition">
                    Go to Dashboard
                  </Link>
                  <span>•</span>
                  <Link href="/settings" className="hover:text-zinc-300 transition">
                    Account Settings
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* State: Success */}
          {status === 'success' && successData && (
            <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in-95">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="space-y-1">
                <h2 className="text-lg font-bold text-white">Welcome to the Workspace!</h2>
                <p className="text-xs text-zinc-400">
                  Your invitation has been accepted with the <strong className="text-emerald-400 font-mono">{successData.role}</strong> role.
                </p>
              </div>

              <div className="pt-3">
                <div className="inline-flex items-center gap-2 text-xs text-indigo-400 font-medium animate-pulse">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Redirecting to your workspace...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
