'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../../context/AuthContext';
import { Navbar } from '../../../../components/Navbar';
import { api } from '../../../../lib/api';
import { useToast } from '../../../../components/Toast';
import {
  FolderGit2,
  Plus,
  Trash2,
  Calendar,
  Layers,
  ArrowRight,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { Github } from '../../../../components/Icons';

export default function ProjectsListPage() {
  const params = useParams();
  const router = useRouter();
  const { currentRole, isAuthenticated, isLoading: authLoading } = useAuth();
  const { success, error } = useToast();

  const organizationId = (params?.organizationId as string) || '';

  const [projects, setProjects] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Create Project Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canManage = currentRole === 'OWNER' || currentRole === 'ADMIN' || currentRole === 'DEVELOPER';
  const canDelete = currentRole === 'OWNER' || currentRole === 'ADMIN';

  const loadProjects = useCallback(async () => {
    if (!organizationId) return;
    setIsLoading(true);

    try {
      const res = await api.listProjects(organizationId);
      if (res.success && Array.isArray(res.data)) {
        setProjects(res.data);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated) {
      loadProjects();
    }
  }, [authLoading, isAuthenticated, loadProjects, router]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await api.createProject(organizationId, {
        name: name.trim(),
        description: description.trim() || undefined,
      });

      if (res.success && res.data) {
        success(`Project "${res.data.name}" created successfully!`, 'Project Created');
        setName('');
        setDescription('');
        setIsCreateModalOpen(false);
        await loadProjects();
      } else {
        error(res.message || 'Failed to create project.', 'Error');
      }
    } catch (err: any) {
      error(err.message || 'An error occurred.', 'Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProject = async (projectId: string, projName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!confirm(`Are you sure you want to delete project "${projName}"? All associated tasks and comments will be permanently removed.`)) {
      return;
    }

    try {
      const res = await api.deleteProject(organizationId, projectId);
      if (res.success) {
        success(`Project "${projName}" deleted.`);
        await loadProjects();
      } else {
        error(res.message || 'Failed to delete project.');
      }
    } catch (err: any) {
      error(err.message || 'An error occurred.');
    }
  };

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Header Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono mb-1">
              <span>Organization</span>
              <span>/</span>
              <span>Projects</span>
            </div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <FolderGit2 className="h-6 w-6 text-indigo-400" />
              Engineering Projects
            </h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search projects..."
                className="w-48 sm:w-64 rounded-xl border border-zinc-800 bg-zinc-900 pl-9 pr-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {canManage && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:bg-indigo-500 transition"
              >
                <Plus className="h-4 w-4" />
                <span>New Project</span>
              </button>
            )}
          </div>
        </div>

        {/* Project Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-48 rounded-2xl border border-zinc-800 bg-zinc-900/40 animate-pulse" />
            ))}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-800 p-12 text-center">
            <FolderGit2 className="mx-auto h-12 w-12 text-zinc-600 mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Projects Found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto mb-4">
              {searchQuery ? 'No projects match your search query.' : 'Create your first sprint project to start managing tasks.'}
            </p>
            {canManage && !searchQuery && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 transition"
              >
                <Plus className="h-4 w-4" />
                <span>Create Project</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((proj) => (
              <Link
                key={proj.id}
                href={`/organizations/${organizationId}/projects/${proj.id}`}
                className="group relative rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 hover:border-indigo-500/50 hover:bg-zinc-900/70 transition flex flex-col justify-between shadow-lg"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-bold text-base text-white group-hover:text-indigo-300 transition truncate">
                      {proj.name}
                    </span>
                    {canDelete && (
                      <button
                        onClick={(e) => handleDeleteProject(proj.id, proj.name, e)}
                        className="opacity-0 group-hover:opacity-100 rounded-lg p-1 text-zinc-500 hover:bg-rose-500/20 hover:text-rose-400 transition"
                        title="Delete Project"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 line-clamp-3 leading-relaxed mb-4">
                    {proj.description || 'Sprint project for managing tasks, discussions, and repository syncing.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-zinc-800/80 space-y-3">
                  {proj.githubRepoOwner && (
                    <div className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                      <Github className="h-3.5 w-3.5 text-zinc-400" />
                      <span className="font-mono truncate">{proj.githubRepoOwner}/{proj.githubRepoName}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-zinc-500">
                    <span className="font-mono text-zinc-400">{proj.slug}</span>
                    <span className="text-indigo-400 group-hover:translate-x-1 transition font-semibold flex items-center gap-1">
                      Open Sprint <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Create Project</h3>
            <p className="text-xs text-zinc-400 mb-4">Initialize a new project within this organization.</p>

            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Project Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Distributed Task Queue"
                  required
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Goals, deliverables, and engineering scope..."
                  rows={3}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-xl px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50 transition"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
