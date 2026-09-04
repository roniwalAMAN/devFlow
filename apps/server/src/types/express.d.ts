/**
 * Express Request augmentation for authenticated user
 */

import type { JwtUserPayload } from '../utils/jwt';

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export {};
