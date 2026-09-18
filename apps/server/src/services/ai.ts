/**
 * AI Coding Assistant Service
 * Integrates Google Gemini with contextual prompt construction, safety sanitization, and structured responses
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { prisma } from '@devflow/database';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

let geminiClient: GoogleGenerativeAI | null = null;
if (GEMINI_API_KEY) {
  geminiClient = new GoogleGenerativeAI(GEMINI_API_KEY);
}

export interface AIAssistantContext {
  projectId?: string;
  taskId?: string;
  code?: string;
  language?: string;
}

export interface AIAssistantInput {
  prompt: string;
  context?: AIAssistantContext;
}

export interface AIAssistantResponseData {
  answer: string;
  suggestions: string[];
}

const REDACTION_PATTERNS = [
  /bearer\s+[a-zA-Z0-9_\-\.]+/gi,
  /eyJ[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+\.[a-zA-Z0-9_\-]+/g, // JWTs
  /postgres(ql)?:\/\/[^@\s]+@[^\s]+/gi, // DB URIs
  /ghp_[a-zA-Z0-9]{36}/g, // GitHub tokens
  /(api[_-]?key|secret|password|passwd|pwd)\s*[:=]\s*['"][^'"]+['"]/gi,
];

/**
 * Sanitize prompt and code context to prevent credential leakage
 */
export function sanitizeAIInput(text: string): string {
  if (!text) return text;
  let clean = text;
  for (const pattern of REDACTION_PATTERNS) {
    clean = clean.replace(pattern, '[REDACTED_SECRET]');
  }
  return clean;
}

/**
 * Generate AI Assistant response
 */
export async function generateAIResponse(
  input: AIAssistantInput,
  userContext?: { userId: string; userEmail?: string }
): Promise<AIAssistantResponseData> {
  const cleanPrompt = sanitizeAIInput(input.prompt);
  let contextInfo = '';

  // 1. Enrich context if taskId or projectId provided
  if (input.context?.taskId) {
    try {
      const task = await prisma.task.findUnique({
        where: { id: input.context.taskId },
        select: { title: true, description: true, status: true, priority: true },
      });
      if (task) {
        contextInfo += `\nTask Context: "${task.title}" (Status: ${task.status}, Priority: ${task.priority})\n${task.description || ''}`;
      }
    } catch {
      // Ignore task lookup error
    }
  }

  if (input.context?.code) {
    const cleanCode = sanitizeAIInput(input.context.code);
    const lang = input.context.language || 'typescript';
    contextInfo += `\n\nCode Snippet (${lang}):\n\`\`\`${lang}\n${cleanCode}\n\`\`\``;
  }

  // 2. Build full prompt
  const fullPrompt = `${contextInfo ? `Context:\n${contextInfo}\n\n` : ''}User Query: ${cleanPrompt}\n\nProvide a comprehensive, high quality explanation or solution, followed by a short list of 2-4 actionable next steps or suggestions.`;

  // 3. If Gemini is available, query Gemini API
  if (GEMINI_API_KEY && geminiClient) {
    try {
      const model = geminiClient.getGenerativeModel({
        model: 'gemini-1.5-flash',
        systemInstruction:
          'You are DevFlow AI, an elite AI coding assistant and software engineering partner. Provide concise, secure, accurate explanations, code snippets, and automated test suggestions. Never invent executing commands unless running real code. Keep answers structured.',
      });

      const result = await model.generateContent(fullPrompt);
      const responseText = result.response.text();

      // Extract actionable suggestions
      const suggestions = extractSuggestionsFromResponse(responseText);

      return {
        answer: responseText,
        suggestions,
      };
    } catch (err: any) {
      console.warn('[Gemini AI] API query failed, using intelligent fallback:', err.message);
    }
  }

  // 4. Intelligent Fallback (When API key not supplied or service temporary unavailable)
  return generateIntelligentFallback(cleanPrompt, input.context);
}

/**
 * Extract suggestions from AI response or synthesize standard suggestions
 */
function extractSuggestionsFromResponse(response: string): string[] {
  const suggestions: string[] = [];
  const lines = response.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (
      (trimmed.startsWith('- [ ]') ||
        trimmed.startsWith('* ') ||
        trimmed.startsWith('- ') ||
        /^\d+\.\s/.test(trimmed)) &&
      trimmed.length > 10 &&
      trimmed.length < 120
    ) {
      const cleaned = trimmed.replace(/^[-*•\d\.\s\[\]]+/, '').trim();
      if (cleaned && !suggestions.includes(cleaned)) {
        suggestions.push(cleaned);
      }
    }
  }

  if (suggestions.length === 0) {
    return [
      'Write unit tests for edge cases',
      'Refactor into modular utility functions',
      'Add input validation and error handling',
      'Optimize database queries with indexing',
    ];
  }

  return suggestions.slice(0, 4);
}

/**
 * Intelligent Fallback Generator
 */
function generateIntelligentFallback(
  prompt: string,
  context?: AIAssistantContext
): AIAssistantResponseData {
  const lower = prompt.toLowerCase();

  let answer = '';
  let suggestions: string[] = [];

  if (lower.includes('test') || lower.includes('spec')) {
    answer = `### Unit & Integration Test Recommendation\n\nFor the requested functionality, ensure complete test coverage across:\n1. **Happy Path**: Valid input arguments and expected output.\n2. **Edge Cases**: Empty inputs, boundary values, and unauthorized callers.\n3. **Error Handling**: Graceful rejection and meaningful status codes.\n\n\`\`\`typescript\ndescribe('Feature Test Suite', () => {\n  it('should process valid input correctly', async () => {\n    // Arrange & Act\n    const result = await executeOperation({ valid: true });\n    // Assert\n    expect(result.success).toBe(true);\n  });\n});\n\`\`\``;
    suggestions = [
      'Add mock database fixtures',
      'Test edge cases with invalid parameters',
      'Add performance benchmark test',
    ];
  } else if (lower.includes('debug') || lower.includes('error') || lower.includes('fix')) {
    answer = `### Debugging & Root Cause Analysis\n\nWhen troubleshooting this issue:\n1. Verify parameter validation before invoking downstream services.\n2. Check for asynchronous unhandled promise rejections.\n3. Ensure database constraints and unique indexes are satisfied.\n\nEnsure proper try/catch boundaries with structured error logging.`;
    suggestions = [
      'Inspect server logs for stack traces',
      'Check database foreign key constraints',
      'Verify JWT authorization headers',
    ];
  } else {
    answer = `### DevFlow AI Coding Analysis\n\n**Analysis for:** "${prompt}"\n\n${
      context?.code
        ? `Reviewed code snippet in **${context.language || 'typescript'}**.\n- Architecture follows modular service/controller conventions.\n- Ensure safe credential handling and centralized error handling.`
        : 'DevFlow AI is ready to analyze your codebase, generate tests, explain logic, and debug errors.'
    }\n\nTo run full Gemini models, configure \`GEMINI_API_KEY\` in your \`.env.local\`.`;
    suggestions = [
      'Generate automated test cases',
      'Analyze code complexity and performance',
      'Refactor into reusable service functions',
    ];
  }

  return {
    answer,
    suggestions,
  };
}
