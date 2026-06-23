import { TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#16162a',
      border: '1px solid #2a2a3e',
      borderRadius: '6px',
      padding: '8px 12px',
      fontSize: '11px',
    }}>
      <div style={{ color: '#e8e8ed', fontWeight: 600, marginBottom: '2px' }}>{label}</div>
      <div style={{ color: '#a0a0b8' }}>{payload[0].value} incident{payload[0].value !== 1 ? 's' : ''}</div>
    </div>
  );
};

export default function IncidentAnalytics({ incidentsOverTime = [] }) {
  const chartData = incidentsOverTime.map((d) => ({
    date: new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    count: parseInt(d.count),
  }));

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-header">
        <div className="cmd-panel-title">
          <TrendingUp size={13} />
          <span>Incident Trend</span>
        </div>
        <span className="cmd-panel-badge cmd-panel-badge--info">30 days</span>
      </div>
      <div className="cmd-panel-body">
        <div className="cmd-chart-container--tall">
          {chartData.length === 0 ? (
            <div className="cmd-empty">No incident data for the last 30 days</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="incidentGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#4a4a62', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: '#4a4a62', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fill="url(#incidentGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
