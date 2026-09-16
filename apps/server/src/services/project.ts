/**
 * Project service layer
 * Handles project creation and slug generation
 */

import { prisma } from '@devflow/database';
import type { Project } from '@devflow/database';
import { slugify } from '../utils/slug';

/**
 * Generate a unique slug for a project within an organization
 * Appends a numeric suffix (-2, -3, ...) if collision occurs within the same organization
 */
export async function generateUniqueProjectSlug(
  organizationId: string,
  name: string
): Promise<string> {
  const baseSlug = slugify(name) || 'project';
  let slug = baseSlug;
  let counter = 2;

  while (
    await prisma.project.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug,
        },
      },
    })
  ) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Create a new project within an organization
 */
export async function createProject(data: {
  organizationId: string;
  name: string;
  description?: string | null;
  createdById: string;
}): Promise<Project> {
  const trimmedName = data.name.trim();
  const slug = await generateUniqueProjectSlug(data.organizationId, trimmedName);

  return prisma.project.create({
    data: {
      organizationId: data.organizationId,
      name: trimmedName,
      description: data.description ?? null,
      slug,
      createdById: data.createdById,
    },
  });
}

/**
 * Format project response object
 */
export function formatProjectResponse(project: Project) {
  return {
    id: project.id,
    organizationId: project.organizationId,
    name: project.name,
    description: project.description,
    slug: project.slug,
    createdById: project.createdById,
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  };
}

/**
 * Get all projects for an organization sorted by createdAt desc
 * Includes creator information with safe fields
 */
export async function getOrganizationProjects(organizationId: string) {
  return prisma.project.findMany({
    where: {
      organizationId,
    },
    select: {
      id: true,
      organizationId: true,
      name: true,
      description: true,
      slug: true,
      createdById: true,
      createdAt: true,
      updatedAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

