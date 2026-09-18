'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../../../context/AuthContext';
import { useCollaboration, Task } from '../../../../../../context/CollaborationContext';
import { Navbar } from '../../../../../../components/Navbar';
import { TaskCommentsModal } from '../../../../../../components/TaskCommentsModal';
import {
  CheckSquare,
  Search,
  Filter,
  ArrowLeft,
  LayoutGrid,
  Calendar,
  MessageSquare,
  User,
  Trash2,
  Clock,
  Plus,
} from 'lucide-react';

export default function ProjectTasksTableView() {
  const params = useParams();
  const router = useRouter();
  const { user, currentRole, isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    tasks,
    fetchTasks,
    updateTask,
    deleteTask,
    setActiveOrgId,
    setActiveProjectId,
  } = useCollaboration();

  const organizationId = (params?.organizationId as string) || '';
  const projectId = (params?.projectId as string) || '';

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  // Task Comments / Detail Modal
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  useEffect(() => {
    if (organizationId && projectId) {
      setActiveOrgId(organizationId);
      setActiveProjectId(projectId);
      fetchTasks();
    }
  }, [organizationId, projectId, setActiveOrgId, setActiveProjectId, fetchTasks]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [authLoading, isAuthenticated, router]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (t.assignee?.name && t.assignee.name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchPriority = priorityFilter === 'ALL' || t.priority === priorityFilter;

      return matchSearch && matchStatus && matchPriority;
    });
  }, [tasks, searchQuery, statusFilter, priorityFilter]);

  const handleStatusChange = async (taskId: string, newStatus: Task['status']) => {
    await updateTask(taskId, { status: newStatus });
  };

  const handleDelete = async (taskId: string, title: string) => {
    if (confirm(`Delete task "${title}"?`)) {
      await deleteTask(taskId);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        {/* Header Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/organizations/${organizationId}/projects/${projectId}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition"
              title="Back to Kanban"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono">
                <span>{organizationId}</span>
                <span>/</span>
                <span>{projectId}</span>
                <span>/</span>
                <span>Tasks</span>
              </div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <CheckSquare className="h-6 w-6 text-indigo-400" />
                Task Backlog & Management
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              href={`/organizations/${organizationId}/projects/${projectId}`}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white transition shadow-sm"
            >
              <LayoutGrid className="h-4 w-4 text-indigo-400" />
              <span>Kanban Board</span>
            </Link>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-sm">
          <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tasks by title or assignee..."
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 pl-9 pr-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="TODO">TODO</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="IN_REVIEW">IN_REVIEW</option>
              <option value="DONE">DONE</option>
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 focus:border-indigo-500 focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          <div className="text-xs text-zinc-500 font-medium">
            Showing <strong className="text-white">{filteredTasks.length}</strong> of {tasks.length} tasks
          </div>
        </div>

        {/* Tasks Table */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400 font-semibold bg-zinc-900/60">
                  <th className="py-3.5 pl-4">Task Title</th>
                  <th className="py-3.5">Status</th>
                  <th className="py-3.5">Priority</th>
                  <th className="py-3.5">Assignee</th>
                  <th className="py-3.5">Due Date</th>
                  <th className="py-3.5 text-right pr-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-zinc-500">
                      No tasks found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTask(t)}
                      className="hover:bg-zinc-800/40 transition cursor-pointer group"
                    >
                      <td className="py-3.5 pl-4">
                        <div className="font-semibold text-white group-hover:text-indigo-300 transition">
                          {t.title}
                        </div>
                        {t.description && (
                          <div className="text-[11px] text-zinc-400 line-clamp-1 max-w-md mt-0.5">
                            {t.description}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={t.status}
                          onChange={(e) => handleStatusChange(t.id, e.target.value as Task['status'])}
                          className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 font-medium focus:outline-none"
                        >
                          <option value="TODO">TODO</option>
                          <option value="IN_PROGRESS">IN_PROGRESS</option>
                          <option value="IN_REVIEW">IN_REVIEW</option>
                          <option value="DONE">DONE</option>
                        </select>
                      </td>

                      <td className="py-3.5">
                        <span
                          className={`rounded px-2 py-0.5 text-[10px] font-bold uppercase font-mono ${
                            t.priority === 'URGENT'
                              ? 'bg-rose-500/20 text-rose-300'
                              : t.priority === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300'
                              : t.priority === 'MEDIUM'
                              ? 'bg-indigo-500/20 text-indigo-300'
                              : 'bg-zinc-800 text-zinc-400'
                          }`}
                        >
                          {t.priority}
                        </span>
                      </td>

                      <td className="py-3.5">
                        {t.assignee ? (
                          <div className="flex items-center gap-2">
                            {t.assignee.avatar ? (
                              <img src={t.assignee.avatar} alt={t.assignee.name} className="h-5 w-5 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                                {t.assignee.name[0]}
                              </div>
                            )}
                            <span className="text-zinc-300">{t.assignee.name}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="py-3.5 text-zinc-400">
                        {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '—'}
                      </td>

                      <td className="py-3.5 text-right pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedTask(t)}
                            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                            title="Comments"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(t.id, t.title)}
                            className="rounded-lg p-1.5 text-zinc-500 hover:bg-rose-500/20 hover:text-rose-400 transition"
                            title="Delete Task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Task Details & Real-Time Comments Modal */}
      {selectedTask && (
        <TaskCommentsModal
          task={selectedTask}
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  );
}
