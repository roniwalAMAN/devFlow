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

/**
 * Validate create organization request
 */
export function validateCreateOrganizationInput(data: {
  name?: unknown;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate name
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Organization name is required and must be a non-empty string',
    });
  } else if (data.name.trim().length > 100) {
    errors.push({
      field: 'name',
      message: 'Organization name must not exceed 100 characters',
    });
  }

  return errors;
}

/**
 * Validate add organization member request
 */
export function validateAddMemberInput(data: {
  email?: unknown;
  role?: unknown;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate email
  if (!data.email || typeof data.email !== 'string' || data.email.trim() === '') {
    errors.push({
      field: 'email',
      message: 'Email is required and must be a non-empty string',
    });
  } else if (!isValidEmail(data.email.trim())) {
    errors.push({
      field: 'email',
      message: 'Email must be a valid email address',
    });
  }

  // Validate role
  const validRoles = ['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'];
  if (!data.role || typeof data.role !== 'string' || data.role.trim() === '') {
    errors.push({
      field: 'role',
      message: 'Role is required',
    });
  } else if (!validRoles.includes(data.role.trim().toUpperCase())) {
    errors.push({
      field: 'role',
      message: `Role must be one of: ${validRoles.join(', ')}`,
    });
  }

  return errors;
}

/**
 * Validate update member role request
 */
export function validateUpdateMemberRoleInput(data: {
  role?: unknown;
}): ValidationError[] {
  const errors: ValidationError[] = [];
  const validRoles = ['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'];

  if (!data.role || typeof data.role !== 'string' || data.role.trim() === '') {
    errors.push({
      field: 'role',
      message: 'Role is required and must be a non-empty string',
    });
  } else if (!validRoles.includes(data.role.trim().toUpperCase())) {
    errors.push({
      field: 'role',
      message: `Role must be one of: ${validRoles.join(', ')}`,
    });
  }

  return errors;
}

/**
 * Validate create organization invite request
 */
export function validateCreateInviteInput(data: {
  email?: unknown;
  role?: unknown;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate email
  if (!data.email || typeof data.email !== 'string' || data.email.trim() === '') {
    errors.push({
      field: 'email',
      message: 'Email is required and must be a non-empty string',
    });
  } else if (!isValidEmail(data.email.trim())) {
    errors.push({
      field: 'email',
      message: 'Email must be a valid email address',
    });
  }

  // Validate role
  const validRoles = ['OWNER', 'ADMIN', 'DEVELOPER', 'VIEWER'];
  if (!data.role || typeof data.role !== 'string' || data.role.trim() === '') {
    errors.push({
      field: 'role',
      message: 'Role is required',
    });
  } else if (!validRoles.includes(data.role.trim().toUpperCase())) {
    errors.push({
      field: 'role',
      message: `Role must be one of: ${validRoles.join(', ')}`,
    });
  }

  return errors;
}

/**
 * Validate create project request
 */
export function validateCreateProjectInput(data: {
  name?: unknown;
  description?: unknown;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate name
  if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
    errors.push({
      field: 'name',
      message: 'Project name is required and must be a non-empty string',
    });
  } else if (data.name.trim().length > 100) {
    errors.push({
      field: 'name',
      message: 'Project name must not exceed 100 characters',
    });
  }

  // Validate description (optional)
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Description must be a string if provided',
      });
    }
  }

  return errors;
}

/**
 * Validate update project request
 */
export function validateUpdateProjectInput(data: {
  name?: unknown;
  description?: unknown;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check if at least one field is provided
  if (data.name === undefined && data.description === undefined) {
    errors.push({
      field: 'body',
      message: 'At least one of name or description must be provided',
    });
    return errors;
  }

  // Validate name if provided
  if (data.name !== undefined) {
    if (typeof data.name !== 'string' || data.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Project name must be a non-empty string',
      });
    } else if (data.name.trim().length > 100) {
      errors.push({
        field: 'name',
        message: 'Project name must not exceed 100 characters',
      });
    }
  }

  // Validate description if provided (can be string or null)
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Description must be a string or null',
      });
    }
  }

  return errors;
}

/**
 * Valid Task status and priority constants
 */
export const VALID_TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'] as const;
export const VALID_TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'] as const;

/**
 * Validate create task request
 */
export function validateCreateTaskInput(data: {
  title?: unknown;
  description?: unknown;
  status?: unknown;
  priority?: unknown;
  assigneeId?: unknown;
  dueDate?: unknown;
}): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate title
  if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
    errors.push({
      field: 'title',
      message: 'Task title is required and must be a non-empty string',
    });
  } else if (data.title.trim().length > 200) {
    errors.push({
      field: 'title',
      message: 'Task title must not exceed 200 characters',
    });
  }

  // Validate description (optional)
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Description must be a string if provided',
      });
    }
  }

  // Validate status (optional)
  if (data.status !== undefined && data.status !== null) {
    if (
      typeof data.status !== 'string' ||
      !VALID_TASK_STATUSES.includes(data.status as (typeof VALID_TASK_STATUSES)[number])
    ) {
      errors.push({
        field: 'status',
        message: `Status must be one of: ${VALID_TASK_STATUSES.join(', ')}`,
      });
    }
  }

  // Validate priority (optional)
  if (data.priority !== undefined && data.priority !== null) {
    if (
      typeof data.priority !== 'string' ||
      !VALID_TASK_PRIORITIES.includes(data.priority as (typeof VALID_TASK_PRIORITIES)[number])
    ) {
      errors.push({
        field: 'priority',
        message: `Priority must be one of: ${VALID_TASK_PRIORITIES.join(', ')}`,
      });
    }
  }

  // Validate assigneeId (optional)
  if (data.assigneeId !== undefined && data.assigneeId !== null) {
    if (typeof data.assigneeId !== 'string' || data.assigneeId.trim() === '') {
      errors.push({
        field: 'assigneeId',
        message: 'Assignee ID must be a non-empty string if provided',
      });
    }
  }

  // Validate dueDate (optional)
  if (data.dueDate !== undefined && data.dueDate !== null) {
    if (typeof data.dueDate !== 'string' && !(data.dueDate instanceof Date)) {
      errors.push({
        field: 'dueDate',
        message: 'Due date must be a valid ISO date string if provided',
      });
    } else {
      const parsedDate = new Date(data.dueDate as string | Date);
      if (isNaN(parsedDate.getTime())) {
        errors.push({
          field: 'dueDate',
          message: 'Due date must be a valid ISO date string if provided',
        });
      }
    }
  }

  return errors;
}

/**
 * Allowed fields for task update
 */
export const ALLOWED_TASK_UPDATE_FIELDS = [
  'title',
  'description',
  'status',
  'priority',
  'assigneeId',
  'dueDate',
];

/**
 * Validate update task request
 */
export function validateUpdateTaskInput(
  data: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for unknown fields
  const keys = Object.keys(data);
  for (const key of keys) {
    if (!ALLOWED_TASK_UPDATE_FIELDS.includes(key)) {
      errors.push({
        field: key,
        message: `Field '${key}' is not allowed in update payload`,
      });
    }
  }

  // Check if at least one allowed field is provided
  const hasAllowedField = keys.some((key) =>
    ALLOWED_TASK_UPDATE_FIELDS.includes(key)
  );
  if (!hasAllowedField) {
    errors.push({
      field: 'body',
      message: 'At least one field must be provided for update',
    });
    return errors;
  }

  // Validate title if provided
  if (data.title !== undefined) {
    if (typeof data.title !== 'string' || data.title.trim() === '') {
      errors.push({
        field: 'title',
        message: 'Task title must be a non-empty string',
      });
    } else if (data.title.trim().length > 200) {
      errors.push({
        field: 'title',
        message: 'Task title must not exceed 200 characters',
      });
    }
  }

  // Validate description if provided (can be string or null)
  if (data.description !== undefined && data.description !== null) {
    if (typeof data.description !== 'string') {
      errors.push({
        field: 'description',
        message: 'Description must be a string or null',
      });
    }
  }

  // Validate status if provided
  if (data.status !== undefined) {
    if (
      typeof data.status !== 'string' ||
      !VALID_TASK_STATUSES.includes(
        data.status as (typeof VALID_TASK_STATUSES)[number]
      )
    ) {
      errors.push({
        field: 'status',
        message: `Status must be one of: ${VALID_TASK_STATUSES.join(', ')}`,
      });
    }
  }

  // Validate priority if provided
  if (data.priority !== undefined) {
    if (
      typeof data.priority !== 'string' ||
      !VALID_TASK_PRIORITIES.includes(
        data.priority as (typeof VALID_TASK_PRIORITIES)[number]
      )
    ) {
      errors.push({
        field: 'priority',
        message: `Priority must be one of: ${VALID_TASK_PRIORITIES.join(', ')}`,
      });
    }
  }

  // Validate assigneeId if provided (can be non-empty string or null)
  if (data.assigneeId !== undefined && data.assigneeId !== null) {
    if (typeof data.assigneeId !== 'string' || data.assigneeId.trim() === '') {
      errors.push({
        field: 'assigneeId',
        message: 'Assignee ID must be a non-empty string or null',
      });
    }
  }

  // Validate dueDate if provided (can be ISO date string or null)
  if (data.dueDate !== undefined && data.dueDate !== null) {
    if (typeof data.dueDate !== 'string' && !(data.dueDate instanceof Date)) {
      errors.push({
        field: 'dueDate',
        message: 'Due date must be a valid ISO date string or null',
      });
    } else {
      const parsedDate = new Date(data.dueDate as string | Date);
      if (isNaN(parsedDate.getTime())) {
        errors.push({
          field: 'dueDate',
          message: 'Due date must be a valid ISO date string or null',
        });
      }
    }
  }

  return errors;
}

/**
 * Allowed fields for moving/reordering a task
 */
export const ALLOWED_TASK_MOVE_FIELDS = ['status', 'position'];

/**
 * Validate move/reorder task request
 */
export function validateMoveTaskInput(
  data: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for unknown fields
  const keys = Object.keys(data);
  for (const key of keys) {
    if (!ALLOWED_TASK_MOVE_FIELDS.includes(key)) {
      errors.push({
        field: key,
        message: `Field '${key}' is not allowed in move payload`,
      });
    }
  }

  // Validate status (required)
  if (
    !data.status ||
    typeof data.status !== 'string' ||
    !VALID_TASK_STATUSES.includes(
      data.status as (typeof VALID_TASK_STATUSES)[number]
    )
  ) {
    errors.push({
      field: 'status',
      message: `Status is required and must be one of: ${VALID_TASK_STATUSES.join(', ')}`,
    });
  }

  // Validate position (required integer >= 0)
  if (
    data.position === undefined ||
    data.position === null ||
    typeof data.position !== 'number' ||
    !Number.isInteger(data.position) ||
    data.position < 0
  ) {
    errors.push({
      field: 'position',
      message:
        'Position is required and must be an integer greater than or equal to 0',
    });
  }

  return errors;
}

/**
 * Allowed fields for creating a comment
 */
export const ALLOWED_COMMENT_CREATE_FIELDS = ['content'];

/**
 * Validate create comment request
 */
export function validateCreateCommentInput(
  data: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for unknown fields
  const keys = Object.keys(data);
  for (const key of keys) {
    if (!ALLOWED_COMMENT_CREATE_FIELDS.includes(key)) {
      errors.push({
        field: key,
        message: `Field '${key}' is not allowed in create comment payload`,
      });
    }
  }

  // Validate content (required, non-empty, max 5000 chars)
  if (
    !data.content ||
    typeof data.content !== 'string' ||
    data.content.trim() === ''
  ) {
    errors.push({
      field: 'content',
      message: 'Comment content is required and must be a non-empty string',
    });
  } else if (data.content.trim().length > 5000) {
    errors.push({
      field: 'content',
      message: 'Comment content must not exceed 5000 characters',
    });
  }

  return errors;
}

/**
 * Allowed fields for updating a comment
 */
export const ALLOWED_COMMENT_UPDATE_FIELDS = ['content'];

/**
 * Validate update comment request
 */
export function validateUpdateCommentInput(
  data: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for unknown fields
  const keys = Object.keys(data);
  for (const key of keys) {
    if (!ALLOWED_COMMENT_UPDATE_FIELDS.includes(key)) {
      errors.push({
        field: key,
        message: `Field '${key}' is not allowed in update comment payload`,
      });
    }
  }

  // Validate content (required, non-empty, max 5000 chars)
  if (
    !data.content ||
    typeof data.content !== 'string' ||
    data.content.trim() === ''
  ) {
    errors.push({
      field: 'content',
      message: 'Comment content is required and must be a non-empty string',
    });
  } else if (data.content.trim().length > 5000) {
    errors.push({
      field: 'content',
      message: 'Comment content must not exceed 5000 characters',
    });
  }

  return errors;
}

/**
 * Allowed fields for sending a chat message
 */
export const ALLOWED_CHAT_MESSAGE_FIELDS = ['content'];

/**
 * Validate send chat message request
 */
export function validateSendChatMessageInput(
  data: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for unknown fields
  const keys = Object.keys(data);
  for (const key of keys) {
    if (!ALLOWED_CHAT_MESSAGE_FIELDS.includes(key)) {
      errors.push({
        field: key,
        message: `Field '${key}' is not allowed in chat message payload`,
      });
    }
  }

  // Validate content (required, non-empty, max 5000 chars)
  if (
    !data.content ||
    typeof data.content !== 'string' ||
    data.content.trim() === ''
  ) {
    errors.push({
      field: 'content',
      message: 'Chat message content is required and must be a non-empty string',
    });
  } else if (data.content.trim().length > 5000) {
    errors.push({
      field: 'content',
      message: 'Chat message content must not exceed 5000 characters',
    });
  }

  return errors;
}











