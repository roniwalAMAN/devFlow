/**
 * Organization service layer
 * Handles organization creation and member association
 */

import { prisma, MemberRole } from '@devflow/database';
import type { Organization } from '@devflow/database';
import { slugify } from '../utils/slug';

/**
 * Generate a unique slug for an organization name
 * Appends a numeric suffix if collision occurs
 */
export async function generateUniqueSlug(name: string): Promise<string> {
  const baseSlug = slugify(name) || 'organization';
  let slug = baseSlug;
  let counter = 1;

  while (await prisma.organization.findUnique({ where: { slug } })) {
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Create a new organization and assign the creator as OWNER within a transaction
 */
export async function createOrganization(
  userId: string,
  name: string
): Promise<Organization> {
  const trimmedName = name.trim();
  const slug = await generateUniqueSlug(trimmedName);

  return prisma.$transaction(async (tx) => {
    // 1. Create Organization
    const organization = await tx.organization.create({
      data: {
        name: trimmedName,
        slug,
        ownerId: userId,
      },
    });

    // 2. Automatically create OrganizationMember as OWNER
    await tx.organizationMember.create({
      data: {
        userId,
        organizationId: organization.id,
        role: MemberRole.OWNER,
      },
    });

    return organization;
  });
}

/**
 * Format organization response object excluding internal/unnecessary fields
 */
export function formatOrganizationResponse(organization: Organization) {
  return {
    id: organization.id,
    name: organization.name,
    slug: organization.slug,
    ownerId: organization.ownerId,
    createdAt: organization.createdAt,
    updatedAt: organization.updatedAt,
  };
}

/**
 * Get all organizations where the specified user is a member
 * Returns safe organization fields and safe owner details
 */
export async function getUserOrganizations(userId: string) {
  return prisma.organization.findMany({
    where: {
      members: {
        some: {
          userId,
        },
      },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      owner: {
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
 * Get organization details by ID including owner and members with safe fields
 */
export async function getOrganizationDetails(organizationId: string) {
  return prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
    select: {
      id: true,
      name: true,
      slug: true,
      ownerId: true,
      createdAt: true,
      updatedAt: true,
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      },
      members: {
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
    },
  });
}

/**
 * Find organization by ID
 */
export async function findOrganizationById(organizationId: string) {
  return prisma.organization.findUnique({
    where: {
      id: organizationId,
    },
  });
}

/**
 * Get organization membership for a specific user
 */
export async function getOrganizationMember(
  organizationId: string,
  userId: string
) {
  return prisma.organizationMember.findUnique({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });
}

/**
 * Add a member to an organization
 * Returns safe member info including user details
 */
export async function addOrganizationMember(data: {
  organizationId: string;
  userId: string;
  role: MemberRole;
}) {
  return prisma.organizationMember.create({
    data: {
      organizationId: data.organizationId,
      userId: data.userId,
      role: data.role,
    },
    select: {
      id: true,
      role: true,
      createdAt: true,
      user: {
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
 * Remove a member from an organization
 */
export async function removeOrganizationMember(
  organizationId: string,
  userId: string
) {
  return prisma.organizationMember.delete({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
  });
}

/**
 * Update the role of an organization member
 * Returns safe member info including user details
 */
export async function updateOrganizationMemberRole(
  organizationId: string,
  userId: string,
  role: MemberRole
) {
  return prisma.organizationMember.update({
    where: {
      userId_organizationId: {
        userId,
        organizationId,
      },
    },
    data: {
      role,
    },
    select: {
      id: true,
      role: true,
      user: {
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
 * Find a pending organization invite by organizationId and email
 * An invite is pending if acceptedAt is null and expiresAt is in the future
 */
export async function findPendingInvite(
  organizationId: string,
  email: string
) {
  return prisma.organizationInvite.findFirst({
    where: {
      organizationId,
      email,
      acceptedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
  });
}

/**
 * Create a new organization invite
 */
export async function createOrganizationInvite(data: {
  organizationId: string;
  email: string;
  role: MemberRole;
  token: string;
  expiresAt: Date;
}) {
  return prisma.organizationInvite.create({
    data: {
      organizationId: data.organizationId,
      email: data.email,
      role: data.role,
      token: data.token,
      expiresAt: data.expiresAt,
    },
    select: {
      id: true,
      organizationId: true,
      email: true,
      role: true,
      token: true,
      expiresAt: true,
      createdAt: true,
      acceptedAt: true,
    },
  });
}

/**
 * List pending organization invites for an organization
 * Pending invites: acceptedAt is null and expiresAt > current time
 * Tokens and sensitive fields are excluded
 */
export async function listPendingInvites(organizationId: string) {
  return prisma.organizationInvite.findMany({
    where: {
      organizationId,
      acceptedAt: null,
      expiresAt: {
        gt: new Date(),
      },
    },
    select: {
      id: true,
      organizationId: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
      acceptedAt: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

/**
 * Find an organization invite by ID
 */
export async function findInviteById(inviteId: string) {
  return prisma.organizationInvite.findUnique({
    where: {
      id: inviteId,
    },
  });
}

/**
 * Delete an organization invite by ID
 */
export async function deleteOrganizationInvite(inviteId: string) {
  return prisma.organizationInvite.delete({
    where: {
      id: inviteId,
    },
  });
}




