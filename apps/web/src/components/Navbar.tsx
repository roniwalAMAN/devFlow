'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useCollaboration } from '../context/CollaborationContext';
import {
  Sparkles,
  MessageSquare,
  Bell,
  Activity,
  Layers,
  CheckSquare,
  Settings,
  LogOut,
  ChevronDown,
  Building,
  User,
  Radio,
} from 'lucide-react';
import { Github } from './Icons';

interface NavbarProps {
  onOpenChat?: () => void;
  isChatOpen?: boolean;
  onOpenAI?: () => void;
  onOpenGitHub?: () => void;
  onOpenAudit?: () => void;
}

export function Navbar({
  onOpenChat,
  isChatOpen,
  onOpenAI,
  onOpenGitHub,
  onOpenAudit,
}: NavbarProps) {
  const pathname = usePathname();
  const { user, organizations, currentOrg, currentRole, switchOrganization, logout } = useAuth();
  const {
    isConnected,
    notifications,
    unreadNotificationsCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    onlineUserIds,
    activeProjectId,
  } = useCollaboration();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isOrgMenuOpen, setIsOrgMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const orgId = currentOrg?.id || 'acme-engineering';
  const projId = activeProjectId || 'cloud-platform-migration';

  const navLinks = [
    { name: 'Dashboard', href: '/dashboard', icon: Layers },
    { name: 'Projects', href: `/organizations/${orgId}/projects`, icon: Building },
    { name: 'Kanban', href: `/organizations/${orgId}/projects/${projId}`, icon: Radio },
    { name: 'Tasks', href: `/organizations/${orgId}/projects/${projId}/tasks`, icon: CheckSquare },
    { name: 'GitHub', href: '/github', icon: Github },
    { name: 'Activity', href: '/activity', icon: Activity },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand & Organization Switcher */}
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent">
                DevFlow
              </span>
            </div>
          </Link>

          {/* Org Switcher Dropdown */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setIsOrgMenuOpen(!isOrgMenuOpen)}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/90 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition"
            >
              <Building className="h-3.5 w-3.5 text-indigo-400" />
              <span className="max-w-[130px] truncate">{currentOrg?.name || 'Acme Engineering'}</span>
              <span className="rounded bg-indigo-500/10 px-1.5 py-0.2 text-[10px] text-indigo-400 font-mono">
                {currentRole || 'OWNER'}
              </span>
              <ChevronDown className="h-3 w-3 text-zinc-400" />
            </button>

            {isOrgMenuOpen && (
              <div className="absolute left-0 mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-900/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-2 py-1 text-[11px] font-medium text-zinc-400">Workspaces</div>
                {organizations.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => {
                      switchOrganization(org.id);
                      setIsOrgMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs transition ${
                      org.id === currentOrg?.id
                        ? 'bg-indigo-600/20 text-indigo-300 font-semibold'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{org.name}</span>
                    <span className="text-[10px] text-zinc-500 uppercase font-mono">{org.role || 'DEV'}</span>
                  </button>
                ))}
                <div className="my-1 border-t border-zinc-800" />
                <Link
                  href={`/organizations/${orgId}`}
                  onClick={() => setIsOrgMenuOpen(false)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition"
                >
                  Manage Organization & Members →
                </Link>
              </div>
            )}
          </div>

          {/* Connection Status Pill */}
          <div
            className={`hidden lg:flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border ${
              isConnected
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isConnected ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
              }`}
            />
            {isConnected ? 'Real-Time Sync' : 'Disconnected'}
          </div>

          {/* Online Member Count */}
          <div className="hidden xl:flex items-center gap-1.5 rounded-full bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-[11px] text-zinc-300">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            <span>{onlineUserIds.length || 1} Online</span>
          </div>
        </div>

        {/* Center/Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href));
            return (
              <Link
                key={link.name}
                href={link.href}
                className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-indigo-400' : 'text-zinc-400'}`} />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right: Quick Launchers, Notifications & Profile */}
        <div className="flex items-center gap-2">
          {/* AI Assistant Quick Launcher */}
          {onOpenAI && (
            <button
              onClick={onOpenAI}
              className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500 transition"
              title="Open Gemini AI Assistant"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">AI Copilot</span>
            </button>
          )}

          {/* Team Chat Drawer Launcher */}
          {onOpenChat && (
            <button
              onClick={onOpenChat}
              className={`relative rounded-xl border p-2 text-xs font-medium transition shadow-sm ${
                isChatOpen
                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                  : 'border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white'
              }`}
              title="Toggle Live Team Chat"
            >
              <MessageSquare className="h-4 w-4" />
            </button>
          )}

          {/* Notifications Bell Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative rounded-xl border border-zinc-800 bg-zinc-900 p-2 text-zinc-300 hover:bg-zinc-800 hover:text-white transition shadow-sm"
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow">
                  {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-zinc-800 bg-zinc-900/95 p-3 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-white">Notifications</span>
                    {unreadNotificationsCount > 0 && (
                      <span className="rounded-full bg-indigo-500/20 px-2 py-0.5 text-[10px] font-semibold text-indigo-400">
                        {unreadNotificationsCount} unread
                      </span>
                    )}
                  </div>
                  {unreadNotificationsCount > 0 && (
                    <button
                      onClick={() => markAllNotificationsAsRead()}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 transition"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto space-y-1.5">
                  {notifications.length === 0 ? (
                    <div className="py-6 text-center text-xs text-zinc-500">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => !n.readAt && markNotificationAsRead(n.id)}
                        className={`rounded-xl p-2.5 transition cursor-pointer border ${
                          n.readAt
                            ? 'bg-zinc-900/40 border-transparent text-zinc-400'
                            : 'bg-zinc-800/70 border-indigo-500/20 text-zinc-200 hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-white">{n.title}</span>
                          {!n.readAt && <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 shrink-0" />}
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-300 line-clamp-2">{n.message}</p>
                        <div className="mt-1 text-[10px] text-zinc-500">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900 p-1.5 sm:px-2.5 hover:bg-zinc-800 transition"
            >
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-6 w-6 rounded-full object-cover" />
              ) : (
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {user?.name ? user.name[0].toUpperCase() : 'U'}
                </div>
              )}
              <span className="hidden sm:inline text-xs font-medium text-zinc-200 max-w-[100px] truncate">
                {user?.name || 'Alex Mercer'}
              </span>
              <ChevronDown className="hidden sm:inline h-3 w-3 text-zinc-400" />
            </button>

            {isUserMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl border border-zinc-800 bg-zinc-900/95 p-2 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in slide-in-from-top-2">
                <div className="px-2 py-1.5 border-b border-zinc-800 mb-1">
                  <div className="text-xs font-semibold text-white">{user?.name || 'Alex Mercer'}</div>
                  <div className="text-[11px] text-zinc-400 truncate">{user?.email || 'alex@devflow.io'}</div>
                </div>

                <Link
                  href="/settings"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                >
                  <User className="h-3.5 w-3.5 text-zinc-400" />
                  <span>Profile & Settings</span>
                </Link>

                <Link
                  href="/github"
                  onClick={() => setIsUserMenuOpen(false)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white transition"
                >
                  <Github className="h-3.5 w-3.5 text-zinc-400" />
                  <span>GitHub Integration</span>
                </Link>

                <div className="my-1 border-t border-zinc-800" />

                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 transition"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
