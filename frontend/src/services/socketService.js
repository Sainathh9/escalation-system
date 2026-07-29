import { io } from 'socket.io-client';

// In Docker: VITE_SOCKET_URL="" (empty string) — Socket.IO connects to same origin
// and Nginx proxies /socket.io/ to the backend container.
// In local dev: falls back to the direct backend address.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:5001';
let socket = null;

/**
 * Initialize and connect the Socket.IO client.
 * @param {string} token - The user JWT auth token.
 * @returns {import('socket.io-client').Socket}
 */
export const connectSocket = (token) => {
  if (socket && socket.connected) {
    return socket;
  }

  if (!token) {
    console.warn('[Socket Client] Cannot connect: No token provided');
    return null;
  }

  console.log('[Socket Client] Initializing real-time connection...');

  // Initialize socket instance
  socket = io(SOCKET_URL, {
    auth: { token },
    autoConnect: false,
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  // Register core debug listeners
  socket.on('connect', () => {
    console.log(`⚡ [Socket Client] Connected! Connection ID: ${socket.id}`);
  });

  socket.on('disconnect', (reason) => {
    console.warn(`❌ [Socket Client] Disconnected. Reason: ${reason}`);
  });

  socket.on('connect_error', (error) => {
    console.error('⚠️ [Socket Client] Connection Error:', error.message);
  });

  socket.on('reconnect_attempt', (attempt) => {
    console.log(`🔄 [Socket Client] Reconnection attempt #${attempt}...`);
  });

  socket.on('reconnect', (attempt) => {
    console.log(`⚡ [Socket Client] Reconnected successfully after ${attempt} attempts.`);
    // Broad trigger for pages to know they should re-subscribe to their active state rooms
    const event = new CustomEvent('socket-reconnected');
    window.dispatchEvent(event);
  });

  socket.connect();
  return socket;
};

/**
 * Disconnect and teardown the Socket.IO client.
 */
export const disconnectSocket = () => {
  if (socket) {
    console.log('[Socket Client] Closing real-time connection...');
    socket.disconnect();
    socket = null;
  }
};

/**
 * Get active Socket instance.
 * @returns {import('socket.io-client').Socket | null}
 */
export const getSocket = () => {
  return socket;
};

// ── Room Subscription Helpers ────────────────────────────────────────────────

/**
 * Join ticket room.
 * @param {string|number} ticketId - Target ticket ID.
 */
export const joinTicketRoom = (ticketId) => {
  if (socket && socket.connected) {
    socket.emit('ticket:join', { ticketId: parseInt(ticketId) });
  }
};

/**
 * Leave ticket room.
 * @param {string|number} ticketId - Target ticket ID.
 */
export const leaveTicketRoom = (ticketId) => {
  if (socket && socket.connected) {
    socket.emit('ticket:leave', { ticketId: parseInt(ticketId) });
  }
};
