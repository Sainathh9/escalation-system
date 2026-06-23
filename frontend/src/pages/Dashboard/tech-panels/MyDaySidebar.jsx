import { Calendar, TrendingUp, BarChart3 } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const STATUS_COLORS = {
  'Open': '#6b7280',
  'In Progress': '#f59e0b',
  'In-Progress': '#f59e0b',
};

export default function MyDaySidebar({ stats, tickets }) {
  // Status breakdown for mini chart
  const activeTickets = tickets.filter(t => t.status !== "Resolved" && t.status !== "Closed");
  const statusCounts = {};
  activeTickets.forEach(t => {
    const s = t.status === "In-Progress" ? "In Progress" : t.status;
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });

  const chartData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  return (
    <div className="ops-sidebar">
      {/* Work Summary */}
      <div className="ops-sidebar-card">
        <div className="ops-sidebar-header">
          <Calendar size={12} />
          My Day
        </div>
        <div className="ops-sidebar-body">
          <div className="ops-sidebar-stat">
            <span className="ops-sidebar-stat-label">Active queue</span>
            <span className={`ops-sidebar-stat-value ${stats.active_count > 0 ? 'ops-sidebar-stat-value--warning' : ''}`}>
              {stats.active_count}
            </span>
          </div>
          <div className="ops-sidebar-stat">
            <span className="ops-sidebar-stat-label">SLA breached</span>
            <span className={`ops-sidebar-stat-value ${stats.sla_breached > 0 ? 'ops-sidebar-stat-value--danger' : ''}`}>
              {stats.sla_breached}
            </span>
          </div>
          <div className="ops-sidebar-stat">
            <span className="ops-sidebar-stat-label">SLA at risk</span>
            <span className={`ops-sidebar-stat-value ${stats.sla_at_risk > 0 ? 'ops-sidebar-stat-value--warning' : ''}`}>
              {stats.sla_at_risk}
            </span>
          </div>
          <div className="ops-sidebar-stat">
            <span className="ops-sidebar-stat-label">Escalated (L2+)</span>
            <span className={`ops-sidebar-stat-value ${stats.escalated_count > 0 ? 'ops-sidebar-stat-value--danger' : ''}`}>
              {stats.escalated_count}
            </span>
          </div>
          <div className="ops-sidebar-stat">
            <span className="ops-sidebar-stat-label">Resolved today</span>
            <span className="ops-sidebar-stat-value ops-sidebar-stat-value--success">
              {stats.resolved_today}
            </span>
          </div>
          <div className="ops-sidebar-stat">
            <span className="ops-sidebar-stat-label">This week</span>
            <span className="ops-sidebar-stat-value">
              {stats.resolved_this_week}
            </span>
          </div>
        </div>
      </div>

      {/* Status Breakdown Mini Chart */}
      {chartData.length > 0 && (
        <div className="ops-sidebar-card">
          <div className="ops-sidebar-header">
            <BarChart3 size={12} />
            Active Breakdown
          </div>
          <div className="ops-sidebar-body">
            <div className="ops-sidebar-chart">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.name] || '#6366f1'}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {chartData.map((entry) => (
                <div key={entry.name} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '2px',
                      background: STATUS_COLORS[entry.name] || '#6366f1',
                      flexShrink: 0,
                    }}></span>
                    <span style={{ color: 'var(--text-secondary)' }}>{entry.name}</span>
                  </div>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Performance */}
      <div className="ops-sidebar-card">
        <div className="ops-sidebar-header">
          <TrendingUp size={12} />
          Performance
        </div>
        <div className="ops-sidebar-body">
          <div className="ops-sidebar-stat">
            <span className="ops-sidebar-stat-label">Avg resolution</span>
            <span className="ops-sidebar-stat-value">
              {stats.avg_resolution_hours}<span style={{ fontSize: '10px', fontWeight: 400, color: 'var(--text-tertiary)', marginLeft: '2px' }}>hrs</span>
            </span>
          </div>
          <div className="ops-sidebar-stat">
            <span className="ops-sidebar-stat-label">Total assigned</span>
            <span className="ops-sidebar-stat-value">{stats.total_assigned}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
