import jwt from 'jsonwebtoken';

/**
 * Socket.IO authentication middleware.
 * Verifies JWT token from handshake and attaches user details to socket.user.
 */
export const socketAuth = (socket, next) => {
  try {
    // 🔐 Extract token from handshake auth or query params (auth is standard & preferred)
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;

    if (!token) {
      console.warn(`[Socket Auth Warning] Connection rejected: No token provided. (ID: ${socket.id})`);
      return next(new Error('Authentication error: No token provided'));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach decoded user claims (id, role, email, name) to socket instance
    socket.user = decoded;
    
    console.log(`[Socket Auth] Authorized connection for ${socket.user.name} (Role: ${socket.user.role}, ID: ${socket.user.id})`);
    next();
  } catch (err) {
    console.error(`[Socket Auth Error] Connection rejected for socket ${socket.id}: ${err.message}`);
    
    // Pass standard Socket.IO connect_error to client
    const error = new Error('Authentication error: Invalid or expired token');
    error.data = { code: 'UNAUTHORIZED', message: err.message };
    next(error);
  }
};

