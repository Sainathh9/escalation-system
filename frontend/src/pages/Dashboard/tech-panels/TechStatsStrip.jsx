import { Zap, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export default function TechStatsStrip({ stats }) {
  return (
    <div className="ops-stats-strip">
      {/* Active */}
      <div className={`cmd-kpi ${stats.active_count > 0 ? 'cmd-kpi--warning' : ''}`} id="tech-kpi-active">
        <div className="cmd-kpi-indicator"></div>
        <div className="cmd-kpi-label">Active Queue</div>
        <div className="cmd-kpi-value">{stats.active_count}</div>
        <div className="cmd-kpi-sub">assigned to me</div>
      </div>

      {/* SLA At Risk */}
      <div className={`cmd-kpi ${(stats.sla_at_risk + stats.sla_breached) > 0 ? 'cmd-kpi--critical' : ''}`} id="tech-kpi-sla">
        <div className="cmd-kpi-indicator"></div>
        <div className="cmd-kpi-label">SLA At Risk</div>
        <div className="cmd-kpi-value">{stats.sla_at_risk + stats.sla_breached}</div>
        <div className="cmd-kpi-sub">
          {stats.sla_breached > 0 ? `${stats.sla_breached} breached` : 'approaching deadline'}
        </div>
      </div>

      {/* Resolved Today */}
      <div className="cmd-kpi cmd-kpi--success" id="tech-kpi-resolved">
        <div className="cmd-kpi-indicator"></div>
        <div className="cmd-kpi-label">Resolved Today</div>
        <div className="cmd-kpi-value" style={{ color: 'var(--text-primary)' }}>{stats.resolved_today}</div>
        <div className="cmd-kpi-sub">{stats.resolved_this_week} this week</div>
      </div>

      {/* Avg Resolution */}
      <div className="cmd-kpi" id="tech-kpi-avg">
        <div className="cmd-kpi-indicator" style={{ background: 'var(--accent)' }}></div>
        <div className="cmd-kpi-label">Avg Resolution</div>
        <div className="cmd-kpi-value">
          {stats.avg_resolution_hours}
          <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: '2px' }}>hrs</span>
        </div>
        <div className="cmd-kpi-sub">{stats.total_assigned} total assigned</div>
      </div>
    </div>
  );
}
