import pool from "../config/db.js"; // Note: You must include the .js extension
import calculateSLA from "../utils/slaCalculator.js";

export const createTicket = async (req, res) => {
  try {
    const { title, description, severity, category, priority } = req.body;

    // 🔒 Basic Input Validation
    if (!title || !severity || !category || priority === undefined) {
      return res.status(400).json({
        error: "Title, severity, category and priority are required",
      });
    }

    // Validate severity
    const allowedSeverities = ["Low", "Medium", "High", "Critical"];
    if (!allowedSeverities.includes(severity)) {
      return res.status(400).json({
        error: "Invalid severity value",
      });
    }

    // Validate priority (1–5)
    if (!Number.isInteger(priority) || priority < 1 || priority > 5) {
      return res.status(400).json({
        error: "Priority must be an integer between 1 and 5",
      });
    }

    const status = "Open";
    const slaDeadline = new Date(Date.now() + 4 * 60 * 60 * 1000);

    const newTicket = await pool.query(
      `INSERT INTO tickets
      (title, description, severity, category, priority,created_by, sla_deadline)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      RETURNING *`,
      [
        title,
        description,
        severity,
        category,
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

    res.status(201).json(createdTicket);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getAllTickets = async (req, res) => {
  try {
    const {
      status,
      severity,
      priority,
      search,
      sort,
      order,
      page = 1,
      limit = 10,
    } = req.query;

    let baseQuery = "FROM tickets WHERE 1=1";
    let values = [];
    let index = 1;

    // 🔐 Role-based filtering
    if (req.user.role === "User") {
      baseQuery += ` AND created_by = $${index}`;
      values.push(req.user.id);
      index++;
    } else if (req.user.role === "Technician") {
      baseQuery += ` AND assigned_to = $${index}`;
      values.push(req.user.id);
      index++;
    }

    // 🔍 Filters
    if (status) {
      baseQuery += ` AND status = $${index}`;
      values.push(status);
      index++;
    }

    if (severity) {
      baseQuery += ` AND severity = $${index}`;
      values.push(severity);
      index++;
    }

    if (priority) {
      baseQuery += ` AND priority = $${index}`;
      values.push(priority);
      index++;
    }

    // 🔎 Search
    if (search) {
      baseQuery += ` AND (title ILIKE $${index} OR description ILIKE $${index})`;
      values.push(`%${search}%`);
      index++;
    }

    // 🧮 Total count query
    const countQuery = `SELECT COUNT(*) ${baseQuery}`;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // 🔽 Sorting
    const allowedSortFields = ["created_at", "priority", "severity", "status"];
    const sortField = allowedSortFields.includes(sort) ? sort : "created_at";
    const sortOrder = order === "asc" ? "ASC" : "DESC";

    // 📄 Pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const offset = (pageNum - 1) * limitNum;

    const dataQuery = `
      SELECT * ${baseQuery}
      ORDER BY ${sortField} ${sortOrder}
      LIMIT $${index} OFFSET $${index + 1}
    `;

    const dataResult = await pool.query(dataQuery, [
      ...values,
      limitNum,
      offset,
    ]);

    // 🚀 Response
    res.status(200).json({
      data: dataResult.rows,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
};

export const getTicketById = async (req, res) => {
  try {
    const ticket = await pool.query("SELECT * FROM tickets WHERE id=$1", [
      req.params.id,
    ]);

    if (ticket.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const obtainedTicket = ticket.rows[0];
    const isOwner = req.user.id === obtainedTicket.created_by;
    const isAssignee = req.user.id === obtainedTicket.assigned_to;
    const isAdmin = req.user.role === "Admin";

    if (!isOwner && !isAssignee && !isAdmin) {
      return res
        .status(403)
        .json({ error: "You dont have the permission to view this ticket" });
    }

    res.status(200).json(obtainedTicket);
  } catch (err) {
    console.log(err.message);
    res.status(500).json(err.message);
  }
};

export const updateTicket = async (req, res) => {
  try {
    const { status } = req.body;

    // 1️⃣ Validate status presence
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    // 2️⃣ Validate allowed statuses
    const allowedStatuses = ["Open", "In-Progress", "Resolved", "Closed"];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: "Invalid status value" });
    }

    // 3️⃣ Fetch ticket
    const ticketQuery = await pool.query(
      "SELECT * FROM tickets WHERE id = $1",
      [req.params.id],
    );

    if (ticketQuery.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = ticketQuery.rows[0];

    // 4️⃣ Ownership + Role Check
    const isAssigned = req.user.id === ticket.assigned_to;
    const isAdmin = req.user.role === "Admin";

    if (!isAssigned && !isAdmin) {
      return res.status(403).json({
        error: "You are not allowed to update this ticket",
      });
    }

    // 5️⃣ Prevent redundant updates
    if (ticket.status === status) {
      return res.status(400).json({
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

    res.status(200).json(updatedTicket);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
};

export const assignTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { assigned_to } = req.body;

    const userQuery = await pool.query("SELECT * from users WHERE id=$1", [
      assigned_to,
    ]);

    if (userQuery.rows.length === 0) {
      return res.status(400).json({ error: "ID doesn't exist" });
    }

    const user = userQuery.rows[0];
    const isTechnician = user.role === "Technician";
    if (!isTechnician) {
      return res
        .status(400)
        .json({ error: "Assigned user must have Technician role" });
    }

    const ticketQuery = await pool.query("SELECT * from tickets where id=$1", [
      id,
    ]);
    if (ticketQuery.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const assign = await pool.query(
      "UPDATE tickets SET assigned_to=$1 WHERE id=$2 RETURNING *",
      [assigned_to, id],
    );
    if (assign.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }
    const updatedTicket = assign.rows[0];
    await pool.query(
      "INSERT INTO ticket_logs (ticket_id,action,performed_by,note) VALUES ($1,$2,$3,$4)",
      [
        updatedTicket.id,
        "ASSIGNED",
        req.user.id, // Assuming performed_by is 1 for now; adjust as needed
        `Ticket assigned to user ID ${assigned_to}`,
      ],
    );
    res.status(200).json(updatedTicket);
  } catch (err) {
    console.log(err.message);
    res.status(500).json(err.message);
  }
};

export const createComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    if (!comment || comment.trim() === "") {
      return res.status(400).json({ error: "Comment is required" });
    }
    const ticketQuery = await pool.query("SELECT * FROM tickets where id=$1", [
      id,
    ]);
    if (ticketQuery.rows.length === 0) {
      return res.status(404).json({ error: "Ticket doesnt exist" });
    }
    const ticket = ticketQuery.rows[0];
    const isUser = req.user.id === ticket.created_by;
    const isAssigned = req.user.id === ticket.assigned_to;
    const isAdmin = req.user.role === "Admin";
    if (!isUser && !isAssigned && !isAdmin) {
      return res
        .status(403)
        .json({
          error: "You are not allowed to create comments on this ticket",
        });
    }

    const newComment = await pool.query(
      "INSERT INTO ticket_comments (ticket_id,author_id,comment) VALUES ($1,$2,$3) RETURNING *",
      [id, req.user.id, comment],
    );
    res.status(201).json(newComment.rows[0]);
  } catch (err) {
    console.log(err.message);
    res.status(500).json(err.message);
  }
};

export const getTicketComments = async (req, res) => {
  try {
    // 1️⃣ Fetch the ticket first
    const ticketQuery = await pool.query(
      "SELECT * FROM tickets WHERE id = $1",
      [req.params.id],
    );

    if (ticketQuery.rows.length === 0) {
      return res.status(404).json({ error: "Ticket not found" });
    }

    const ticket = ticketQuery.rows[0];

    // 2️⃣ Ownership + Role Check
    const isOwner = req.user.id === ticket.created_by;
    const isAssigned = req.user.id === ticket.assigned_to;
    const isAdmin = req.user.role === "Admin";

    if (!isOwner && !isAssigned && !isAdmin) {
      return res.status(403).json({
        error: "You do not have permission to view comments for this ticket",
      });
    }

    // 3️⃣ Fetch comments
    const commentsQuery = await pool.query(
      "SELECT * FROM ticket_comments WHERE ticket_id = $1 ORDER BY created_at ASC",
      [req.params.id],
    );

    return res.status(200).json(commentsQuery.rows);
  } catch (err) {
    console.error(err.message);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getMetrics = async (req, res) => {
  try {
    // Total tickets
    const total = await pool.query("SELECT COUNT(*) FROM tickets");

    // Status counts
    const open = await pool.query(
      "SELECT COUNT(*) FROM tickets WHERE status = 'Open'"
    );
    const inProgress = await pool.query(
      "SELECT COUNT(*) FROM tickets WHERE status = 'In Progress'"
    );
    const resolved = await pool.query(
      "SELECT COUNT(*) FROM tickets WHERE status = 'Resolved'"
    );

    // Overdue tickets
    const overdue = await pool.query(
      "SELECT COUNT(*) FROM tickets WHERE sla_deadline < NOW() AND status NOT IN ('Resolved','Closed')"
    );

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
    };

    severityStats.rows.forEach((row) => {
      const key = row.severity.toLowerCase();
      severity[key] = parseInt(row.count);
    });

    res.status(200).json({
      total: parseInt(total.rows[0].count),
      status: {
        open: parseInt(open.rows[0].count),
        in_progress: parseInt(inProgress.rows[0].count),
        resolved: parseInt(resolved.rows[0].count),
      },
      overdue: parseInt(overdue.rows[0].count),
      severity,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
};

export const getTicketLogs = async (req, res) => {
  try {
    const { id } = req.params;

    const logs = await pool.query(
      "SELECT * FROM ticket_logs WHERE ticket_id = $1 ORDER BY created_at ASC",
      [id],
    );

    res.status(200).json(logs.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).json({ error: "Server error" });
  }
};
