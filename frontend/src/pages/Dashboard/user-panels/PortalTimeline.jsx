import { Clock, ShieldCheck, User, Users, CheckCircle, ArrowRight } from "lucide-react";

export default function PortalTimeline({ ticket }) {
  if (!ticket) return null;

  const currentStatus = ticket.status;
  const isAssigned = !!ticket.assigned_to;
  const isEscalated = ticket.escalation_level > 1;

  // Determine active steps (1-indexed)
  let activeStep = 1; // Submitted is always step 1
  if (isAssigned) activeStep = 2;
  if (currentStatus === "In-Progress" || currentStatus === "In Progress") activeStep = 3;
  if (currentStatus === "Resolved") activeStep = 4;
  if (currentStatus === "Closed") activeStep = 5;

  const steps = [
    { number: 1, label: "Submitted", desc: "Ticket logged & queued" },
    { number: 2, label: "Assigned", desc: isAssigned ? `Assigned to ${ticket.assigned_to_name || "NOC Engineer"}` : "Queue dispatching..." },
    { number: 3, label: "Active Analysis", desc: (currentStatus === "In-Progress" || currentStatus === "In Progress") ? "Technician actively working" : "Awaiting analysis" },
    { number: 4, label: "Resolved", desc: currentStatus === "Resolved" ? "Fix applied, verifying" : "Pending resolution" },
    { number: 5, label: "Finalized", desc: currentStatus === "Closed" ? "Incident complete" : "Awaiting confirmation" }
  ];

  // SLA/Estimated Target text based on Severity
  const slaTargetLabel = {
    Critical: "Critical Target: Immediate Fix (< 6 sec response)",
    High: "High Target: 2 Minute Resolution",
    Medium: "Medium Target: 3 Minute Resolution",
    Low: "Low Target: 4 Minute Resolution"
  }[ticket.severity] || "Standard SLA Target";

  // Reassuring explanation for automatic escalation levels
  const renderEscalationBanner = () => {
    if (!isEscalated) return null;

    let levelExplanation = "";
    if (ticket.escalation_level === 2) {
      levelExplanation = "Our SLA monitor has automatically elevated your incident to Level 2 (High Focus) to ensure your service is restored ahead of schedule. Primary engineers have been prioritized.";
    } else if (ticket.escalation_level >= 3) {
      levelExplanation = "ALERT: Elevated to Level 3 Priority. A senior NOC specialist is overseeing the incident directly to resolve it as rapidly as possible.";
    }

    return (
      <div className="portal-timeline-escalation">
        <div className="portal-escalation-badge">
          <ShieldCheck size={14} />
          <span>Priority Elevated</span>
        </div>
        <p className="portal-escalation-text">{levelExplanation}</p>
      </div>
    );
  };

  return (
    <div className="portal-timeline-card">
      <div className="portal-timeline-header">
        <h3 className="portal-timeline-title">Live Tracking & Progress</h3>
        <span className="portal-id-stamp">INC-{ticket.id}</span>
      </div>

      {/* Escalation Transparency Banner */}
      {renderEscalationBanner()}

      {/* Progress Timeline Nodes */}
      <div className="portal-timeline-row">
        {steps.map((step, idx) => {
          const isCompleted = activeStep > step.number;
          const isActive = activeStep === step.number;
          const isPending = activeStep < step.number;

          let nodeClass = "pending";
          if (isActive) nodeClass = "active";
          if (isCompleted) nodeClass = "completed";

          return (
            <div key={step.number} className={`portal-timeline-node-wrap ${nodeClass}`}>
              <div className="portal-timeline-node">
                {isCompleted ? (
                  <CheckCircle size={14} className="node-icon" />
                ) : (
                  <span>{step.number}</span>
                )}
              </div>
              <div className="portal-timeline-label-wrap">
                <span className="portal-node-label">{step.label}</span>
                <span className="portal-node-desc">{step.desc}</span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`portal-timeline-connector ${isCompleted ? "completed" : ""}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* SLA Timeline Estimates */}
      <div className="portal-sla-bar">
        <div className="portal-sla-meta">
          <div className="portal-meta-item">
            <Clock size={13} className="text-secondary" />
            <span>Target SLA:</span>
            <strong className="text-primary">{slaTargetLabel}</strong>
          </div>
          {ticket.status !== "Resolved" && ticket.status !== "Closed" && (
            <div className="portal-meta-item">
              <span className="portal-sla-countdown-dot pulsing" />
              <span>Status:</span>
              <strong className="text-accent">{ticket.status === "Open" ? "Queued" : "Active Diagnostics"}</strong>
            </div>
          )}
        </div>

        {/* Assigned Agent Card */}
        {isAssigned ? (
          <div className="portal-agent-badge">
            <div className="portal-agent-avatar">
              {(ticket.assigned_to_name || "NOC").split(" ").map(n => n[0]).join("")}
            </div>
            <div>
              <span className="portal-agent-title">Assigned Support Lead</span>
              <span className="portal-agent-name">{ticket.assigned_to_name}</span>
            </div>
          </div>
        ) : (
          <div className="portal-agent-badge unassigned">
            <Users size={14} className="text-secondary" />
            <div>
              <span className="portal-agent-title">Assigned Support Lead</span>
              <span className="portal-agent-name">NOC Dispatching...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
