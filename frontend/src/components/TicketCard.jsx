import "./TicketCard.css";

export default function TicketCard({ ticket }) {
  const statusClass = {
    Open: "status-open",
    "In Progress": "status-progress",
    Resolved: "status-resolved",
  };

  const severityClass = {
    High: "severity-high",
    Medium: "severity-medium",
    Low: "severity-low",
  };

  return (
    <div className="ticket-card">
      <div className="ticket-title">{ticket.title}</div>

      <div className="ticket-row">
        <span className={`badge ${statusClass[ticket.status]}`}>
          {ticket.status}
        </span>

        <span className={`badge ${severityClass[ticket.severity]}`}>
          {ticket.severity}
        </span>

        <span className="badge">P{ticket.priority}</span>
      </div>
    </div>
  );
}