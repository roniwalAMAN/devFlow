/**
 * Validation utilities for request data
 */

export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password minimum requirements
 */
export function isValidPassword(password: string): boolean {
  return password.length >= 8;
}

/**
 * Validate registration request
 */
export function validateRegistrationInput(data: {
  name?: unknown;
  email?: unknown;
  password?: unknown;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate name
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Name is required and must be a non-empty string',
    });
  }

  // Validate email
  if (!data.email || typeof data.email !== 'string' || data.email.trim() === '') {
    errors.push({
      field: 'email',
      message: 'Email is required',
    });
  } else if (!isValidEmail(data.email)) {
    errors.push({
      field: 'email',
      message: 'Email must be a valid email address',
    });
  }

  // Validate password
  if (!data.password || typeof data.password !== 'string') {
    errors.push({
      field: 'password',
      message: 'Password is required',
    });
  } else if (!isValidPassword(data.password)) {
    errors.push({
      field: 'password',
      message: 'Password must be at least 8 characters long',
    });
  }

  return errors;
}

/**
 * Validate login request
 */
export function validateLoginInput(data: {
  email?: unknown;
  password?: unknown;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate email
  if (!data.email || typeof data.email !== 'string' || data.email.trim() === '') {
    errors.push({
      field: 'email',
      message: 'Email is required',
    });
  } else if (!isValidEmail(data.email)) {
    errors.push({
      field: 'email',
      message: 'Email must be a valid email address',
    });
  }

  // Validate password
  if (!data.password || typeof data.password !== 'string' || data.password === '') {
    errors.push({
      field: 'password',
      message: 'Password is required',
    });
  }

  return errors;
}

/**
 * Validate refresh token request
 */
export function validateRefreshTokenInput(data: {
  refreshToken?: unknown;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate refreshToken
  if (!data.refreshToken || typeof data.refreshToken !== 'string' || data.refreshToken.trim() === '') {
    errors.push({
      field: 'refreshToken',
      message: 'Refresh token is required',
    });
  }

  return errors;
}

