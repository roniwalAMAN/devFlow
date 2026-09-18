'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../context/AuthContext';
import { Navbar } from '../../../components/Navbar';
import { api } from '../../../lib/api';
import { useToast } from '../../../components/Toast';
import {
  Building,
  Users,
  Mail,
  Shield,
  Trash2,
  RefreshCw,
  Plus,
  UserPlus,
  ArrowLeft,
  Calendar,
} from 'lucide-react';
import Link from 'next/link';

export default function OrganizationDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { user, currentRole, isAuthenticated, isLoading: authLoading } = useAuth();
  const { success, error } = useToast();

  const organizationId = (params?.organizationId as string) || '';

  const [org, setOrg] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Invite Modal
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('DEVELOPER');
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const canManageMembers = currentRole === 'OWNER' || currentRole === 'ADMIN';

  const loadOrgDetails = useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);

    try {
      const orgRes = await api.getOrganization(organizationId);
      if (orgRes.success && orgRes.data) {
        setOrg(orgRes.data);
        setMembers(orgRes.data.members || []);
      }

      if (canManageMembers) {
        const invitesRes = await api.listInvites(organizationId);
        if (invitesRes.success && Array.isArray(invitesRes.data)) {
          setInvites(invitesRes.data);
        }
      }
    } catch (err) {
      console.error('Failed to load organization:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, canManageMembers]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) {
      loadOrgDetails();
    }
  }, [authLoading, isAuthenticated, loadOrgDetails, router]);

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSendingInvite(true);
    try {
      const res = await api.createInvite(organizationId, inviteEmail.trim(), inviteRole);
      if (res.success) {
        success(`Invitation sent to ${inviteEmail}`, 'Invite Created');
        setInviteEmail('');
        setIsInviteModalOpen(false);
        await loadOrgDetails();
      } else {
        error(res.message || 'Failed to send invite.', 'Invite Failed');
      }
    } catch (err: any) {
      error(err.message || 'An error occurred.', 'Error');
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    if (!confirm('Are you sure you want to revoke this invitation?')) return;
    try {
      const res = await api.revokeInvite(organizationId, inviteId);
      if (res.success) {
        success('Invitation revoked successfully.');
        await loadOrgDetails();
      } else {
        error(res.message || 'Failed to revoke invite.');
      }
    } catch (err: any) {
      error(err.message || 'An error occurred.');
    }
  };

  const handleResendInvite = async (inviteId: string) => {
    try {
      const res = await api.resendInvite(organizationId, inviteId);
      if (res.success) {
        success('Invitation link resent successfully.');
      } else {
        error(res.message || 'Failed to resend invite.');
      }
    } catch (err: any) {
      error(err.message || 'An error occurred.');
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await api.updateMemberRole(organizationId, userId, newRole);
      if (res.success) {
        success('Member role updated successfully.');
        await loadOrgDetails();
      } else {
        error(res.message || 'Failed to update member role.');
      }
    } catch (err: any) {
      error(err.message || 'An error occurred.');
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!confirm(`Are you sure you want to remove ${memberName} from this organization?`)) return;
    try {
      const res = await api.removeMember(organizationId, userId);
      if (res.success) {
        success(`${memberName} removed from workspace.`);
        await loadOrgDetails();
      } else {
        error(res.message || 'Failed to remove member.');
      }
    } catch (err: any) {
      error(err.message || 'An error occurred.');
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                <span>Workspaces</span>
                <span>/</span>
                <span>{org?.slug || organizationId}</span>
              </div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Building className="h-6 w-6 text-indigo-400" />
                {org?.name || 'Organization Details'}
              </h1>
            </div>
          </div>

          {canManageMembers && (
            <button
              onClick={() => setIsInviteModalOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-md shadow-indigo-600/30"
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite Member</span>
            </button>
          )}
        </div>

        {/* Organization Information Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-indigo-400" />
              Workspace Profile & RBAC Policy
            </h2>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-zinc-500">Organization Name</span>
                <p className="font-semibold text-white mt-0.5">{org?.name || 'DevFlow'}</p>
              </div>
              <div>
                <span className="text-zinc-500">Workspace Slug</span>
                <p className="font-mono text-indigo-400 mt-0.5">{org?.slug}</p>
              </div>
              <div>
                <span className="text-zinc-500">Your Permissions</span>
                <p className="font-bold text-emerald-400 mt-0.5">{currentRole || 'DEVELOPER'}</p>
              </div>
              <div>
                <span className="text-zinc-500">Active Members</span>
                <p className="font-semibold text-white mt-0.5">{members.length} seats allocated</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Role Capabilities
            </h3>
            <ul className="space-y-1.5 text-xs text-zinc-400">
              <li><strong className="text-white">OWNER:</strong> Full billing, org deletion & members</li>
              <li><strong className="text-white">ADMIN:</strong> Manage projects, members & audit logs</li>
              <li><strong className="text-white">DEVELOPER:</strong> Create/edit/move tasks & comments</li>
              <li><strong className="text-white">VIEWER:</strong> Read-only access to Kanban & projects</li>
            </ul>
          </div>
        </div>

        {/* Active Members Table */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-400" />
              Team Members ({members.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 font-medium">
                  <th className="pb-3 pl-2">Member</th>
                  <th className="pb-3">Email</th>
                  <th className="pb-3">Role</th>
                  <th className="pb-3">Joined Date</th>
                  {canManageMembers && <th className="pb-3 text-right pr-2">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-800/30 transition">
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-2.5">
                        {m.user?.avatar ? (
                          <img src={m.user.avatar} alt={m.user.name} className="h-7 w-7 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                            {m.user?.name ? m.user.name[0].toUpperCase() : 'U'}
                          </div>
                        )}
                        <span className="font-semibold text-white">{m.user?.name}</span>
                        {m.userId === user?.id && (
                          <span className="rounded bg-zinc-800 px-1.5 py-0.2 text-[10px] text-zinc-400">You</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 text-zinc-400">{m.user?.email}</td>
                    <td className="py-3">
                      {canManageMembers && m.role !== 'OWNER' ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value)}
                          className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white focus:outline-none"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="DEVELOPER">DEVELOPER</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      ) : (
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase font-mono ${
                            m.role === 'OWNER'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : m.role === 'ADMIN'
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {m.role}
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-zinc-500">
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString() : 'Active'}
                    </td>
                    {canManageMembers && (
                      <td className="py-3 text-right pr-2">
                        {m.role !== 'OWNER' && m.userId !== user?.id && (
                          <button
                            onClick={() => handleRemoveMember(m.userId, m.user?.name || 'Member')}
                            className="rounded-lg p-1 text-zinc-500 hover:bg-rose-500/20 hover:text-rose-400 transition"
                            title="Remove Member"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pending Invites Table (OWNER/ADMIN only) */}
        {canManageMembers && invites.length > 0 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 backdrop-blur-sm space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Mail className="h-4 w-4 text-amber-400" />
              Pending Invitations ({invites.length})
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-500 font-medium">
                    <th className="pb-3 pl-2">Recipient Email</th>
                    <th className="pb-3">Invited Role</th>
                    <th className="pb-3">Expires</th>
                    <th className="pb-3 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {invites.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-3 pl-2 font-medium text-white">{inv.email}</td>
                      <td className="py-3">
                        <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] text-zinc-300 font-mono">
                          {inv.role}
                        </span>
                      </td>
                      <td className="py-3 text-zinc-500">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-right pr-2 space-x-1">
                        <button
                          onClick={() => handleResendInvite(inv.id)}
                          className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                          title="Resend Invite"
                        >
                          <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleRevokeInvite(inv.id)}
                          className="rounded-lg p-1 text-zinc-500 hover:bg-rose-500/20 hover:text-rose-400 transition"
                          title="Revoke Invite"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* Invite Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Invite Team Member</h3>
            <p className="text-xs text-zinc-400 mb-4">Send an invitation to join this DevFlow workspace.</p>

            <form onSubmit={handleSendInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="engineer@company.com"
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Assigned Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="DEVELOPER">DEVELOPER (Default - Create & manage tasks)</option>
                  <option value="ADMIN">ADMIN (Manage projects & workspace members)</option>
                  <option value="VIEWER">VIEWER (Read-only access)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingInvite}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  {isSendingInvite ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
