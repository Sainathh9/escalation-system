import pool from '../config/db.js';

// ─── Core: insert one notification row ───────────────────────
export const createNotification = async ({ userId, ticketId, type, message }) => {
  try {
    const result = await pool.query(
      `INSERT INTO notifications (user_id, ticket_id, type, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [userId, ticketId, type, message]
    );
    return result.rows[0];
  } catch (err) {
    console.error('[NotificationService] Failed to create notification:', err.message);
  }
};

// ─── Core: create in-app notification for a user ─────────────
const notifyUser = async ({ user, ticket, type, message }) => {
  await createNotification({ userId: user.id, ticketId: ticket.id, type, message });
};

// ─── Helper: fetch all admin users ────────────────────────────
const getAdmins = async () => {
  const result = await pool.query(`SELECT id, email, name FROM users WHERE role = 'Admin'`);
  return result.rows;
};

// ─── Event: Ticket Created → notify all admins & creator ──────
export const notifyTicketCreated = async (ticket, creatorName) => {
  const admins = await getAdmins();
  
  // 1. Notify all admins
  const adminPromises = admins.map((admin) =>
    notifyUser({
      user: admin,
      ticket,
      type: 'TICKET_CREATED',
      message: `New ticket "#${ticket.id} — ${ticket.title}" was created by ${creatorName}.`,
    })
  );

  // 2. Notify the ticket creator
  let creatorPromise = Promise.resolve();
  if (ticket.created_by) {
    const result = await pool.query(`SELECT id, email, name FROM users WHERE id = $1`, [ticket.created_by]);
    if (result.rows.length > 0) {
      const creator = result.rows[0];
      creatorPromise = notifyUser({
        user: creator,
        ticket,
        type: 'TICKET_CREATED',
        message: `Your ticket "#${ticket.id} — ${ticket.title}" has been successfully created.`,
      });
    }
  }

  await Promise.all([...adminPromises, creatorPromise]);
};

// ─── Event: Ticket Assigned / Reassigned → notify technician ──
export const notifyTicketAssigned = async (ticket, technicianId, isReassignment = false) => {
  const result = await pool.query(`SELECT id, email, name FROM users WHERE id = $1`, [technicianId]);
  if (result.rows.length === 0) return;
  const tech = result.rows[0];

  const type = isReassignment ? 'TICKET_REASSIGNED' : 'TICKET_ASSIGNED';
  const verb = isReassignment ? 'reassigned' : 'assigned';

  await notifyUser({
    user: tech,
    ticket,
    type,
    message: `Ticket #${ticket.id} "${ticket.title}" has been ${verb} to you.`,
  });
};

// ─── Event: SLA Warning → notify assigned technician ──────────
export const notifySLAWarning = async (ticket) => {
  if (!ticket.assigned_to) return;
  const result = await pool.query(`SELECT id, email, name FROM users WHERE id = $1`, [ticket.assigned_to]);
  if (result.rows.length === 0) return;
  const tech = result.rows[0];

  await notifyUser({
    user: tech,
    ticket,
    type: 'SLA_WARNING',
    message: `⚠️ SLA breach on ticket #${ticket.id} "${ticket.title}". Immediate action required.`,
  });
};

// ─── Event: Ticket Escalated → notify all admins ──────────────
export const notifyTicketEscalated = async (ticket, escalationLevel) => {
  const admins = await getAdmins();
  await Promise.all(
    admins.map((admin) =>
      notifyUser({
        user: admin,
        ticket,
        type: 'TICKET_ESCALATED',
        escalationLevel,
        message: `🚨 Ticket #${ticket.id} "${ticket.title}" escalated to level ${escalationLevel} due to SLA breach.`,
      })
    )
  );
};

// ─── Event: Ticket Resolved / Closed → notify creator ─────────
export const notifyTicketResolved = async (ticket, status) => {
  if (!ticket.created_by) return;
  const result = await pool.query(`SELECT id, email, name FROM users WHERE id = $1`, [ticket.created_by]);
  if (result.rows.length === 0) return;
  const creator = result.rows[0];

  const type = status === 'Closed' ? 'TICKET_CLOSED' : 'TICKET_RESOLVED';
  const verb = status === 'Closed' ? 'closed' : 'resolved';

  await notifyUser({
    user: creator,
    ticket,
    type,
    message: `Your ticket #${ticket.id} "${ticket.title}" has been ${verb}.`,
  });
};

// ─── Event: New Comment → notify all participants ─────────────
export const notifyNewComment = async (ticket, authorId, authorName) => {
  const participantIds = new Set();

  if (ticket.created_by) participantIds.add(ticket.created_by);
  if (ticket.assigned_to) participantIds.add(ticket.assigned_to);

  // Also notify admins
  const admins = await getAdmins();
  admins.forEach((a) => participantIds.add(a.id));

  // Exclude the author from being notified of their own comment
  participantIds.delete(authorId);

  if (participantIds.size === 0) return;

  // Fetch all participant users in one query
  const ids = [...participantIds];
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(', ');
  const result = await pool.query(
    `SELECT id, email, name FROM users WHERE id IN (${placeholders})`,
    ids
  );

  await Promise.all(
    result.rows.map((user) =>
      notifyUser({
        user,
        ticket,
        type: 'NEW_COMMENT',
        message: `${authorName} commented on ticket #${ticket.id} "${ticket.title}".`,
      })
    )
  );
};

/*This syntax is called object destructuring in function parameters.

Instead of writing:

export const createNotification = async (data) => {
    const userId = data.userId;
    const ticketId = data.ticketId;
    const type = data.type;
    const message = data.message;
}

JavaScript lets you write:

export const createNotification = async ({
    userId,
    ticketId,
    type,
    message
}) => {
}

It does the destructuring automatically.*/
