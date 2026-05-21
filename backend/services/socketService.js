import { Server } from 'socket.io';
import { socketAuth } from '../middleware/socketAuth.js';
import pool from '../config/db.js';

let io = null;

/**
 * Initialize Socket.IO server.
 * @param {import('http').Server} server - The HTTP server instance.
 */
export const initSocket = (server) => {
  if (io) {
    console.warn('[Socket Service] Socket.IO has already been initialized!');
    return io;
  }

  // 1️⃣ Initialize Socket.IO server with environment CORS configuration
  io = new Server(server, {
    cors: {
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:5173',
        'http://localhost:5173',
        'http://localhost:5175',
        'http://localhost:5174',
      ],
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // 2️⃣ Attach JWT authentication middleware
  io.use(socketAuth);

  // 3️⃣ Connection event handler
  io.on('connection', (socket) => {
    const { id: userId, role, name } = socket.user;
    
    console.log(`🔌 Client connected: Socket ID = ${socket.id}, User = ${name} (ID: ${userId}, Role: ${role})`);

    // 🔒 Join personal user room (e.g. user:42) for targeted direct dispatches
    socket.join(`user:${userId}`);

    // 🔒 Join role-scoped room (e.g. role:Admin, role:Technician) for wide updates
    socket.join(`role:${role}`);

    /**
     * Client requests to subscribe to updates for a specific ticket.
     * Checks permissions before allowing the client to join the room.
     */
    socket.on('ticket:join', async ({ ticketId }) => {
      try {
        if (!ticketId) return;

        // Fetch ticket ownership to enforce security
        const ticketResult = await pool.query(
          'SELECT created_by, assigned_to FROM tickets WHERE id = $1',
          [ticketId]
        );

        if (ticketResult.rows.length === 0) {
          socket.emit('error', { message: 'Ticket not found' });
          return;
        }

        const ticket = ticketResult.rows[0];
        const isOwner = ticket.created_by === userId;
        const isAssignee = ticket.assigned_to === userId;
        const isAdmin = role === 'Admin';

        // Enforce same access logic as REST endpoints
        if (!isOwner && !isAssignee && !isAdmin) {
          console.warn(`[Socket Room Access Blocked] User ${userId} requested room ticket:${ticketId} without permissions.`);
          socket.emit('error', { message: 'Forbidden: No permission to view ticket updates' });
          return;
        }

        socket.join(`ticket:${ticketId}`);
        console.log(`📥 Socket ${socket.id} (User: ${userId}) joined room: ticket:${ticketId}`);
        socket.emit('ticket:joined', { ticketId });
      } catch (err) {
        console.error(`[Socket Room Error] Error in ticket:join: ${err.message}`);
        socket.emit('error', { message: 'Server error subscribing to ticket' });
      }
    });

    /**
     * Client requests to unsubscribe from updates for a specific ticket.
     */
    socket.on('ticket:leave', ({ ticketId }) => {
      if (!ticketId) return;
      socket.leave(`ticket:${ticketId}`);
      console.log(`📤 Socket ${socket.id} (User: ${userId}) left room: ticket:${ticketId}`);
      socket.emit('ticket:left', { ticketId });
    });

    // 4️⃣ Connection teardown
    socket.on('disconnect', (reason) => {
      console.log(`❌ Client disconnected: Socket ID = ${socket.id}, User = ${name}. Reason = ${reason}`);
    });
  });

  console.log('🚀 Socket.IO Server successfully integrated & listening');
  return io;
};

/**
 * Get active Socket.IO server instance.
 * @returns {import('socket.io').Server}
 */
export const getIO = () => {
  if (!io) {
    throw new Error('[Socket Service] Socket.IO is not initialized! Call initSocket first.');
  }
  return io;
};

// ── Event Emission Helper Functions ──────────────────────────────────────────

/**
 * Emit an event to a specific user (their private room).
 * @param {string|number} userId - Target User ID.
 * @param {string} event - Event name.
 * @param {object} data - Event payload.
 */
export const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

/**
 * Emit an event to a specific role room.
 * @param {string} role - 'Admin', 'Technician', or 'User'.
 * @param {string} event - Event name.
 * @param {object} data - Event payload.
 */
export const emitToRole = (role, event, data) => {
  if (!io) return;
  io.to(`role:${role}`).emit(event, data);
};

/**
 * Emit an event to all users currently viewing a specific ticket.
 * @param {string|number} ticketId - Target Ticket ID.
 * @param {string} event - Event name.
 * @param {object} data - Event payload.
 */
export const emitToTicket = (ticketId, event, data) => {
  if (!io) return;
  io.to(`ticket:${ticketId}`).emit(event, data);
};

/**
 * Emit a global event to all connected sockets.
 * @param {string} event - Event name.
 * @param {object} data - Event payload.
 */
export const emitToAll = (event, data) => {
  if (!io) return;
  io.emit(event, data);
};
