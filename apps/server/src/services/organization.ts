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
  };
}
