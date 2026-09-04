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

/**
 * Verify and decode a JWT token
 * @param token - JWT token string
 * @returns Decoded JwtUserPayload
 */
export function verifyToken(token: string): JwtUserPayload {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }

  const decoded = jwt.verify(token, secret) as JwtUserPayload;

  if (!decoded || typeof decoded !== 'object' || !decoded.userId || !decoded.email) {
    throw new Error('Invalid token payload');
  }

  return {
    userId: decoded.userId,
    email: decoded.email,
  };
}
