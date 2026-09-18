'use client';

import React, { useState } from 'react';
import { useCollaboration, Task } from '../context/CollaborationContext';
import { TaskCommentsModal } from './TaskCommentsModal';

const COLUMNS: { id: Task['status']; title: string; color: string; badge: string }[] = [
  { id: 'TODO', title: 'To Do', color: 'border-zinc-700/60', badge: 'bg-zinc-800 text-zinc-300' },
  {
    id: 'IN_PROGRESS',
    title: 'In Progress',
    color: 'border-indigo-500/40',
    badge: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
  },
  {
    id: 'IN_REVIEW',
    title: 'In Review',
    color: 'border-amber-500/40',
    badge: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
  },
  {
    id: 'DONE',
    title: 'Done',
    color: 'border-emerald-500/40',
    badge: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
  },
];

export function KanbanBoard() {
  const { tasks, moveTask, deleteTask, createTask, updateTask } = useCollaboration();

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createColumnStatus, setCreateColumnStatus] = useState<Task['status']>('TODO');

  // New task form state
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newPriority, setNewPriority] = useState<Task['priority']>('MEDIUM');
  const [isCreating, setIsCreating] = useState(false);

  const handleOpenComments = (task: Task) => {
    setSelectedTask(task);
    setIsCommentsOpen(true);
  };

  const handleOpenCreateModal = (status: Task['status']) => {
    setCreateColumnStatus(status);
    setNewTitle('');
    setNewDescription('');
    setNewPriority('MEDIUM');
    setIsCreateModalOpen(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const colTasks = tasks.filter((t) => t.status === createColumnStatus);
      await createTask({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        status: createColumnStatus,
        priority: newPriority,
        position: colTasks.length,
      });
      setIsCreateModalOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const handleQuickMove = async (task: Task, direction: 'prev' | 'next') => {
    const statusOrder: Task['status'][] = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
    const currentIndex = statusOrder.indexOf(task.status);
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;

    if (nextIndex >= 0 && nextIndex < statusOrder.length) {
      const newStatus = statusOrder[nextIndex];
      const targetColTasks = tasks.filter((t) => t.status === newStatus);
      await moveTask(task.id, newStatus, targetColTasks.length);
    }
  };

  const handleReorder = async (task: Task, direction: 'up' | 'down') => {
    const colTasks = tasks
      .filter((t) => t.status === task.status)
      .sort((a, b) => a.position - b.position);

    const currentIndex = colTasks.findIndex((t) => t.id === task.id);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex >= 0 && targetIndex < colTasks.length) {
      await moveTask(task.id, task.status, targetIndex);
    }
  };

  return (
    <div className="w-full">
      {/* Kanban Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks
            .filter((t) => t.status === col.id)
            .sort((a, b) => a.position - b.position);

          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-2xl border bg-zinc-950/40 p-4 backdrop-blur-xl ${col.color}`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-zinc-100">{col.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${col.badge}`}>
                    {colTasks.length}
                  </span>
                </div>

                <button
                  onClick={() => handleOpenCreateModal(col.id)}
                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                  title={`Add task to ${col.title}`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
              </div>

              {/* Task Cards List */}
              <div className="mt-4 flex-1 space-y-3 min-h-[300px]">
                {colTasks.length === 0 ? (
                  <div className="flex h-32 flex-col items-center justify-center rounded-xl border border-dashed border-zinc-800/80 text-xs text-zinc-500">
                    No tasks yet
                  </div>
                ) : (
                  colTasks.map((task, idx) => (
                    <div
                      key={task.id}
                      className="group relative rounded-xl border border-zinc-800/80 bg-zinc-900/60 p-4 transition-all duration-200 hover:border-zinc-700 hover:bg-zinc-900/90 shadow-sm"
                    >
                      {/* Priority Tag & Actions */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                            task.priority === 'URGENT'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : task.priority === 'HIGH'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : task.priority === 'LOW'
                              ? 'bg-zinc-800 text-zinc-400'
                              : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                          }`}
                        >
                          {task.priority}
                        </span>

                        {/* Reorder Buttons (Up/Down) */}
                        <div className="flex items-center gap-1 opacity-60 group-hover:opacity-100 transition">
                          <button
                            disabled={idx === 0}
                            onClick={() => handleReorder(task, 'up')}
                            className="p-0.5 text-zinc-400 hover:text-white disabled:opacity-30"
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            disabled={idx === colTasks.length - 1}
                            onClick={() => handleReorder(task, 'down')}
                            className="p-0.5 text-zinc-400 hover:text-white disabled:opacity-30"
                            title="Move Down"
                          >
                            ▼
                          </button>
                        </div>
                      </div>

                      {/* Title & Description */}
                      <h4 className="mt-2 font-medium text-sm text-zinc-100 leading-snug">
                        {task.title}
                      </h4>
                      {task.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-zinc-400 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      {/* Footer: Assignee & Bottom Action Buttons */}
                      <div className="mt-4 flex items-center justify-between pt-3 border-t border-zinc-800/60 text-xs">
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300">
                            {task.assignee?.name ? task.assignee.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <span className="text-[11px] truncate max-w-[80px]">
                            {task.assignee?.name || 'Unassigned'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {/* Comments Button */}
                          <button
                            onClick={() => handleOpenComments(task)}
                            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-indigo-400 transition"
                            title="Discussion / Comments"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                              />
                            </svg>
                            <span>Chat</span>
                          </button>

                          {/* Quick Column Shift (Prev / Next) */}
                          <div className="flex items-center gap-1 border-l border-zinc-800 pl-2">
                            {col.id !== 'TODO' && (
                              <button
                                onClick={() => handleQuickMove(task, 'prev')}
                                className="text-[10px] text-zinc-400 hover:text-white px-1 py-0.5 rounded bg-zinc-800"
                                title="Move to previous status"
                              >
                                ←
                              </button>
                            )}
                            {col.id !== 'DONE' && (
                              <button
                                onClick={() => handleQuickMove(task, 'next')}
                                className="text-[10px] text-zinc-400 hover:text-white px-1 py-0.5 rounded bg-zinc-800"
                                title="Move to next status"
                              >
                                →
                              </button>
                            )}
                          </div>

                          {/* Delete Task */}
                          <button
                            onClick={() => {
                              if (confirm('Delete this task?')) deleteTask(task.id);
                            }}
                            className="text-zinc-500 hover:text-rose-400 transition ml-1"
                            title="Delete task"
                          >
                            <svg
                              className="h-3.5 w-3.5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Comments Modal */}
      <TaskCommentsModal
        task={selectedTask}
        isOpen={isCommentsOpen}
        onClose={() => {
          setIsCommentsOpen(false);
          setSelectedTask(null);
        }}
      />

      {/* Create Task Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
            <h3 className="text-base font-semibold text-zinc-100">
              Create Task in {COLUMNS.find((c) => c.id === createColumnStatus)?.title}
            </h3>

            <form onSubmit={handleCreateTask} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Implement WebRTC audio calling"
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Description</label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Describe the task requirements and scope..."
                  rows={3}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as Task['priority'])}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-2.5 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="mt-6 flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || isCreating}
                  className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50"
                >
                  {isCreating ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
