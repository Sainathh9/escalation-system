import { useNavigate } from "react-router-dom";
import { AlertTriangle, ChevronRight } from "lucide-react";

export default function EscalationBanner({ tickets }) {
  const navigate = useNavigate();

  // Find tickets at escalation level >= 2 OR SLA breached
  const escalated = tickets.filter(t => {
    if (t.status === "Resolved" || t.status === "Closed") return false;
    const isEscalated = (t.escalation_level || 0) >= 2;
    const isBreached = t.sla_deadline && new Date(t.sla_deadline) < new Date();
    return isEscalated || isBreached;
  });

  if (escalated.length === 0) return null;

  // Navigate to the worst ticket (highest escalation, then most overdue)
  const worst = escalated.sort((a, b) => {
    const escDiff = (b.escalation_level || 0) - (a.escalation_level || 0);
    if (escDiff !== 0) return escDiff;
    // Most overdue first
    const aDiff = a.sla_deadline ? new Date(a.sla_deadline) - Date.now() : Infinity;
    const bDiff = b.sla_deadline ? new Date(b.sla_deadline) - Date.now() : Infinity;
    return aDiff - bDiff;
  })[0];

  const breachedCount = escalated.filter(t => t.sla_deadline && new Date(t.sla_deadline) < new Date()).length;
  const l2Plus = escalated.filter(t => (t.escalation_level || 0) >= 2).length;

  return (
    <div
      className="ops-banner"
      onClick={() => navigate(`/tickets/${worst.id}`)}
      id="ops-escalation-banner"
    >
      <div className="ops-banner-icon">
        <AlertTriangle size={16} />
      </div>
      <div className="ops-banner-content">
        <div className="ops-banner-title">
          Escalation Alert — {escalated.length} ticket{escalated.length !== 1 ? 's' : ''} require immediate attention
        </div>
        <div className="ops-banner-desc">
          {breachedCount > 0 && `${breachedCount} SLA breached`}
          {breachedCount > 0 && l2Plus > 0 && ' · '}
          {l2Plus > 0 && `${l2Plus} at escalation L2+`}
          {breachedCount === 0 && l2Plus === 0 && 'Review and act now'}
        </div>
      </div>
      <div className="ops-banner-action">
        View worst <ChevronRight size={12} />
      </div>
    </div>
  );
}
