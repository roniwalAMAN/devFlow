/**
 * Socket.IO Authentication Middleware
 * Validates JWT access token passed via socket.handshake.auth.token
 */

import type { Socket } from 'socket.io';
import type { ExtendedError } from 'socket.io/dist/namespace';
import { verifyToken } from '../utils/jwt';

/**
 * Middleware to authenticate Socket.IO connections via JWT
 */
export function socketAuthMiddleware(
  socket: Socket,
  next: (err?: ExtendedError) => void
): void {
  try {
    const rawToken = socket.handshake.auth?.token;

    if (!rawToken || typeof rawToken !== 'string') {
      return next(new Error('Authentication error: Token required'));
    }

    // Normalize token (supports optional 'Bearer ' prefix and trims whitespace)
    let token = rawToken.trim();
    if (token.startsWith('Bearer ')) {
      token = token.slice(7).trim();
    }

    if (!token) {
      return next(new Error('Authentication error: Token required'));
    }

    try {
      const payload = verifyToken(token);
      socket.data.user = {
        userId: payload.userId,
        email: payload.email,
      };
      return next();
    } catch {
      return next(new Error('Authentication error: Invalid or expired token'));
    }
  } catch (error) {
    console.error('Socket authentication middleware error:', error);
    return next(new Error('Authentication error: Internal server error'));
  }
}
