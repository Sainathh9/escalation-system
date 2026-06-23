import { Activity } from "lucide-react";
import { timeAgo } from "../../../components/Badges.jsx";

function getActivityIcon(action) {
  if (!action) return "📝";
  const lower = action.toLowerCase();
  if (lower.includes("escalat")) return "🔺";
  if (lower.includes("assign")) return "👤";
  if (lower.includes("resolv")) return "✅";
  if (lower.includes("closed")) return "🔒";
  if (lower.includes("status")) return "🔄";
  if (lower.includes("created")) return "📝";
  return "📋";
}

function getIconClass(action) {
  if (!action) return "cmd-feed-icon--created";
  const lower = action.toLowerCase();
  if (lower.includes("escalat")) return "cmd-feed-icon--escalated";
  if (lower.includes("assign")) return "cmd-feed-icon--assigned";
  if (lower.includes("resolv")) return "cmd-feed-icon--resolved";
  if (lower.includes("status")) return "cmd-feed-icon--status";
  return "cmd-feed-icon--created";
}

export default function ActivityFeed({ activities = [] }) {
  return (
    <div className="cmd-panel">
      <div className="cmd-panel-header">
        <div className="cmd-panel-title">
          <Activity size={13} />
          <span>Live Activity</span>
        </div>
        {activities.length > 0 && (
          <span className="cmd-panel-badge cmd-panel-badge--info">
            {activities.length} events
          </span>
        )}
      </div>
      <div className="cmd-feed">
        {activities.length === 0 ? (
          <div className="cmd-feed-empty">No recent activity</div>
        ) : (
          activities.map((item, idx) => (
            <div className="cmd-feed-item" key={item.id || idx}>
              <div className={`cmd-feed-icon ${getIconClass(item.action)}`}>
                {getActivityIcon(item.action)}
              </div>
              <div className="cmd-feed-content">
                <div className="cmd-feed-text">
                  <strong>{item.action?.replace(/_/g, " ")}</strong>
                  {item.ticket_title && (
                    <span className="cmd-feed-ticket"> — {item.ticket_title}</span>
                  )}
                </div>
                <div className="cmd-feed-meta">
                  {item.performer_name && <span>{item.performer_name}</span>}
                  {item.performer_name && <span>·</span>}
                  <span>{timeAgo(item.created_at)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
