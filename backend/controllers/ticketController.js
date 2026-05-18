import pool from "../config/db.js";
import calculateSLA from "../utils/slaCalculator.js";
import {
  notifyTicketCreated,
  notifyTicketAssigned,
  notifyTicketResolved,
  notifyNewComment,
} from "../services/notificationService.js";

export const createTicket = async (req, res, next) => {
  try {
    const { title, description, severity, category, priority } = req.body;

    // 🔒 Strict Input Validation
    const errors = [];

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      errors.push("Title is required and must be a non-empty string");
    }

    const allowedSeverities = ["Low", "Medium", "High", "Critical"];
    if (!allowedSeverities.includes(severity)) {
      errors.push(`Severity must be one of: ${allowedSeverities.join(", ")}`);
    }

    if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
      errors.push("Priority must be an integer between 1 and 5");
    }

    if (!category || typeof category !== "string" || category.trim().length === 0) {
      errors.push("Category is required and must be a non-empty string");
    }

    if (errors.length > 0) {
      return res.status(400).json({ error: "Validation Failed", details: errors });
    }

    const slaDeadline = new Date(Date.now() + 4 * 60 * 60 * 1000); // Default placeholder

    const newTicket = await pool.query(
      `INSERT INTO tickets
      (title, description, severity, category, priority,created_by, sla_deadline)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        title.trim(),
        description ? description.trim() : "",
        severity,
        category.trim(),
        priority,
        req.user.id,
        calculateSLA(severity, 0),
      ],
    );
    const createdTicket = newTicket.rows[0];

    await pool.query(
      "INSERT INTO ticket_logs (ticket_id, action, performed_by, note) VALUES ($1, $2, $3, $4)",
      [createdTicket.id, "CREATED", req.user.id, "Ticket created"],
    );

    // 🔔 Notify all admins of new ticket
    notifyTicketCreated(createdTicket, req.user.name || 'A user').catch(() => {});

    res.status(201).json({ success: true, data: createdTicket });
  } catch (err) {
    next(err);
  }
};

export const getAllTickets = async (req, res, next) => {
  try {
    const {
      status, severity, priority, search, sort, order, page = 1, limit = 10,
    } = req.query;

    let whereClause = "WHERE 1=1";
    let values = [];
    let index = 1;

    // 🔐 Role-based filtering
    if (req.user.role === "User") {
      whereClause += ` AND t.created_by = $${index}`;
      values.push(req.user.id);
      index++;
    } else if (req.user.role === "Technician") {
      whereClause += ` AND t.assigned_to = $${index}`;
      values.push(req.user.id);
      index++;
    }

    // 🔍 Filters
    if (status) {
      whereClause += ` AND t.status = $${index}`;
      values.push(status);
      index++;
    }

    if (severity) {
      whereClause += ` AND t.severity = $${index}`;
      values.push(severity);
      index++;
    }

    if (priority) {
      whereClause += ` AND t.priority = $${index}`;
      values.push(priority);
      index++;
    }

    // 🔎 Search
    if (search) {
      whereClause += ` AND (t.title ILIKE $${index} OR t.description ILIKE $${index})`;
      values.push(`%${search}%`);
      index++;
    }

    const countQuery = `SELECT COUNT(*) FROM tickets t ${whereClause}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    const allowedSortFields = ["created_at", "priority", "severity", "status"];
    const sortField = allowedSortFields.includes(sort) ? sort : "created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    // SLA Computation Native
    const dataQuery = `
      SELECT t.*, 
             assignee.name as assigned_to_name,
             creator.name as created_by_name,
             (CASE WHEN t.sla_deadline < NOW() AND t.status NOT IN ('Resolved', 'Closed') THEN true ELSE false END) as is_overdue
      FROM tickets t
      LEFT JOIN users assignee ON t.assigned_to = assignee.id
      LEFT JOIN users creator ON t.created_by = creator.id
      ${whereClause}
      ORDER BY t.${sortField} ${sortOrder}
      LIMIT $${index} OFFSET $${index + 1}
    `;

    const dataResult = await pool.query(dataQuery, [...values, limitNum, offset]);

    res.status(200).json({
      success: true,
      data: dataResult.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

export const getTicketById = async (req, res, next) => {
  try {
    const ticket = await pool.query(
      `SELECT t.*,
              assignee.name as assigned_to_name,
              assignee.email as assigned_to_email,
              creator.name as created_by_name,
              creator.email as created_by_email,
              (CASE WHEN t.sla_deadline < NOW() AND t.status NOT IN ('Resolved', 'Closed') THEN true ELSE false END) as is_overdue
       FROM tickets t
       LEFT JOIN users assignee ON t.assigned_to = assignee.id
       LEFT JOIN users creator ON t.created_by = creator.id
       WHERE t.id = $1`,
      [req.params.id]
    );

    if (ticket.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Ticket not found" });
    }

    const obtainedTicket = ticket.rows[0];
    const isOwner = req.user.id === obtainedTicket.created_by;
    const isAssignee = req.user.id === obtainedTicket.assigned_to;
    const isAdmin = req.user.role === "Admin";

    if (!isOwner && !isAssignee && !isAdmin) {
      return res.status(403).json({ success: false, error: "You dont have the permission to view this ticket" });
    }

    res.status(200).json({
      success: true,
      data: obtainedTicket
    });
  } catch (err) {
    next(err);
  }
};

export const updateTicket = async (req, res, next) => {
  try {
    const { status } = req.body;

    // 1️⃣ Validate status presence
    if (!status) {
      return res.status(400).json({ success: false, error: "Status is required" });
    }

    // 2️⃣ Validate allowed statuses
    const allowedStatuses = ["Open", "In-Progress", "Resolved", "Closed"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status value" });
    }

    // 3️⃣ Fetch ticket
    const ticketQuery = await pool.query(
      "SELECT * FROM tickets WHERE id = $1",
      [req.params.id],
    );

    if (ticketQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Ticket not found" });
    }

    const ticket = ticketQuery.rows[0];

    // 4️⃣ Ownership + Role Check
    const isAssigned = req.user.id === ticket.assigned_to;
    const isAdmin = req.user.role === "Admin";

    if (!isAssigned && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "You are not allowed to update this ticket",
      });
    }

    // 5️⃣ Prevent redundant updates
    if (ticket.status === status) {
      return res.status(400).json({
        success: false,
        error: "Ticket already has this status",
      });
    }

    // 6️⃣ Enforce valid status transitions
    const validTransitions = {
      Open: ["In-Progress"],
      "In-Progress": ["Resolved"],
      Resolved: ["Closed"],
      Closed: [],
    };

    if (!validTransitions[ticket.status].includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Cannot change status from ${ticket.status} to ${status}`,
      });
    }

    // 7️⃣ Perform update
    const update = await pool.query(
      `UPDATE tickets 
       SET status = $1, updated_at = NOW() 
       WHERE id = $2 
       RETURNING *`,
      [status, req.params.id],
    );

    const updatedTicket = update.rows[0];

    // 8️⃣ Log action
    await pool.query(
      `INSERT INTO ticket_logs 
       (ticket_id, action, performed_by, note) 
       VALUES ($1, $2, $3, $4)`,
      [
        updatedTicket.id,
        "STATUS_UPDATED",
        req.user.id,
        `Status changed from ${ticket.status} to ${status}`,
      ],
    );

    // 🔔 Notify ticket creator when resolved or closed
    if (status === 'Resolved' || status === 'Closed') {
      notifyTicketResolved(ticket, status).catch(() => {});
    }

    res.status(200).json({ success: true, data: updatedTicket });
  } catch (err) {
    next(err);
  }
};

export const assignTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;

    if (req.user.role !== "Admin") {
      return res.status(403).json({ success: false, error: "Only Admins can re-assign tickets" });
    }

    const userQuery = await pool.query("SELECT * from users WHERE id=$1", [
      assigned_to,
    ]);

    if (userQuery.rows.length === 0) {
      return res.status(400).json({ success: false, error: "Target ID doesn't exist" });
    }

    const user = userQuery.rows[0];
    const isTechnician = user.role === "Technician";
    if (!isTechnician) {
      return res
        .status(400)
        .json({ success: false, error: "Assigned user must have Technician role" });
    }

    const ticketQuery = await pool.query("SELECT * from tickets where id=$1", [id]);
    if (ticketQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Ticket not found" });
    }

    const oldAssigneeId = ticketQuery.rows[0].assigned_to;

    const assign = await pool.query(
      "UPDATE tickets SET assigned_to=$1 WHERE id=$2 RETURNING *",
      [assigned_to, id],
    );

    const updatedTicket = assign.rows[0];

    await pool.query(
      "INSERT INTO ticket_logs (ticket_id,action,performed_by,note) VALUES ($1,$2,$3,$4)",
      [
        updatedTicket.id,
        "ASSIGNED",
        req.user.id,
        `Ticket assignment changed from ${oldAssigneeId || 'Unassigned'} to ${assigned_to}`,
      ],
    );

    // 🔔 Notify new technician (reassignment if there was a previous assignee)
    const isReassignment = !!oldAssigneeId;
    notifyTicketAssigned(updatedTicket, assigned_to, isReassignment).catch(() => {});

    res.status(200).json({ success: true, data: updatedTicket });
  } catch (err) {
    next(err);
  }
};

export const createComment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    if (!comment || comment.trim() === "") {
      return res.status(400).json({ success: false, error: "Comment is required" });
    }
    const ticketQuery = await pool.query("SELECT * FROM tickets where id=$1", [
      id,
    ]);
    if (ticketQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Ticket doesnt exist" });
    }
    const ticket = ticketQuery.rows[0];
    const isUser = req.user.id === ticket.created_by;
    const isAssigned = req.user.id === ticket.assigned_to;
    const isAdmin = req.user.role === "Admin";
    if (!isUser && !isAssigned && !isAdmin) {
      return res
        .status(403)
        .json({
          success: false,
          error: "You are not allowed to create comments on this ticket",
        });
    }

    const newComment = await pool.query(
      "INSERT INTO ticket_comments (ticket_id,author_id,comment) VALUES ($1,$2,$3) RETURNING *",
      [id, req.user.id, comment],
    );

    // 🔔 Notify all ticket participants of the new comment
    notifyNewComment(ticket, req.user.id, req.user.name || 'Someone').catch(() => {});

    res.status(201).json({ success: true, data: newComment.rows[0] });
  } catch (err) {
    next(err);
  }
};

export const getTicketComments = async (req, res, next) => {
  try {
    // 1️⃣ Fetch the ticket first
    const ticketQuery = await pool.query(
      "SELECT * FROM tickets WHERE id = $1",
      [req.params.id],
    );

    if (ticketQuery.rows.length === 0) {
      return res.status(404).json({ success: false, error: "Ticket not found" });
    }

    const ticket = ticketQuery.rows[0];

    // 2️⃣ Ownership + Role Check
    const isOwner = req.user.id === ticket.created_by;
    const isAssigned = req.user.id === ticket.assigned_to;
    const isAdmin = req.user.role === "Admin";

    if (!isOwner && !isAssigned && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: "You do not have permission to view comments for this ticket",
      });
    }

    // 3️⃣ Fetch comments with author names
    const commentsQuery = await pool.query(
      `SELECT c.*, u.name as author_name, u.email as author_email
       FROM ticket_comments c
       LEFT JOIN users u ON c.author_id = u.id
       WHERE c.ticket_id = $1
       ORDER BY c.created_at ASC`,
      [req.params.id],
    );

    return res.status(200).json({ success: true, data: commentsQuery.rows });
  } catch (err) {
    next(err);
  }
};

export const getMetrics = async (req, res, next) => {
  try {
    // Total tickets
    const total = await pool.query("SELECT COUNT(*) FROM tickets");

    // Status counts
    const open = await pool.query(
      "SELECT COUNT(*) FROM tickets WHERE status = 'Open'"
    );
    const inProgress = await pool.query(
      "SELECT COUNT(*) FROM tickets WHERE status IN ('In Progress','In-Progress')"
    );
    const resolved = await pool.query(
      "SELECT COUNT(*) FROM tickets WHERE status = 'Resolved'"
    );

    // Critical severity count
    const critical = await pool.query(
      "SELECT COUNT(*) FROM tickets WHERE severity = 'Critical'"
    );

    // Overdue tickets
    const overdue = await pool.query(
      "SELECT COUNT(*) FROM tickets WHERE sla_deadline < NOW() AND status NOT IN ('Resolved','Closed')"
    );

    // Average resolution time (in hours) for resolved/closed tickets
    const avgResolution = await pool.query(`
      SELECT COALESCE(
        ROUND(AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600)::numeric, 1),
        0
      ) as avg_hours
      FROM tickets
      WHERE status IN ('Resolved', 'Closed')
    `);

    // Severity stats
    const severityStats = await pool.query(`
      SELECT severity, COUNT(*) 
      FROM tickets 
      GROUP BY severity
    `);

    // Convert severity array → object
    const severity = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    severityStats.rows.forEach((row) => {
      const key = row.severity.toLowerCase();
      severity[key] = parseInt(row.count);
    });

    // Incidents over time (last 30 days, grouped by date)
    const incidentsOverTime = await pool.query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM tickets
      WHERE created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Recent activity (last 10 logs)
    const recentActivity = await pool.query(`
      SELECT tl.*, t.title as ticket_title, u.name as performer_name
      FROM ticket_logs tl
      LEFT JOIN tickets t ON tl.ticket_id = t.id
      LEFT JOIN users u ON tl.performed_by = u.id
      ORDER BY tl.created_at DESC
      LIMIT 10
    `);

    res.status(200).json({
      success: true,
      data: {
        total: parseInt(total.rows[0].count),
        status: {
          open: parseInt(open.rows[0].count),
          in_progress: parseInt(inProgress.rows[0].count),
          resolved: parseInt(resolved.rows[0].count),
        },
        critical: parseInt(critical.rows[0].count),
        overdue: parseInt(overdue.rows[0].count),
        avg_resolution_hours: parseFloat(avgResolution.rows[0].avg_hours),
        severity,
        incidents_over_time: incidentsOverTime.rows,
        recent_activity: recentActivity.rows,
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getTicketLogs = async (req, res, next) => {
  try {
    const { id } = req.params;

    const logs = await pool.query(
      `SELECT l.*, u.name as performer_name
       FROM ticket_logs l
       LEFT JOIN users u ON l.performed_by = u.id
       WHERE l.ticket_id = $1
       ORDER BY l.created_at DESC`,
      [id],
    );

    res.status(200).json({ success: true, data: logs.rows });
  } catch (err) {
    next(err);
  }
};

export const getUsers = async (req, res, next) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, role FROM users ORDER BY name ASC"
    );
    res.status(200).json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};
