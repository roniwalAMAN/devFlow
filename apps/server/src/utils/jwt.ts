/**
 * JWT utilities for token generation
 */

import jwt, { type SignOptions } from 'jsonwebtoken';

export interface JwtUserPayload {
  userId: string;
  email: string;
}

/**
 * Generate a signed JWT token containing minimal user payload
 * @param payload - Minimal user data (userId, email)
 * @returns Signed JWT string
 */
export function generateToken(payload: JwtUserPayload): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }

  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

  const signOptions: SignOptions = {
    expiresIn,
  };

  return jwt.sign(payload, secret, signOptions);
}
