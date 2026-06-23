import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock } from "lucide-react";

function formatOverdue(seconds) {
  if (!seconds || seconds <= 0) return "—";
  const s = Math.abs(Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m overdue`;
  return `${m}m overdue`;
}

function SlaCountdown({ deadline }) {
  const [remaining, setRemaining] = useState(() => {
    const diff = new Date(deadline) - Date.now();
    return Math.floor(diff / 1000);
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const diff = new Date(deadline) - Date.now();
      setRemaining(Math.floor(diff / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline]);

  if (remaining <= 0) {
    const overdue = Math.abs(remaining);
    const h = Math.floor(overdue / 3600);
    const m = Math.floor((overdue % 3600) / 60);
    const s = overdue % 60;
    return (
      <span className="cmd-sla-timer cmd-sla-timer--breached">
        <Clock size={10} />
        -{h > 0 ? `${h}h ` : ''}{m}m {s}s
      </span>
    );
  }

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const cls = remaining < 900 ? 'cmd-sla-timer--danger' : remaining < 1800 ? 'cmd-sla-timer--warning' : 'cmd-sla-timer--ok';

  return (
    <span className={`cmd-sla-timer ${cls}`}>
      <Clock size={10} />
      {h > 0 ? `${h}h ` : ''}{m}m {s}s
    </span>
  );
}

export default function CriticalIncidents({ slaBreaches = [], approachingSla = [] }) {
  const navigate = useNavigate();

  // Merge: breaches first, then approaching
  const combined = [
    ...slaBreaches.map(t => ({ ...t, _type: 'breached' })),
    ...approachingSla.map(t => ({ ...t, _type: 'approaching' })),
  ].slice(0, 8);

  const total = slaBreaches.length + approachingSla.length;

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-header">
        <div className="cmd-panel-title">
          <AlertTriangle size={13} />
          <span>Critical Incidents & SLA</span>
        </div>
        {total > 0 && (
          <span className="cmd-panel-badge cmd-panel-badge--danger">
            {total} alert{total !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="cmd-panel-body--flush">
        {combined.length === 0 ? (
          <div className="cmd-empty">
            <AlertTriangle size={20} />
            <div>No critical SLA alerts</div>
          </div>
        ) : (
          <table className="cmd-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Sev</th>
                <th>SLA</th>
                <th>Esc</th>
                <th>Assignee</th>
              </tr>
            </thead>
            <tbody>
              {combined.map((t) => (
                <tr key={t.id}>
                  <td className="cell-mono">INC-{t.id}</td>
                  <td>
                    <span
                      className="cell-title-link"
                      onClick={() => navigate(`/tickets/${t.id}`)}
                    >
                      {t.title}
                    </span>
                  </td>
                  <td>
                    <span className={`cmd-sev cmd-sev--${(t.severity || '').toLowerCase()}`}>
                      {t.severity}
                    </span>
                  </td>
                  <td>
                    {t._type === 'breached' ? (
                      <span className="cmd-sla-timer cmd-sla-timer--breached">
                        <Clock size={10} />
                        {formatOverdue(t.overdue_seconds)}
                      </span>
                    ) : (
                      <SlaCountdown deadline={t.sla_deadline} />
                    )}
                  </td>
                  <td>
                    <span className={`cmd-esc-level cmd-esc-level--${t.escalation_level || 0}`}>
                      L{t.escalation_level || 0}
                    </span>
                  </td>
                  <td className="cell-muted">{t.assigned_to_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
