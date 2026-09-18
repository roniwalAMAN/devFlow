/**
 * Notification routes
 */

import { Router, type Router as ExpressRouter } from 'express';
import {
  listNotificationsHandler,
  markNotificationReadHandler,
  markAllNotificationsReadHandler,
} from '../controllers/notification';
import { authenticate } from '../middleware/auth';

const router: ExpressRouter = Router();

// GET /api/notifications (Protected route)
router.get('/', authenticate, listNotificationsHandler);

// PATCH /api/notifications/read-all (Protected route - defined before :notificationId to avoid param conflict)
router.patch('/read-all', authenticate, markAllNotificationsReadHandler);

// PATCH /api/notifications/:notificationId/read (Protected route)
router.patch('/:notificationId/read', authenticate, markNotificationReadHandler);

export default router;
