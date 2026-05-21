import { Worker } from "bullmq";
import connection from "../config/redis.js";
import pool from "../config/db.js";
import calculateSLA from "../utils/slaCalculator.js";
import slaQueue from "../queues/slaQueue.js";
import { notifyTicketEscalated } from "../services/notificationService.js";
import { emitToTicket, emitToRole } from "../services/socketService.js";

const MAX_ESCALATION_LEVEL = 3;

const worker = new Worker(
  "sla-escalation",

  async (job) => {
    try {
      const { ticketId } = job.data;

      console.log(`Processing SLA check for ticket ${ticketId}`);

      // Fetch latest ticket state
      const result = await pool.query(
        `SELECT *
         FROM tickets
         WHERE id = $1`,
        [ticketId]
      );

      const ticket = result.rows[0];

      // Ticket deleted or invalid
      if (!ticket) {
        console.warn(`Ticket ${ticketId} not found`);
        return;
      }

      // Prevent escalating already finished tickets
      if (
        ticket.status === "Resolved" ||
        ticket.status === "Closed"
      ) {
        console.log(`Ticket ${ticketId} already resolved`);
        return;
      }

      // Already max escalation
      if (ticket.escalation_level >= MAX_ESCALATION_LEVEL) {
        console.log(
          `Ticket ${ticketId} already at max escalation`
        );

        return;
      }

      // Calculate next escalation level
      const newEscalationLevel = Math.min(
        ticket.escalation_level + 1,
        MAX_ESCALATION_LEVEL
      );  

      // Calculate next SLA deadline
      const newSlaDeadline = calculateSLA(
        ticket.severity,
        newEscalationLevel
      );

      // Update ticket
      await pool.query(
        `
        UPDATE tickets
        SET escalation_level = $1,
            sla_deadline = $2
        WHERE id = $3
        `,
        [
          newEscalationLevel,
          newSlaDeadline,
          ticket.id,
        ]
      );

      // Create audit/system log
      await pool.query(
        `
        INSERT INTO ticket_logs
        (
          ticket_id,
          action,
          performed_by,
          note
        )
        VALUES ($1, $2, $3, $4)
        `,
        [
          ticket.id,
          "ESCALATED",
          null,
          `SLA breached. Escalated to level ${newEscalationLevel}`,
        ]
      );

      console.log(
        `Ticket ${ticket.id} escalated to level ${newEscalationLevel}`
      );

      // 🔌 Real-time Socket.IO emission
      emitToTicket(ticket.id, "ticket:escalated", {
        ticketId: ticket.id,
        escalation_level: newEscalationLevel,
        sla_deadline: newSlaDeadline,
        note: `SLA breached. Escalated to level ${newEscalationLevel}`
      });
      emitToRole("Admin", "dashboard:metrics-updated", { action: "ESCALATED", ticketId: ticket.id });
      emitToRole("Technician", "dashboard:metrics-updated", { action: "ESCALATED", ticketId: ticket.id });

      // 🔔 Notify admins of the escalation
      notifyTicketEscalated(
        { ...ticket, escalation_level: newEscalationLevel },
        newEscalationLevel
      ).catch((err) => console.error(`[SLA Worker] Notification error: ${err.message}`));

      // Schedule next escalation cycle
      if (newEscalationLevel < MAX_ESCALATION_LEVEL) {
        const delay = Math.max(
          0,
          newSlaDeadline - Date.now()
        );

        await slaQueue.add(
          "sla-breach-check",
          {
            ticketId: ticket.id,
          },
          {
            delay,
            attempts: 3,
            removeOnComplete: 100,
            removeOnFail: 50,
          }
        );

        console.log(
          `Next escalation scheduled for ticket ${ticket.id}`
        );
      }
    } catch (err) {
      console.error(
        `SLA Worker Error: ${err.message}`
      );

      throw err;
    }
  },

  {
    connection,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.error(
    `Job ${job?.id} failed: ${err.message}`
  );
});

console.log("SLA Worker Running...");