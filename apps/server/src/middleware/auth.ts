/**
 * Authentication middleware
 * Validates Bearer JWT tokens from Authorization header
 */

import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

/**
 * Express middleware to authenticate requests via JWT Bearer token
 */
export function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided',
      });
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1].trim()) {
      res.status(401).json({
        success: false,
        message: 'Invalid authorization format. Format must be: Bearer <token>',
      });
      return;
    }

    const token = parts[1].trim();

    try {
      const payload = verifyToken(token);
      req.user = payload;
      next();
    } catch {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired token',
      });
      return;
    }
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during authentication',
    });
  }
}
