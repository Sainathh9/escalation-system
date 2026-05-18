export function StatusBadge({ status }) {
  const normalizedStatus = status?.toLowerCase().replace(/\s+/g, "-") || "open";

  const classMap = {
    open: "badge-open",
    "in-progress": "badge-in-progress",
    "in progress": "badge-in-progress",
    resolved: "badge-resolved",
    closed: "badge-closed",
    critical: "badge-critical",
  };

  const labelMap = {
    open: "Open",
    "in-progress": "In Progress",
    "in progress": "In Progress",
    resolved: "Resolved",
    closed: "Closed",
    critical: "Critical",
  };

  const className = classMap[normalizedStatus] || "badge-open";
  const label = labelMap[normalizedStatus] || status;

  return (
    <span className={`badge ${className}`}>
      <span className="badge-dot"></span>
      {label}
    </span>
  );
}

export function SeverityBadge({ severity }) {
  const classMap = {
    Critical: "severity-critical",
    High: "severity-high",
    Medium: "severity-medium",
    Low: "severity-low",
  };

  return (
    <span className={`severity-badge ${classMap[severity] || "severity-medium"}`}>
      {severity}
    </span>
  );
}

export function PriorityBadge({ priority }) {
  const p = parseInt(priority);
  let className = "p3";
  if (p <= 2) className = `p${p}`;
  else if (p === 3) className = "p3";
  else className = `p${p}`;

  const labels = {
    1: "P1 Urgent",
    2: "P2 High",
    3: "P3 Medium",
    4: "P4 Low",
    5: "P5 Minimal",
  };

  return (
    <span className={`priority-badge ${className}`}>
      ● {labels[p] || `P${p}`}
    </span>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatDate(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// eslint-disable-next-line react-refresh/only-export-components
export function formatDateTime(dateStr) {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// eslint-disable-next-line react-refresh/only-export-components
export function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return formatDate(dateStr);
}
