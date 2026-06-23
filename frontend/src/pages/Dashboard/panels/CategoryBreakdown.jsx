import { BarChart3 } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#94a3b8', '#64748b', '#475569', '#334155'];

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0].payload;
  return (
    <div style={{
      background: '#16162a',
      border: '1px solid #2a2a3e',
      borderRadius: '6px',
      padding: '8px 12px',
      fontSize: '11px',
    }}>
      <div style={{ color: '#e8e8ed', fontWeight: 600 }}>{name}</div>
      <div style={{ color: '#a0a0b8' }}>{value} ticket{value !== 1 ? 's' : ''}</div>
    </div>
  );
};

export default function CategoryBreakdown({ categories = [] }) {
  const chartData = categories.map((c) => ({
    name: c.category || 'Uncategorized',
    value: parseInt(c.count),
  }));

  const total = chartData.reduce((sum, c) => sum + c.value, 0);

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-header">
        <div className="cmd-panel-title">
          <BarChart3 size={13} />
          <span>Categories</span>
        </div>
        <span className="cmd-panel-badge cmd-panel-badge--info">
          {categories.length} type{categories.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="cmd-panel-body">
        {chartData.length === 0 ? (
          <div className="cmd-empty">No category data</div>
        ) : (
          <>
            <div className="cmd-chart-container" style={{ height: '180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
              {chartData.map((cat, idx) => (
                <div key={cat.name} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  padding: '2px 0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '2px',
                      background: COLORS[idx % COLORS.length],
                      flexShrink: 0,
                    }}></span>
                    <span style={{ color: 'var(--text-secondary)' }}>{cat.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{cat.value}</span>
                    <span style={{ color: 'var(--text-tertiary)', fontSize: '10px', width: '30px', textAlign: 'right' }}>
                      {total > 0 ? Math.round((cat.value / total) * 100) : 0}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
