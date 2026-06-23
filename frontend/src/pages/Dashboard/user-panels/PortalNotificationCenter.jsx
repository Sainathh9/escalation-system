import { useState, useEffect } from "react";
import { useSocketEvent } from "../../../hooks/useSocketEvent.js";
import { Bell, Info, MessageSquare, Wrench, X, ShieldAlert } from "lucide-react";

export default function PortalNotificationCenter({ tickets }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (title, message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, title, message, type }]);

    // Auto-remove toast after 5 seconds
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Helper to check if a ticket ID belongs to the current user's seeded tickets list
  const isUserTicket = (tId) => {
    const parsedId = parseInt(tId);
    return tickets.some((t) => parseInt(t.id) === parsedId);
  };

  // 1️⃣ Listen for live status changes
  useSocketEvent("ticket:status-updated", (payload) => {
    // payload: { ticketId, status, performedBy, note }
    if (isUserTicket(payload.ticketId)) {
      addToast(
        "Incident Status Updated",
        `INC-${payload.ticketId} has been moved to ${payload.status}.`,
        "status"
      );
    }
  });

  // 2️⃣ Listen for technician assignment
  useSocketEvent("ticket:assigned", (payload) => {
    // payload: { ticketId, assignedTo, assignedToName }
    if (isUserTicket(payload.ticketId)) {
      addToast(
        "Technician Assigned",
        `INC-${payload.ticketId} has been dispatched to ${payload.assignedToName || "a support lead"}.`,
        "assign"
      );
    }
  });

  // 3️⃣ Listen for comments
  useSocketEvent("comment:added", (payload) => {
    // payload: { ticketId, comment }
    // Skip if comment is a feedback survey to avoid showing double toasts
    if (payload.comment && payload.comment.comment.includes("[FEEDBACK SURVEY]")) {
      return;
    }

    if (isUserTicket(payload.ticketId)) {
      const authorRole = payload.comment?.author_role || "User";
      // Only alert if the comment is from someone else (Admin/Technician)
      if (authorRole !== "User") {
        addToast(
          "New Message Received",
          `A ${authorRole.toLowerCase()} left an update on INC-${payload.ticketId}.`,
          "comment"
        );
      }
    }
  });

  // 4️⃣ Listen for ticket escalations
  useSocketEvent("ticket:escalated", (payload) => {
    if (isUserTicket(payload.ticketId)) {
      addToast(
        "Priority Re-escalated",
        `INC-${payload.ticketId} has been prioritized to level ${payload.escalation_level} for rapid fix.`,
        "escalate"
      );
    }
  });

  const getToastIcon = (type) => {
    switch (type) {
      case "status":
        return <Info size={14} className="text-accent" />;
      case "assign":
        return <Wrench size={14} className="text-status-resolved" />;
      case "comment":
        return <MessageSquare size={14} className="text-accent" />;
      case "escalate":
        return <ShieldAlert size={14} className="text-status-critical" />;
      default:
        return <Bell size={14} className="text-secondary" />;
    }
  };

  return (
    <>
      {/* Toast Alert Queue (Floating Top-Right) */}
      <div className="portal-toast-container">
        {toasts.map((toast) => (
          <div key={toast.id} className={`portal-toast ${toast.type}`}>
            <div className="portal-toast-icon-wrap">{getToastIcon(toast.type)}</div>
            <div className="portal-toast-body">
              <span className="portal-toast-title">{toast.title}</span>
              <p className="portal-toast-message">{toast.message}</p>
            </div>
            <button
              className="portal-toast-close"
              onClick={() => removeToast(toast.id)}
              title="Dismiss alert"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
