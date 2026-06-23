import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../../api/api.js";
import { useQueryClient } from "@tanstack/react-query";
import { ListOrdered, Clock, CheckCircle2, Play, Inbox } from "lucide-react";
import { timeAgo } from "../../../components/Badges.jsx";

// ── Live SLA Countdown ─────────────────────────────────────────
function SlaTimer({ deadline }) {
  const [remaining, setRemaining] = useState(() => {
    return Math.floor((new Date(deadline) - Date.now()) / 1000);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(Math.floor((new Date(deadline) - Date.now()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (remaining <= 0) {
    const overdue = Math.abs(remaining);
    const h = Math.floor(overdue / 3600);
    const m = Math.floor((overdue % 3600) / 60);
    return (
      <span className="cmd-sla-timer cmd-sla-timer--breached">
        <Clock size={10} />
        -{h > 0 ? `${h}h ` : ''}{m}m
      </span>
    );
  }

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const cls = remaining < 900 ? 'cmd-sla-timer--danger'
    : remaining < 3600 ? 'cmd-sla-timer--warning'
    : 'cmd-sla-timer--ok';

  return (
    <span className={`cmd-sla-timer ${cls}`}>
      <Clock size={10} />
      {h > 0 ? `${h}h ` : ''}{m}m {s}s
    </span>
  );
}

// ── Severity Mini Badge ────────────────────────────────────────
function SevBadge({ severity }) {
  const s = (severity || 'medium').toLowerCase();
  return <span className={`cmd-sev cmd-sev--${s}`}>{severity}</span>;
}

// ── Escalation Badge ───────────────────────────────────────────
function EscBadge({ level }) {
  if (!level || level <= 0) return null;
  return <span className={`cmd-esc-level cmd-esc-level--${level}`}>L{level}</span>;
}

export default function PriorityQueue({ tickets, userId }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [updating, setUpdating] = useState(null); // ticketId being updated

  const now = new Date();

  // Helpers
  const isOverdue = (t) => {
    if (!t.sla_deadline || t.status === "Resolved" || t.status === "Closed") return false;
    return new Date(t.sla_deadline) < now;
  };

  const isNearBreach = (t) => {
    if (!t.sla_deadline || t.status === "Resolved" || t.status === "Closed") return false;
    const diff = (new Date(t.sla_deadline) - now) / 3600000;
    return diff >= 0 && diff <= 2;
  };

  // Filter active tickets and sort by urgency
  const activeTickets = tickets
    .filter(t => t.status !== "Resolved" && t.status !== "Closed")
    .sort((a, b) => {
      // 1. Overdue first
      const aOver = isOverdue(a);
      const bOver = isOverdue(b);
      if (aOver && !bOver) return -1;
      if (!aOver && bOver) return 1;

      // 2. Critical severity first
      const sevOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      const sevDiff = (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4);
      if (sevDiff !== 0) return sevDiff;

      // 3. Nearest SLA deadline first
      const aDead = a.sla_deadline ? new Date(a.sla_deadline).getTime() : Infinity;
      const bDead = b.sla_deadline ? new Date(b.sla_deadline).getTime() : Infinity;
      return aDead - bDead;
    });

  // Quick status update
  const handleQuickAction = async (e, ticketId, newStatus) => {
    e.stopPropagation(); // Don't navigate
    setUpdating(ticketId);
    const res = await apiFetch(`/tickets/${ticketId}/status`, {
      method: "PUT",
      body: JSON.stringify({ status: newStatus }),
    });
    if (!res.error) {
      queryClient.invalidateQueries({ queryKey: ['tech-dashboard-tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tech-my-stats'] });
    }
    setUpdating(null);
  };

  // Get row urgency class
  const getRowClass = (t) => {
    if (isOverdue(t)) return 'ops-queue-row--overdue';
    if (t.severity === 'Critical') return 'ops-queue-row--critical';
    if (isNearBreach(t)) return 'ops-queue-row--nearBreach';
    return '';
  };

  // Get quick action for ticket
  const getQuickActions = (t) => {
    const isUpdating = updating === t.id;

    if (t.status === "Open") {
      return (
        <button
          className="ops-quick-btn ops-quick-btn--start"
          onClick={(e) => handleQuickAction(e, t.id, "In-Progress")}
          disabled={isUpdating}
          id={`quick-start-${t.id}`}
        >
          <Play size={9} />
          {isUpdating ? '...' : 'Start'}
        </button>
      );
    }

    if (t.status === "In Progress" || t.status === "In-Progress") {
      return (
        <button
          className="ops-quick-btn ops-quick-btn--resolve"
          onClick={(e) => handleQuickAction(e, t.id, "Resolved")}
          disabled={isUpdating}
          id={`quick-resolve-${t.id}`}
        >
          <CheckCircle2 size={9} />
          {isUpdating ? '...' : 'Resolve'}
        </button>
      );
    }

    return null;
  };

  return (
    <div className="ops-queue">
      <div className="ops-queue-header">
        <div className="ops-queue-title">
          <ListOrdered size={13} />
          <span>Priority Queue</span>
        </div>
        <span className="ops-queue-count">
          {activeTickets.length} active
        </span>
      </div>

      <div className="ops-queue-list">
        {activeTickets.length === 0 ? (
          <div className="ops-queue-empty">
            <Inbox size={22} />
            <div>All clear — no active tickets in your queue</div>
          </div>
        ) : (
          activeTickets.map((t) => (
            <div
              key={t.id}
              className={`ops-queue-row ${getRowClass(t)}`}
              onClick={() => navigate(`/tickets/${t.id}`)}
              id={`queue-row-${t.id}`}
            >
              {/* Main body */}
              <div className="ops-queue-row-body">
                <div className="ops-queue-row-top">
                  <span className="ops-queue-ticket-id">INC-{t.id}</span>
                  <span className="ops-queue-ticket-title">{t.title}</span>
                </div>
                <div className="ops-queue-row-meta">
                  <span>{t.category || 'General'}</span>
                  <span>·</span>
                  <span>{timeAgo(t.created_at)}</span>
                  {(t.escalation_level || 0) > 0 && (
                    <>
                      <span>·</span>
                      <EscBadge level={t.escalation_level} />
                    </>
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="ops-queue-badges">
                <SevBadge severity={t.severity} />
              </div>

              {/* SLA Timer */}
              <div className="ops-queue-sla">
                {t.sla_deadline ? (
                  <SlaTimer deadline={t.sla_deadline} />
                ) : (
                  <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>No SLA</span>
                )}
              </div>

              {/* Quick Actions */}
              <div className="ops-quick-actions">
                {getQuickActions(t)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
