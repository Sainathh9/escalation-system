import express from 'express';
import { authMiddleWare } from '../middleware/authMiddleware.js';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from '../controllers/notificationController.js';

const router = express.Router();

// All notification routes require authentication
router.use(authMiddleWare);

// GET  /api/notifications              → list notifications (paginated)
router.get('/', getNotifications);

// GET  /api/notifications/unread-count → lightweight badge count
// NOTE: Must be defined BEFORE /:id routes to avoid 'unread-count' being parsed as an id
router.get('/unread-count', getUnreadCount);

// PATCH /api/notifications/read-all    → mark all as read
router.patch('/read-all', markAllAsRead);

// PATCH /api/notifications/:id/read    → mark one as read
router.patch('/:id/read', markAsRead);

// DELETE /api/notifications/:id        → delete one
router.delete('/:id', deleteNotification);

export default router;
