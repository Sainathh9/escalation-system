/**
 * notificationApi.js
 * ─────────────────────────────────────────────────────────────
 * Typed API helpers for the notifications resource.
 * Mirrors the pattern in api.js (apiFetch wrapper).
 * ─────────────────────────────────────────────────────────────
 */

import { apiFetch } from './api.js';

/** Fetch paginated notifications for the current user */
export const fetchNotifications = (limit = 30, offset = 0) =>
  apiFetch(`/notifications?limit=${limit}&offset=${offset}`);

/** Fetch only the unread count (lightweight, for polling) */
export const fetchUnreadCount = () =>
  apiFetch('/notifications/unread-count');

/** Mark a single notification as read */
export const markNotificationRead = (id) =>
  apiFetch(`/notifications/${id}/read`, { method: 'PATCH' });

/** Mark all notifications as read */
export const markAllNotificationsRead = () =>
  apiFetch('/notifications/read-all', { method: 'PATCH' });

/** Delete a single notification */
export const deleteNotification = (id) =>
  apiFetch(`/notifications/${id}`, { method: 'DELETE' });
