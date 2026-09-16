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
 * Find an organization member by user email
 */
export async function getOrganizationMemberByEmail(
  organizationId: string,
  email: string
) {
  const normalizedEmail = email.trim().toLowerCase();
  return prisma.organizationMember.findFirst({
    where: {
      organizationId,
      user: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
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
  const normalizedEmail = email.trim().toLowerCase();
  return prisma.organizationInvite.findFirst({
    where: {
      organizationId,
      email: {
        equals: normalizedEmail,
        mode: 'insensitive',
      },
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
      email: data.email.trim().toLowerCase(),
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
 * Find an organization invite by token
 */
export async function findInviteByToken(token: string) {
  return prisma.organizationInvite.findUnique({
    where: {
      token,
    },
  });
}

/**
 * Accept an organization invite atomically inside a transaction
 */
export async function acceptOrganizationInvite(
  inviteId: string,
  userId: string,
  _organizationId: string,
  _role: MemberRole
) {
  return prisma.$transaction(async (tx) => {
    // 1. Re-verify invite inside transaction
    const invite = await tx.organizationInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new Error('INVITE_NOT_FOUND');
    }

    if (invite.acceptedAt !== null) {
      throw new Error('INVITE_ALREADY_ACCEPTED');
    }

    if (new Date(invite.expiresAt) <= new Date()) {
      throw new Error('INVITE_EXPIRED');
    }

    // 2. Re-verify user existence and email match inside transaction
    const user = await tx.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('USER_NOT_FOUND');
    }

    if (user.email.trim().toLowerCase() !== invite.email.trim().toLowerCase()) {
      throw new Error('EMAIL_MISMATCH');
    }

    // 3. Re-verify membership does not already exist
    const existingMember = await tx.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId: invite.organizationId,
        },
      },
    });

    if (existingMember) {
      throw new Error('ALREADY_MEMBER');
    }

    // 4. Create OrganizationMember
    await tx.organizationMember.create({
      data: {
        userId,
        organizationId: invite.organizationId,
        role: invite.role,
      },
    });

    // 5. Update invite acceptedAt
    await tx.organizationInvite.update({
      where: { id: invite.id },
      data: {
        acceptedAt: new Date(),
      },
    });

    return {
      organizationId: invite.organizationId,
      role: invite.role,
    };
  });
}

/**
 * Resend an organization invite by updating its token and expiresAt
 */
export async function resendOrganizationInvite(
  inviteId: string,
  token: string,
  expiresAt: Date
) {
  return prisma.$transaction(async (tx) => {
    const invite = await tx.organizationInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new Error('INVITE_NOT_FOUND');
    }

    if (invite.acceptedAt !== null) {
      throw new Error('INVITE_ALREADY_ACCEPTED');
    }

    return tx.organizationInvite.update({
      where: {
        id: inviteId,
      },
      data: {
        token,
        expiresAt,
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
  });
}

/**
 * Delete an organization invite by ID
 */
export async function deleteOrganizationInvite(inviteId: string) {
  return prisma.$transaction(async (tx) => {
    const invite = await tx.organizationInvite.findUnique({
      where: { id: inviteId },
    });

    if (!invite) {
      throw new Error('INVITE_NOT_FOUND');
    }

    if (invite.acceptedAt !== null) {
      throw new Error('INVITE_ALREADY_ACCEPTED');
    }

    return tx.organizationInvite.delete({
      where: {
        id: inviteId,
      },
    });
  });
}







