/**
 * Authentication controller
 * Handles registration endpoint
 */

import type { Request, Response } from 'express';
import {
  validateRegistrationInput,
  validateLoginInput,
} from '../utils/validation';
import {
  createUser,
  findUserByEmail,
  comparePassword,
  formatUserResponse,
} from '../services/user';
import { generateToken } from '../utils/jwt';

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
 * Authenticate user and return JWT token with safe user information
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

    // Generate JWT token with minimum required user information
    const token = generateToken({
      userId: user.id,
      email: user.email,
    });

    // Return safe user info (never passwordHash) and JWT token
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
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
