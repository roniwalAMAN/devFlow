/**
 * AI Assistant Controller
 */

import { Response } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { generateAIResponse, AIAssistantInput } from '../services/ai';
import { getOrganizationMember } from '../services/organization';
import { prisma } from '@devflow/database';

/**
 * POST /api/ai/assistant
 * Ask AI coding assistant
 */
export async function askAIAssistantHandler(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  const { prompt, context } = req.body as AIAssistantInput;
  const userId = req.user?.userId;

  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    res.status(400).json({
      success: false,
      message: 'Prompt is required and must be a non-empty string',
    });
    return;
  }

  if (prompt.length > 5000) {
    res.status(400).json({
      success: false,
      message: 'Prompt exceeds maximum allowed length of 5000 characters',
    });
    return;
  }

  try {
    // If project or task context is provided, verify user has access
    if (context?.projectId) {
      const project = await prisma.project.findUnique({
        where: { id: context.projectId },
        select: { organizationId: true },
      });

      if (project && userId) {
        const membership = await getOrganizationMember(project.organizationId, userId);
        if (!membership) {
          res.status(403).json({
            success: false,
            message: 'Forbidden. You do not have access to the specified project context',
          });
          return;
        }
      }
    }

    if (context?.taskId) {
      const task = await prisma.task.findUnique({
        where: { id: context.taskId },
        include: { project: { select: { organizationId: true } } },
      });

      if (task && userId) {
        const membership = await getOrganizationMember(task.project.organizationId, userId);
        if (!membership) {
          res.status(403).json({
            success: false,
            message: 'Forbidden. You do not have access to the specified task context',
          });
          return;
        }
      }
    }

    const result = await generateAIResponse(
      { prompt: prompt.trim(), context },
      { userId: userId!, userEmail: req.user?.email }
    );

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('AI assistant error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal AI assistant error',
    });
  }
}
