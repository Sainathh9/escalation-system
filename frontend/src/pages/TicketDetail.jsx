import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../api/api";
import { useAuth } from "../context/AuthContext";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  StatusBadge,
  SeverityBadge,
  PriorityBadge,
  formatDateTime,
  timeAgo,
} from "../components/Badges.jsx";
import {
  ArrowLeft,
  Send,
  User,
  Calendar,
  Clock,
  Shield,
  Tag,
  AlertTriangle,
  ChevronUp,
  Layers,
  MessageSquare,
} from "lucide-react";

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Queries
  const { data: ticket, isLoading: ticketLoading } = useQuery({
    queryKey: ['ticket', id],
    queryFn: async () => {
      const res = await apiFetch(`/tickets/${id}`);
      if (res.error) throw new Error(res.error);
      return res;
    }
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['ticket-comments', id],
    queryFn: async () => {
      const res = await apiFetch(`/tickets/${id}/comments`);
      return res.error ? [] : res;
    }
  });

  const { data: logs = [] } = useQuery({
    queryKey: ['ticket-logs', id],
    queryFn: async () => {
      const res = await apiFetch(`/tickets/${id}/logs`);
      return res.error ? [] : res;
    }
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-list'],
    queryFn: async () => {
      const res = await apiFetch("/tickets/users");
      return res.error ? [] : res;
    },
    enabled: user?.role === "Admin",
    staleTime: 5 * 60 * 1000,
  });

  const handleAssign = async (e) => {
    const assigneeId = e.target.value;
    const body = assigneeId ? { assigned_to: parseInt(assigneeId) } : { assigned_to: null };
    
    // The instructions say PATCH /tickets/:id/assign
    const res = await apiFetch(`/tickets/${id}/assign`, {
      method: "PUT",
      body: JSON.stringify(body),
    });
    if (!res.error) {
      queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      queryClient.invalidateQueries({ queryKey: ['ticket-logs', id] });
    }
  };

  const loading = ticketLoading;

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setPosting(true);
    const res = await apiFetch(`/tickets/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ comment: newComment }),
    });
    if (!res.error) {
      queryClient.invalidateQueries(['ticket-comments', id]);
      setNewComment("");
      // Success toast alternative
      console.log("Comment added successfully");
    } else {
      console.error("Failed to add comment");
    }
    setPosting(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  // Make sure not to declare validTransitions twice

  const handleStatusUpdate = async (newStatus) => {
    setUpdatingStatus(true);
    const res = await apiFetch(`/tickets/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.error) {
      queryClient.invalidateQueries(['ticket', id]);
      queryClient.invalidateQueries(['ticket-logs', id]);
      // Success toast alternative
      console.log("Status updated");
    } else {
      console.error("Failed to update status");
    }
    setUpdatingStatus(false);
  };

  const getTimelineDotClass = (action) => {
    if (!action) return "created";
    const lower = action.toLowerCase();
    if (lower.includes("escalat")) return "escalated";
    if (lower.includes("assign")) return "assigned";
    if (lower.includes("resolv") || lower.includes("closed")) return "resolved";
    if (lower.includes("status")) return "status";
    if (lower.includes("created")) return "created";
    return "created";
  };

  const getTimelineIcon = (action) => {
    if (!action) return "📝";
    const lower = action.toLowerCase();
    if (lower.includes("escalat")) return "🔺";
    if (lower.includes("assign")) return "👤";
    if (lower.includes("resolv")) return "✅";
    if (lower.includes("closed")) return "🔒";
    if (lower.includes("status")) return "🔄";
    if (lower.includes("created")) return "📝";
    return "📋";
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // SLA helpers
  const getSlaStatus = () => {
    if (!ticket?.sla_deadline) return { label: "No SLA", className: "sla-none" };
    const deadline = new Date(ticket.sla_deadline);
    const now = new Date();
    const diff = deadline - now;
    const hours = Math.floor(diff / 3600000);

    if (diff < 0)
      return { label: "SLA Breached", className: "sla-breached" };
    if (hours < 4)
      return {
        label: `${hours}h remaining`,
        className: "sla-warning",
      };
    return { label: "Within SLA", className: "sla-ok" };
  };

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        Loading ticket...
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">🔍</div>
        <div className="empty-state-title">Ticket not found</div>
        <div className="empty-state-text">
          The ticket you're looking for doesn't exist or you don't have access.
        </div>
      </div>
    );
  }

  const sla = getSlaStatus();
  // Valid status transitions
  const isTechnician = user?.role === "Technician";
  const isAdmin = user?.role === "Admin";
  
  let validTransitions = [];
  if (ticket.status === "Open") {
     validTransitions = ["In-Progress"];
  } else if (ticket.status === "In-Progress" || ticket.status === "In Progress") {
     validTransitions = ["Resolved"];
  } else if (ticket.status === "Resolved" && isAdmin) { // Only Admin can close
     validTransitions = ["Closed"];
  }

  const nextStatuses = validTransitions;
  const canUpdateStatus = isAdmin || (isTechnician && ticket.assigned_to === user.id);

  return (
    <div className="detail-page">
      {/* Breadcrumb / Back */}
      <div className="detail-breadcrumb">
        <button
          className="btn btn-ghost"
          onClick={() => navigate("/tickets")}
          id="back-btn"
        >
          <ArrowLeft size={14} />
          Back to Tickets
        </button>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">INC-{ticket.id}</span>
      </div>

      {/* Two-column layout */}
      <div className="detail-layout">
        {/* ============ LEFT: Main Content (70%) ============ */}
        <div className="detail-main">
          {/* Header Card */}
          <div className="detail-header-card">
            <div className="detail-header-top">
              <span className="detail-ticket-id">INC-{ticket.id}</span>
              <div className="detail-header-badges">
                <StatusBadge status={ticket.status} />
                <SeverityBadge severity={ticket.severity} />
                <PriorityBadge priority={ticket.priority} />
              </div>
            </div>
            <h1 className="detail-title">{ticket.title}</h1>
            <div className="detail-header-meta">
              <span className="detail-meta-item">
                <User size={12} />
                {ticket.created_by_name || "Unknown"}
              </span>
              <span className="detail-meta-sep">·</span>
              <span className="detail-meta-item">
                <Calendar size={12} />
                {formatDateTime(ticket.created_at)}
              </span>
              {ticket.updated_at && (
                <>
                  <span className="detail-meta-sep">·</span>
                  <span className="detail-meta-item">
                    Updated {timeAgo(ticket.updated_at)}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="detail-section">
            <h3 className="detail-section-title">Description</h3>
            <div className="detail-description">
              {ticket.description || "No description provided."}
            </div>
          </div>

          {/* Properties Grid */}
          <div className="detail-section">
            <h3 className="detail-section-title">Properties</h3>
            <div className="detail-properties">
              <div className="detail-prop">
                <div className="detail-prop-icon">
                  <Tag size={13} />
                </div>
                <div className="detail-prop-content">
                  <span className="detail-prop-label">Status</span>
                  <span className="detail-prop-value">
                    <StatusBadge status={ticket.status} />
                  </span>
                </div>
              </div>

              <div className="detail-prop">
                <div className="detail-prop-icon">
                  <AlertTriangle size={13} />
                </div>
                <div className="detail-prop-content">
                  <span className="detail-prop-label">Severity</span>
                  <span className="detail-prop-value">
                    <SeverityBadge severity={ticket.severity} />
                  </span>
                </div>
              </div>

              <div className="detail-prop">
                <div className="detail-prop-icon">
                  <ChevronUp size={13} />
                </div>
                <div className="detail-prop-content">
                  <span className="detail-prop-label">Priority</span>
                  <span className="detail-prop-value">
                    <PriorityBadge priority={ticket.priority} />
                  </span>
                </div>
              </div>

              <div className="detail-prop">
                <div className="detail-prop-icon">
                  <Layers size={13} />
                </div>
                <div className="detail-prop-content">
                  <span className="detail-prop-label">Category</span>
                  <span className="detail-prop-value detail-prop-text">
                    {ticket.category || "General"}
                  </span>
                </div>
              </div>

              <div className="detail-prop">
                <div className="detail-prop-icon">
                  <User size={13} />
                </div>
                <div className="detail-prop-content">
                  <span className="detail-prop-label">Assigned To</span>
                  <span className="detail-prop-value">
                    {ticket.assigned_to_name ? (
                      <div className="detail-assignee">
                        <div className="detail-assignee-avatar">
                          {getInitials(ticket.assigned_to_name)}
                        </div>
                        <span>{ticket.assigned_to_name}</span>
                      </div>
                    ) : (
                      <span className="detail-unassigned">Unassigned</span>
                    )}
                  </span>
                </div>
              </div>

              <div className="detail-prop">
                <div className="detail-prop-icon">
                  <User size={13} />
                </div>
                <div className="detail-prop-content">
                  <span className="detail-prop-label">Created By</span>
                  <span className="detail-prop-value">
                    <div className="detail-assignee">
                      <div className="detail-assignee-avatar">
                        {getInitials(ticket.created_by_name)}
                      </div>
                      <span>{ticket.created_by_name || "Unknown"}</span>
                    </div>
                  </span>
                </div>
              </div>

              <div className="detail-prop">
                <div className="detail-prop-icon">
                  <Clock size={13} />
                </div>
                <div className="detail-prop-content">
                  <span className="detail-prop-label">SLA Deadline</span>
                  <span className="detail-prop-value detail-prop-text">
                    {ticket.sla_deadline
                      ? (
                        <span className={sla.className}>
                           {sla.label}
                        </span>
                      )
                      : "—"}
                  </span>
                </div>
              </div>

              <div className="detail-prop">
                <div className="detail-prop-icon">
                  <Shield size={13} />
                </div>
                <div className="detail-prop-content">
                  <span className="detail-prop-label">Escalation Level</span>
                  <span className="detail-prop-value">
                    <span className="escalation-level">
                      <span className="escalation-current">
                        {ticket.escalation_level || 0}
                      </span>
                      <span className="escalation-max">/ 3</span>
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Actions */}
          {canUpdateStatus && nextStatuses.length > 0 && (
            <div className="detail-section">
              <h3 className="detail-section-title">Actions</h3>
              <div className="detail-actions-bar">
                {nextStatuses.map((s) => {
                  let btnText = `Move to ${s.replace("-", " ")}`;
                  if (s === "In-Progress") btnText = "Start Work";
                  if (s === "Resolved") btnText = "Mark Resolved";

                  return (
                    <button
                      key={s}
                      className={`btn ${
                        s === "Resolved"
                          ? "btn-success"
                          : s === "In-Progress"
                            ? "btn-warning"
                            : "btn-secondary"
                      }`}
                      onClick={() => handleStatusUpdate(s)}
                      disabled={updatingStatus}
                      id={`status-btn-${s.toLowerCase()}`}
                    >
                      {updatingStatus ? "Updating..." : btnText}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Comments */}
          <div className="detail-section detail-comments-section">
            <h3 className="detail-section-title">
              <MessageSquare size={15} />
              Comments
              {comments.length > 0 && (
                <span className="comment-count">{comments.length}</span>
              )}
            </h3>

            {/* Comment input */}
            <div className="detail-comment-input">
              <div className="detail-comment-avatar">
                {getInitials(user?.name)}
              </div>
              <div className="detail-comment-input-area">
                <input
                  type="text"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyDown={handleKeyPress}
                  className="detail-comment-field"
                  id="comment-input"
                />
                <button
                  className="btn btn-primary detail-comment-send"
                  onClick={handleAddComment}
                  disabled={posting || !newComment.trim()}
                  id="submit-comment-btn"
                >
                  <Send size={13} />
                </button>
              </div>
            </div>

            {/* Comment list */}
            <div className="detail-comment-list">
              {comments.length === 0 ? (
                <div className="detail-comment-empty">
                  No comments yet. Be the first to add one.
                </div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className="detail-comment-item">
                    <div className="detail-comment-item-avatar">
                      {getInitials(c.author_name)}
                    </div>
                    <div className="detail-comment-body">
                      <div className="detail-comment-header">
                        <span className="detail-comment-author">
                          {c.author_name || `User #${c.author_id}`}
                        </span>
                        <span className="detail-comment-time">
                          {timeAgo(c.created_at)}
                        </span>
                      </div>
                      <div className="detail-comment-text">{c.comment}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* ============ RIGHT: Activity Sidebar (30%) ============ */}
        <div className="detail-sidebar">
          {/* SLA Card */}
          <div className="detail-sidebar-card">
            <div className="detail-sidebar-card-header">
              <Clock size={14} />
              <h3>SLA Status</h3>
            </div>
            <div className={`sla-indicator ${sla.className}`}>
              <div className="sla-dot"></div>
              <span>{sla.label}</span>
            </div>
            {ticket.sla_deadline && (
              <div className="sla-deadline">
                Deadline: {formatDateTime(ticket.sla_deadline)}
              </div>
            )}
          </div>

          {/* Escalation Card */}
          <div className="detail-sidebar-card">
            <div className="detail-sidebar-card-header">
              <Shield size={14} />
              <h3>Escalation</h3>
            </div>
            <div className="escalation-track">
              {[1, 2, 3].map((level) => (
                <div
                  key={level}
                  className={`escalation-step ${
                    (ticket.escalation_level || 0) >= level ? "active" : ""
                  }`}
                >
                  <div className="escalation-step-dot"></div>
                  <span>Level {level}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Admin Tools */}
          {isAdmin && (
             <div className="detail-sidebar-card">
              <div className="detail-sidebar-card-header">
                <User size={14} />
                <h3>Assignment</h3>
              </div>
              <select 
                className="detail-assign-select"
                value={ticket.assigned_to || ""}
                onChange={handleAssign}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
              >
                <option value="">Unassigned</option>
                {users.filter(u => u.role === "Technician").map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
             </div>
          )}

          {/* Activity Timeline */}
          <div className="detail-sidebar-card detail-timeline-card">
            <div className="detail-sidebar-card-header">
              <Layers size={14} />
              <h3>Activity Timeline</h3>
            </div>
            {logs.length === 0 ? (
              <div className="detail-timeline-empty">
                No activity recorded yet.
              </div>
            ) : (
              <div className="detail-timeline">
                {logs.map((log) => (
                  <div key={log.id} className="detail-timeline-item">
                    <div className="detail-timeline-track">
                      <div
                        className={`detail-timeline-dot ${getTimelineDotClass(
                          log.action
                        )}`}
                      >
                        <span className="detail-timeline-icon">
                          {getTimelineIcon(log.action)}
                        </span>
                      </div>
                      <div className="detail-timeline-line"></div>
                    </div>
                    <div className="detail-timeline-content">
                      <div className="detail-timeline-action">
                        {log.action?.replace(/_/g, " ")}
                      </div>
                      {log.note && (
                        <div className="detail-timeline-note">{log.note}</div>
                      )}
                      <div className="detail-timeline-meta">
                        {log.performer_name && (
                          <span>{log.performer_name}</span>
                        )}
                        {log.performer_name && <span>·</span>}
                        <span>{timeAgo(log.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}