/**
 * Centralized error handler middleware for Express.
 * Catches errors thrown or passed via next(err) and returns
 * a consistent JSON error response.
 */
const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.originalUrl}:`, err.message);

  // Postgres unique constraint violation
  if (err.code === "23505") {
    return res.status(409).json({
      success: false,
      error: "A record with this information already exists.",
    });
  }

  // Postgres foreign key violation
  if (err.code === "23503") {
    return res.status(400).json({
      success: false,
      error: "Referenced record does not exist.",
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, error: "Invalid token." });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ success: false, error: "Token expired. Please sign in again." });
  }

  // Default server error — never leak stack traces
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === "production"
      ? "Internal server error."
      : err.message || "Internal server error.",
  });
};

export default errorHandler;
