import { Layers, AlertTriangle, Clock, CheckCircle2, TrendingUp, Users } from "lucide-react";

export default function KpiStrip({ metrics }) {
  const openCount = (metrics.status?.open || 0) + (metrics.status?.in_progress || 0);
  const resolvedRate = metrics.total > 0
    ? Math.round(((metrics.status?.resolved || 0) / metrics.total) * 100)
    : 0;

  return (
    <div className="cmd-kpi-strip">
      {/* Total Incidents */}
      <div className="cmd-kpi" id="kpi-total">
        <div className="cmd-kpi-indicator" style={{ background: 'var(--accent)' }}></div>
        <div className="cmd-kpi-label">Total Incidents</div>
        <div className="cmd-kpi-value">{metrics.total}</div>
        <div className="cmd-kpi-sub">{metrics.status?.resolved || 0} resolved</div>
      </div>

      {/* Open / Active */}
      <div className={`cmd-kpi ${openCount > 0 ? 'cmd-kpi--warning' : ''}`} id="kpi-open">
        <div className="cmd-kpi-indicator"></div>
        <div className="cmd-kpi-label">Open / Active</div>
        <div className="cmd-kpi-value">{openCount}</div>
        <div className="cmd-kpi-sub">{metrics.status?.in_progress || 0} in progress</div>
      </div>

      {/* Critical */}
      <div className={`cmd-kpi ${metrics.critical > 0 ? 'cmd-kpi--critical' : ''}`} id="kpi-critical">
        <div className="cmd-kpi-indicator"></div>
        <div className="cmd-kpi-label">Critical</div>
        <div className="cmd-kpi-value">{metrics.critical}</div>
        <div className="cmd-kpi-sub">{metrics.severity?.critical || 0} total critical sev</div>
      </div>

      {/* SLA Breached */}
      <div className={`cmd-kpi ${metrics.overdue > 0 ? 'cmd-kpi--critical' : ''}`} id="kpi-overdue">
        <div className="cmd-kpi-indicator"></div>
        <div className="cmd-kpi-label">SLA Breached</div>
        <div className="cmd-kpi-value">{metrics.overdue}</div>
        <div className="cmd-kpi-sub">{(metrics.approaching_sla || []).length} approaching</div>
      </div>

      {/* Unassigned */}
      <div className={`cmd-kpi ${(metrics.unassigned || 0) > 0 ? 'cmd-kpi--warning' : ''}`} id="kpi-unassigned">
        <div className="cmd-kpi-indicator"></div>
        <div className="cmd-kpi-label">Unassigned</div>
        <div className="cmd-kpi-value">{metrics.unassigned || 0}</div>
        <div className="cmd-kpi-sub">awaiting assignment</div>
      </div>

      {/* Avg Resolution */}
      <div className="cmd-kpi cmd-kpi--success" id="kpi-resolution">
        <div className="cmd-kpi-indicator"></div>
        <div className="cmd-kpi-label">Avg Resolution</div>
        <div className="cmd-kpi-value" style={{ color: 'var(--text-primary)' }}>
          {metrics.avg_resolution_hours}<span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: '2px' }}>hrs</span>
        </div>
        <div className="cmd-kpi-sub">{resolvedRate}% resolution rate</div>
      </div>
    </div>
  );
}
