'use client';

import React from 'react';
import { useCollaboration } from '../context/CollaborationContext';

interface Member {
  id: string;
  name: string;
  email: string;
  role?: string;
  avatar?: string | null;
}

interface PresenceListProps {
  members?: Member[];
}

export function PresenceList({ members = [] }: PresenceListProps) {
  const { onlineUserIds } = useCollaboration();

  // If no static members list provided, synthesize from onlineUserIds or default set
  const displayMembers: Member[] =
    members.length > 0
      ? members
      : [
          { id: 'user-1', name: 'Alice (Owner)', email: 'alice@devflow.com', role: 'OWNER' },
          { id: 'user-2', name: 'Bob (Admin)', email: 'bob@devflow.com', role: 'ADMIN' },
          { id: 'user-3', name: 'Charlie (Dev)', email: 'charlie@devflow.com', role: 'DEVELOPER' },
          { id: 'user-4', name: 'David (Viewer)', email: 'david@devflow.com', role: 'VIEWER' },
        ];

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4 backdrop-blur-xl">
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-zinc-100">Live Team Presence</h3>
        </div>
        <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-medium text-indigo-400 border border-indigo-500/20">
          {onlineUserIds.length} Active
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {displayMembers.map((member) => {
          const isOnline = onlineUserIds.includes(member.id);
          return (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-xl border border-zinc-800/60 bg-zinc-900/40 p-2.5 transition hover:border-zinc-700 hover:bg-zinc-900/80"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 text-xs font-bold text-white shadow-sm">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-zinc-950 ${
                      isOnline ? 'bg-emerald-400' : 'bg-zinc-600'
                    }`}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-zinc-200">{member.name}</p>
                    {member.role && (
                      <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] font-semibold text-zinc-400">
                        {member.role}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-zinc-500">{member.email}</p>
                </div>
              </div>

              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                  isOnline
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-zinc-800 bg-zinc-900 text-zinc-500'
                }`}
              >
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
