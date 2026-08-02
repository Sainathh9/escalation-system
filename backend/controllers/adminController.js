/**
 * adminController.js
 * ─────────────────────────────────────────────────────────────
 * Admin-only endpoints for operational command center.
 *
 * GET /api/admin/audit-logs           → paginated audit log explorer
 * GET /api/admin/queue-health         → BullMQ queue statistics
 * GET /api/admin/system-health        → DB, Redis, Socket health
 * GET /api/admin/technician-workload  → detailed tech capacity
 * ─────────────────────────────────────────────────────────────
 */

import pool from "../config/db.js";
import slaQueue from "../queues/slaQueue.js";
import connection from "../config/redis.js";
import { getIO } from "../services/socketService.js";

// ─── GET /api/admin/audit-logs ───────────────────────────────
//Fetch audit logs with filtering, searching, sorting, and pagination.
export const getAuditLogs = async (req, res, next) => {
  try {
    const {
      search,
      action,
      performer,
      ticketId,
      page = 1,
      limit = 25,
      from,
      to,
    } = req.query;

    let whereClause = "WHERE 1=1";
    let values = [];
    let index = 1;

    // Filter by action type
    if (action) {
      whereClause += ` AND tl.action = $${index}`;
      values.push(action);
      index++;
    }

    // Filter by performer ID
    if (performer) {
      whereClause += ` AND tl.performed_by = $${index}`;
      values.push(parseInt(performer));
      index++;
    }

    // Filter by ticket ID
    if (ticketId) {
      whereClause += ` AND tl.ticket_id = $${index}`;
      values.push(parseInt(ticketId));
      index++;
    }

    // Search across note, ticket title, performer name
    if (search) {
      whereClause += ` AND (
        tl.note ILIKE $${index}
        OR t.title ILIKE $${index}
        OR u.name ILIKE $${index}
      )`;
      values.push(`%${search}%`);
      index++;
    }

    // Date range filters
    if (from) {
      whereClause += ` AND tl.created_at >= $${index}`;
      values.push(new Date(from));
      index++;
    }
    if (to) {
      whereClause += ` AND tl.created_at <= $${index}`;
      values.push(new Date(to));
      index++;
    }

    // Count total matching
    const countQuery = `
      SELECT COUNT(*)
      FROM ticket_logs tl
      LEFT JOIN tickets t ON tl.ticket_id = t.id
      LEFT JOIN users u ON tl.performed_by = u.id
      ${whereClause}
    `; 
    const countResult = await pool.query(countQuery, values); //returns something like  { rows: [ "count":"3"] , ...}
    const total = parseInt(countResult.rows[0].count);

    // Paginated data
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(parseInt(limit), 100);
    const offset = (pageNum - 1) * limitNum;

    const dataQuery = `
      SELECT tl.*, 
             t.title as ticket_title,
             t.severity as ticket_severity,
             t.status as ticket_status,
             u.name as performer_name,
             u.email as performer_email,
             u.role as performer_role
      FROM ticket_logs tl
      LEFT JOIN tickets t ON tl.ticket_id = t.id
      LEFT JOIN users u ON tl.performed_by = u.id
      ${whereClause}
      ORDER BY tl.created_at DESC
      LIMIT $${index} OFFSET $${index + 1}
    `; //this executes whenever you click on next in list of pages

    const dataResult = await pool.query(dataQuery, [
      ...values,
      limitNum,
      offset,
    ]);

    // Get distinct action types for filter dropdown
    const actionTypes = await pool.query(
      "SELECT DISTINCT action FROM ticket_logs ORDER BY action ASC"
    );

    res.status(200).json({
      success: true,
      data: dataResult.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      filters: {
        actions: actionTypes.rows.map((r) => r.action),
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/queue-health ─────────────────────────────
export const getQueueHealth = async (req, res, next) => {
  try {
    // Get job counts from BullMQ
    const jobCounts = await slaQueue.getJobCounts(
      "waiting",
      "active",
      "completed",
      "failed",
      "delayed"
    );

    // Get recent failed jobs for diagnostics
    const failedJobs = await slaQueue.getFailed(0, 4);
    const recentFailed = failedJobs.map((job) => ({
      id: job.id,
      ticketId: job.data?.ticketId,
      failedReason: job.failedReason,
      timestamp: job.finishedOn,
      attemptsMade: job.attemptsMade,
    }));

    // Get recent delayed jobs
    const delayedJobs = await slaQueue.getDelayed(0, 9);
    const pendingEscalations = delayedJobs.map((job) => ({
      id: job.id,
      ticketId: job.data?.ticketId,
      processAt: job.timestamp + (job.opts?.delay || 0),
      delay: job.opts?.delay,
    }));

    res.status(200).json({
      success: true,
      data: {
        counts: jobCounts,
        recent_failed: recentFailed,
        pending_escalations: pendingEscalations,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/system-health ────────────────────────────
export const getSystemHealth = async (req, res, next) => {
  try {
    // PostgreSQL pool stats
    const dbHealth = {
      totalConnections: pool.totalCount,
      idleConnections: pool.idleCount,
      waitingRequests: pool.waitingCount,
      status: "healthy",
    };

    // Quick DB query test
    try {
      const start = Date.now();
      await pool.query("SELECT 1");
      dbHealth.latencyMs = Date.now() - start;
    } catch {
      dbHealth.status = "degraded";
      dbHealth.latencyMs = -1;
    }

    // Redis health
    let redisHealth = { status: "unknown" };
    try {
      const start = Date.now();
      const pong = await connection.ping();
      const latency = Date.now() - start;
      const info = await connection.info("memory");
      const usedMemory = info.match(/used_memory_human:(\S+)/)?.[1] || "N/A";

      const clientInfo = await connection.info("clients");
      const connectedClients =
        clientInfo.match(/connected_clients:(\d+)/)?.[1] || "N/A";

      redisHealth = {
        status: pong === "PONG" ? "healthy" : "degraded",
        latencyMs: latency,
        usedMemory,
        connectedClients,
      };
    } catch {
      redisHealth = { status: "down", latencyMs: -1 };
    }

    // Socket.IO health
    let socketHealth = { status: "unknown" };
    try {
      const io = getIO();
      const connectedCount = io.sockets.sockets.size;
      socketHealth = {
        status: "healthy",
        connectedClients: connectedCount,
      };
    } catch {
      socketHealth = { status: "not_initialized", connectedClients: 0 };
    }

    res.status(200).json({
      success: true,
      data: {
        database: dbHealth,
        redis: redisHealth,
        socketio: socketHealth,
        uptime: process.uptime(),
        memoryUsage: {
          rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
          heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─── GET /api/admin/technician-workload ──────────────────────
export const getTechnicianWorkload = async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COUNT(t.id) FILTER (WHERE t.status NOT IN ('Resolved', 'Closed')) as open_tickets,
        COUNT(t.id) FILTER (WHERE t.status IN ('In Progress', 'In-Progress')) as in_progress,
        COUNT(t.id) FILTER (WHERE t.status = 'Open') as pending,
        COUNT(t.id) FILTER (WHERE t.status = 'Resolved' AND t.updated_at >= NOW() - INTERVAL '24 hours') as resolved_today,
        COUNT(t.id) as total_assigned,
        COALESCE(
          ROUND(
            AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at)) / 3600) 
            FILTER (WHERE t.status IN ('Resolved', 'Closed'))
          ::numeric, 1),
          0
        ) as avg_resolution_hours,
        COUNT(t.id) FILTER (WHERE t.sla_deadline < NOW() AND t.status NOT IN ('Resolved', 'Closed')) as sla_breached
      FROM users u
      LEFT JOIN tickets t ON t.assigned_to = u.id
      WHERE u.role = 'Technician'
      GROUP BY u.id, u.name, u.email
      ORDER BY open_tickets DESC
    `); //COALESCE MEANING: "Calculate the average resolution time (in hours) for resolved or closed tickets, round it to one decimal place, and if there are no resolved tickets, return 0."

    // Check online status via Socket.IO rooms
    let onlineUserIds = new Set();
    try {
      const io = getIO();
      const sockets = await io.fetchSockets();
      sockets.forEach((s) => {
        if (s.user?.id) onlineUserIds.add(s.user.id);
      });
    } catch {
      // Socket not initialized — all offline
    }

    const technicians = result.rows.map((tech) => ({
      ...tech,
      open_tickets: parseInt(tech.open_tickets),
      in_progress: parseInt(tech.in_progress),
      pending: parseInt(tech.pending),
      resolved_today: parseInt(tech.resolved_today),
      total_assigned: parseInt(tech.total_assigned),
      avg_resolution_hours: parseFloat(tech.avg_resolution_hours),
      sla_breached: parseInt(tech.sla_breached),
      is_online: onlineUserIds.has(tech.id),
    }));
    // Why use ...tech and then redefine some fields?
// - ...tech copies ALL properties from the current result row (tech).
// - If a property is written again later (e.g. open_tickets), it OVERRIDES the copied value.
// - This does NOT create duplicate keys; JavaScript objects can't have duplicate property names.
// - We override PostgreSQL string values ("5") with numbers (5) using parseInt/parseFloat,
//   and add new computed fields like is_online.

    res.status(200).json({
      success: true,
      data: technicians,
    });
  } catch (err) {
    next(err);
  }
};
