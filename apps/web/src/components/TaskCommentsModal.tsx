'use client';

import React, { useState, useEffect } from 'react';
import { useCollaboration, Task, Comment } from '../context/CollaborationContext';

interface TaskCommentsModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export function TaskCommentsModal({ task, isOpen, onClose }: TaskCommentsModalProps) {
  const {
    currentUser,
    comments,
    fetchComments,
    addComment,
    updateComment,
    deleteComment,
  } = useCollaboration();

  const [newComment, setNewComment] = useState('');
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && task?.id) {
      fetchComments(task.id);
    }
  }, [isOpen, task?.id, fetchComments]);

  if (!isOpen || !task) return null;

  const taskComments: Comment[] = comments[task.id] || [];

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await addComment(task.id, newComment.trim());
      setNewComment('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditContent(comment.content);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editContent.trim()) return;
    await updateComment(task.id, commentId, editContent.trim());
    setEditingCommentId(null);
  };

  const handleDeleteComment = async (commentId: string) => {
    if (confirm('Are you sure you want to delete this comment?')) {
      await deleteComment(task.id, commentId);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                  task.priority === 'URGENT'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    : task.priority === 'HIGH'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}
              >
                {task.priority}
              </span>
              <span className="text-xs text-zinc-500 font-mono">#{task.id.slice(-6)}</span>
            </div>
            <h2 className="mt-1 text-lg font-semibold text-zinc-100">{task.title}</h2>
            {task.description && (
              <p className="mt-1 text-xs text-zinc-400 leading-relaxed">{task.description}</p>
            )}
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Comments Section */}
        <div className="mt-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Discussion & Comments ({taskComments.length})
            </h3>
            <span className="text-[11px] text-emerald-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
              Live Updates
            </span>
          </div>

          {/* Comments List */}
          <div className="max-h-72 overflow-y-auto space-y-3 pr-1">
            {taskComments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-800 py-8 text-center text-xs text-zinc-500">
                No comments on this task yet. Start the conversation!
              </div>
            ) : (
              taskComments.map((c) => {
                const isAuthor = currentUser?.id === c.authorId || !currentUser; // allow edit demo if user not set
                const isEditing = editingCommentId === c.id;

                return (
                  <div
                    key={c.id}
                    className="rounded-xl border border-zinc-800/80 bg-zinc-900/50 p-3.5 transition"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                          {c.author?.name ? c.author.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <span className="text-xs font-medium text-zinc-200">
                          {c.author?.name || 'User'}
                        </span>
                        <span className="text-[10px] text-zinc-500">
                          {new Date(c.createdAt).toLocaleString([], {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </span>
                        {c.updatedAt !== c.createdAt && (
                          <span className="text-[9px] text-zinc-500 italic">(edited)</span>
                        )}
                      </div>

                      {isAuthor && !isEditing && (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleStartEdit(c)}
                            className="text-[11px] text-zinc-400 hover:text-indigo-400 transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-[11px] text-zinc-400 hover:text-rose-400 transition"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="mt-2 space-y-2">
                        <textarea
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          rows={2}
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-950 p-2 text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingCommentId(null)}
                            className="rounded px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(c.id)}
                            className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-500"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {c.content}
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Add Comment Form */}
          <form onSubmit={handleAddComment} className="mt-2 flex flex-col gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Write a comment... (real-time synced to all members)"
              rows={2}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-900/80 p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none transition"
            />
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-zinc-500">
                Press Post Comment to notify team members
              </span>
              <button
                type="submit"
                disabled={!newComment.trim() || isSubmitting}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {isSubmitting ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
