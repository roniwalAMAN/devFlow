'use client';

import React, { useState } from 'react';
import { useCollaboration } from '../context/CollaborationContext';
import { SOCKET_URL } from '../lib/socket';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIAssistantModal({ isOpen, onClose }: AIAssistantModalProps) {
  const { token, activeProjectId, tasks } = useCollaboration();

  const [prompt, setPrompt] = useState('');
  const [codeContext, setCodeContext] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [showCodeInput, setShowCodeInput] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<{ answer: string; suggestions: string[] } | null>(
    null
  );

  if (!isOpen) return null;

  const handleAskAI = async (customPrompt?: string) => {
    const query = customPrompt || prompt;
    if (!query.trim() || !token || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`${SOCKET_URL}/api/ai/assistant`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: query.trim(),
          context: {
            projectId: activeProjectId || undefined,
            taskId: selectedTaskId || undefined,
            code: showCodeInput && codeContext.trim() ? codeContext.trim() : undefined,
            language: showCodeInput ? language : undefined,
          },
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setAiResponse(data.data);
      } else {
        setError(data.message || 'AI request failed');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with AI assistant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (template: string) => {
    setPrompt(template);
    handleAskAI(template);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative flex h-[85vh] w-full max-w-3xl flex-col rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 text-white shadow-md shadow-purple-500/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-zinc-100">DevFlow AI Assistant</h2>
                <span className="rounded-full bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
                  Gemini Powered
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Explain logic, generate automated tests, debug errors, and summarize sprint tasks.
              </p>
            </div>
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

        {/* Quick Action Chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleQuickPrompt('Explain how this code or task architecture works')}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 hover:border-indigo-500 hover:text-indigo-300 transition"
          >
            💡 Explain Logic
          </button>
          <button
            onClick={() => handleQuickPrompt('Generate comprehensive automated unit tests for this feature')}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 hover:border-indigo-500 hover:text-indigo-300 transition"
          >
            🧪 Generate Tests
          </button>
          <button
            onClick={() => handleQuickPrompt('Debug potential runtime errors, edge cases, and security vulnerabilities')}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 hover:border-indigo-500 hover:text-indigo-300 transition"
          >
            🐛 Debug & Fix
          </button>
          <button
            onClick={() => handleQuickPrompt('Summarize the status, blockers, and next steps for this sprint task')}
            className="rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1 text-xs text-zinc-300 hover:border-indigo-500 hover:text-indigo-300 transition"
          >
            📋 Task Summary
          </button>
        </div>

        {/* Response Feed Area */}
        <div className="mt-4 flex-1 overflow-y-auto space-y-4 rounded-xl border border-zinc-800/80 bg-zinc-900/30 p-4">
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex h-48 flex-col items-center justify-center space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
              <p className="text-xs text-zinc-400">DevFlow AI is analyzing your prompt and code context...</p>
            </div>
          ) : aiResponse ? (
            <div className="space-y-4">
              <div className="prose prose-invert max-w-none text-xs leading-relaxed text-zinc-200 whitespace-pre-wrap">
                {aiResponse.answer}
              </div>

              {aiResponse.suggestions && aiResponse.suggestions.length > 0 && (
                <div className="border-t border-zinc-800 pt-3">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                    Suggested Next Actions
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {aiResponse.suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickPrompt(s)}
                        className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-300 hover:bg-purple-500/20 transition"
                      >
                        → {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-48 flex-col items-center justify-center text-center text-xs text-zinc-500">
              <p>Ask a coding question or attach a code snippet and task context below.</p>
              <p className="mt-1 text-zinc-600">Sensitive credentials and tokens are automatically sanitized.</p>
            </div>
          )}
        </div>

        {/* Input Form & Context Attachments */}
        <div className="mt-4 space-y-3">
          {/* Context Options Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-3">
              {/* Task selector */}
              {tasks.length > 0 && (
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 focus:outline-none"
                >
                  <option value="">Attach Sprint Task (Optional)</option>
                  {tasks.map((t) => (
                    <option key={t.id} value={t.id}>
                      Task: {t.title.slice(0, 30)}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() => setShowCodeInput(!showCodeInput)}
                className={`rounded-lg border px-2.5 py-1 transition ${
                  showCodeInput
                    ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                    : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {showCodeInput ? '✓ Code Attached' : '+ Attach Code Snippet'}
              </button>
            </div>

            {showCodeInput && (
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-300 focus:outline-none"
              >
                <option value="typescript">TypeScript</option>
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="sql">SQL</option>
                <option value="json">JSON</option>
              </select>
            )}
          </div>

          {/* Code Snippet Box */}
          {showCodeInput && (
            <textarea
              value={codeContext}
              onChange={(e) => setCodeContext(e.target.value)}
              placeholder={`Paste ${language} code snippet here...`}
              rows={3}
              className="w-full rounded-xl border border-zinc-700 bg-zinc-950 p-2.5 font-mono text-xs text-zinc-200 focus:border-indigo-500 focus:outline-none"
            />
          )}

          {/* Main Prompt Input Box */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAskAI();
                }
              }}
              placeholder="Ask DevFlow AI a coding question..."
              className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs text-zinc-200 placeholder-zinc-500 focus:border-indigo-500 focus:outline-none transition"
            />
            <button
              onClick={() => handleAskAI()}
              disabled={isLoading || !prompt.trim()}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-5 py-2.5 text-xs font-semibold text-white shadow-md shadow-indigo-600/30 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 transition"
            >
              {isLoading ? 'Thinking...' : 'Ask AI'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
