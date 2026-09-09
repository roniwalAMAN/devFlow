/**
 * JWT utilities for token generation
 */

import crypto from 'crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';

export interface JwtUserPayload {
  userId: string;
  email: string;
}

/**
 * Parse a duration string (e.g. '15m', '1h', '7d', '30d', '60s') into milliseconds
 */
export function parseDuration(durationStr: string): number {
  const match = /^(\d+)\s*([smhd])$/i.exec(durationStr.trim());
  if (match) {
    const value = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
    }
  }
  const parsed = parseInt(durationStr, 10);
  if (!isNaN(parsed)) {
    return parsed;
  }
  // Default to 7 days in ms
  return 7 * 24 * 60 * 60 * 1000;
}

/**
 * Generate a signed short-lived JWT access token containing minimal user payload
 * @param payload - Minimal user data (userId, email)
 * @returns Signed JWT string
 */
export function generateToken(payload: JwtUserPayload): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined');
  }

  const expiresIn = (process.env.JWT_EXPIRES_IN || '15m') as SignOptions['expiresIn'];

  const signOptions: SignOptions = {
    expiresIn,
  };

  return jwt.sign(payload, secret, signOptions);
}

/**
 * Generate a cryptographically secure random refresh token
 * @returns 80-character hex string
 */
export function generateRefreshToken(): string {
  return crypto.randomBytes(40).toString('hex');
}

/**
 * Calculate expiration date for a refresh token based on REFRESH_TOKEN_EXPIRES_IN env var
 * @returns Date instance representing the expiration timestamp
 */
export function getRefreshTokenExpiry(): Date {
  const durationStr = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';
  const durationMs = parseDuration(durationStr);
  return new Date(Date.now() + durationMs);
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
