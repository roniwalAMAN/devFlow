/**
 * Authentication controller
 * Handles registration endpoint
 */

import type { Request, Response } from 'express';
import {
  validateRegistrationInput,
  validateLoginInput,
  validateRefreshTokenInput,
} from '../utils/validation';
import {
  createUser,
  findUserByEmail,
  comparePassword,
  formatUserResponse,
  createRefreshTokenRecord,
  findRefreshTokenWithUser,
  revokeRefreshToken,
} from '../services/user';
import {
  generateToken,
  generateRefreshToken,
  getRefreshTokenExpiry,
} from '../utils/jwt';

/**
 * POST /api/auth/register
 * Register a new user
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password } = req.body;

    // Validate input
    const validationErrors = validateRegistrationInput({ name, email, password });
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors,
      });
      return;
    }

    // Check if email already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      res.status(409).json({
        success: false,
        message: 'Email already registered',
      });
      return;
    }

    // Create user
    const user = await createUser({
      name: name as string,
      email: email as string,
      password: password as string,
    });

    // Return safe user response
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: formatUserResponse(user),
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during registration',
    });
  }
}

/**
 * POST /api/auth/login
 * Authenticate user and return access & refresh tokens with safe user information
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body;

    // Validate input
    const validationErrors = validateLoginInput({ email, password });
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors,
      });
      return;
    }

    // Find user by email
    const user = await findUserByEmail(email as string);
    if (!user) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Compare password with stored password hash
    const isPasswordValid = await comparePassword(
      password as string,
      user.passwordHash
    );
    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
      return;
    }

    // Generate short-lived access token
    const accessToken = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Generate long-lived refresh token
    const refreshToken = generateRefreshToken();
    const expiresAt = getRefreshTokenExpiry();

    // Store refresh token in database
    await createRefreshTokenRecord(user.id, refreshToken, expiresAt);

    // Return safe user info (never passwordHash) and both tokens
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        accessToken,
        refreshToken,
        user: formatUserResponse(user),
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during login',
    });
  }
}

/**
 * POST /api/auth/refresh
 * Refresh access token using a valid, unexpired refresh token
 */
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    // Validate input
    const validationErrors = validateRefreshTokenInput({ refreshToken });
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors,
      });
      return;
    }

    // Find refresh token in database
    const tokenRecord = await findRefreshTokenWithUser(refreshToken as string);

    // Check if token exists and has not expired
    if (!tokenRecord || !tokenRecord.user || new Date() > tokenRecord.expiresAt) {
      res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token',
      });
      return;
    }

    // Generate new short-lived access token
    const accessToken = generateToken({
      userId: tokenRecord.user.id,
      email: tokenRecord.user.email,
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken,
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during token refresh',
    });
  }
}

/**
 * POST /api/auth/logout
 * Revoke refresh token by deleting it from the database
 */
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    // Validate input
    const validationErrors = validateRefreshTokenInput({ refreshToken });
    if (validationErrors.length > 0) {
      res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors,
      });
      return;
    }

    // Revoke refresh token from database
    await revokeRefreshToken(refreshToken as string);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred during logout',
    });
  }
}

/**
 * GET /api/auth/me
 * Return authenticated user info from verified JWT payload
 */
export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Unauthorized',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'An error occurred while retrieving user information',
    });
  }
}
