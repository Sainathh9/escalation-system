/**
 * useNotifications.js
 * ─────────────────────────────────────────────────────────────
 * Custom hook that:
 *   1. Polls the unread-count endpoint every 30 seconds
 *   2. Fetches the full notification list on demand (bell click)
 *   3. Exposes mark-read and mark-all-read actions
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchNotifications,
  fetchUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from '../api/notificationApi.js';
import { useAuth } from '../context/AuthContext.jsx';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export const useNotifications = () => {
  const { isAuthenticated } = useAuth();

  const [notifications, setNotifications]   = useState([]);
  const [unreadCount, setUnreadCount]       = useState(0);
  const [isOpen, setIsOpen]                 = useState(false);
  const [loading, setLoading]               = useState(false);
  const [hasLoaded, setHasLoaded]           = useState(false); // prevent flash on first open

  const intervalRef = useRef(null);

  // ── Poll unread count ────────────────────────────────────────
  const pollUnreadCount = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await fetchUnreadCount();
      if (res && typeof res.count === 'number') {
        setUnreadCount(res.count);
      }
    } catch {
      // silent fail — network hiccup shouldn't crash the UI
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    pollUnreadCount();
    intervalRef.current = setInterval(pollUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [isAuthenticated, pollUnreadCount]);

  // ── Load full list when panel opens ─────────────────────────
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchNotifications(30, 0);
      // apiFetch auto-unwraps { success, data } → checks pagination branch
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
      setNotifications(list);
      setHasLoaded(true);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const openPanel = useCallback(() => {
    setIsOpen(true);
    loadNotifications();
  }, [loadNotifications]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
  }, []);

  const togglePanel = useCallback(() => {
    if (isOpen) closePanel();
    else openPanel();
  }, [isOpen, openPanel, closePanel]);

  // ── Actions ─────────────────────────────────────────────────

  const handleMarkRead = useCallback(async (id) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));
  }, []);

  const handleMarkAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, []);

  const handleDelete = useCallback(async (id) => {
    const target = notifications.find((n) => n.id === id);
    await deleteNotification(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (target && !target.is_read) {
      setUnreadCount((prev) => Math.max(0, prev - 1));
    }
  }, [notifications]);

  return {
    notifications,
    unreadCount,
    isOpen,
    loading,
    hasLoaded,
    togglePanel,
    closePanel,
    handleMarkRead,
    handleMarkAllRead,
    handleDelete,
  };
};
