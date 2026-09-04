/**
 * User service layer
 * Handles user creation and password operations
 */

import bcrypt from 'bcrypt';
import { prisma } from '@devflow/database';
import type { User } from '@prisma/client';

const SALT_ROUNDS = 10;

/**
 * Hash password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare plain text password with stored bcrypt hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Create a new user with hashed password
 */
export async function createUser(data: {
  name: string;
  email: string;
  password: string;
}): Promise<User> {
  const passwordHash = await hashPassword(data.password);

  return prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
    },
  });
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { email },
  });
}

/**
 * Format user response (exclude passwordHash)
 */
export function formatUserResponse(user: User) {
  const { passwordHash: _, ...safeUser } = user;
  return safeUser;
}
