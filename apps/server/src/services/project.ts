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
  name: string,
  excludeProjectId?: string
): Promise<string> {
  const baseSlug = slugify(name) || 'project';
  let slug = baseSlug;
  let counter = 2;

  while (true) {
    const existing = await prisma.project.findUnique({
      where: {
        organizationId_slug: {
          organizationId,
          slug,
        },
      },
    });

    if (!existing || (excludeProjectId && existing.id === excludeProjectId)) {
      break;
    }

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

/**
 * Get project details by projectId and organizationId
 * Includes creator information with safe fields
 */
export async function getProjectDetails(
  organizationId: string,
  projectId: string
) {
  return prisma.project.findFirst({
    where: {
      id: projectId,
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
  });
}

/**
 * Find project by projectId and organizationId
 */
export async function findProjectByIdAndOrg(
  organizationId: string,
  projectId: string
): Promise<Project | null> {
  return prisma.project.findFirst({
    where: {
      id: projectId,
      organizationId,
    },
  });
}

/**
 * Update project fields (name, description, slug)
 */
export async function updateProject(
  projectId: string,
  data: {
    name?: string;
    description?: string | null;
    slug?: string;
  }
): Promise<Project> {
  return prisma.project.update({
    where: {
      id: projectId,
    },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.slug !== undefined && { slug: data.slug }),
    },
  });
}



