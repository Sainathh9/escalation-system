/**
 * notificationController.js
 * ─────────────────────────────────────────────────────────────
 * REST API handlers for the notifications resource.
 *
 * GET    /api/notifications           → fetch all for current user
 * GET    /api/notifications/unread-count → unread badge count
 * PATCH  /api/notifications/:id/read  → mark one as read
 * PATCH  /api/notifications/read-all  → mark all as read
 * DELETE /api/notifications/:id       → delete a notification
 * ─────────────────────────────────────────────────────────────
 */

import pool from '../config/db.js';

// ─── GET /api/notifications ───────────────────────────────────
// Returns all notifications for the authenticated user, newest first.
// Supports ?limit and ?offset for pagination.
export const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit  = Math.min(parseInt(req.query.limit  || '30'), 100);
    const offset = parseInt(req.query.offset || '0');

    const result = await pool.query(
      `SELECT n.*, t.title as ticket_title
       FROM notifications n
       LEFT JOIN tickets t ON n.ticket_id = t.id
       WHERE n.user_id = $1
       ORDER BY n.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: result.rows,
      pagination: {
        total: parseInt(countResult.rows[0].count),
        limit,
        offset,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/notifications/unread-count ──────────────────────
// Lightweight endpoint for the notification bell badge.
export const getUnreadCount = async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false`,
      [req.user.id]
    );
    return res.status(200).json({
      success: true,
      data: { count: parseInt(result.rows[0].count) },
    });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/notifications/:id/read ───────────────────────
// Mark a single notification as read (owner-only).
export const markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await pool.query(
      `SELECT * FROM notifications WHERE id = $1`,
      [id]
    );

    if (notification.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    if (notification.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const updated = await pool.query(
      `UPDATE notifications SET is_read = true WHERE id = $1 RETURNING *`,
      [id]
    );

    return res.status(200).json({ success: true, data: updated.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─── PATCH /api/notifications/read-all ───────────────────────
// Mark ALL notifications for the current user as read.
export const markAllAsRead = async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE notifications SET is_read = true WHERE user_id = $1`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
};

// ─── DELETE /api/notifications/:id ───────────────────────────
// Delete a single notification (owner-only).
export const deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const notification = await pool.query(
      `SELECT * FROM notifications WHERE id = $1`,
      [id]
    );

    if (notification.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }

    if (notification.rows[0].user_id !== userId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await pool.query(`DELETE FROM notifications WHERE id = $1`, [id]);

    return res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    next(err);
  }
};
