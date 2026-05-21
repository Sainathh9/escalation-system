import { useNavigate } from "react-router-dom";
import { apiFetch } from "../../api/api";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from "../../hooks/useSocket.js";
import { useSocketEvent } from "../../hooks/useSocketEvent.js";
import { timeAgo } from "../../components/Badges.jsx";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Layers,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Shield,
  Activity,
  BarChart3,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Filler
);

export default function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isConnected } = useSocket();

  // 🔌 Listen to real-time update events and invalidate metrics
  useSocketEvent('dashboard:metrics-updated', (payload) => {
    console.log('📊 Admin Dashboard received real-time metrics update:', payload);
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
  });

  const { data: metrics, isLoading: loading, isError } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res = await apiFetch("/tickets/metrics");
      if (res.error) throw new Error(res.error);
      return res;
    },
    staleTime: 60000 // Cache locally for 1 minute before background refetch
  });

  if (loading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        Loading dashboard...
      </div>
    );
  }

  if (isError || !metrics) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📊</div>
        <div className="empty-state-title">Unable to load metrics</div>
        <div className="empty-state-text">
          Check your connection and try again.
        </div>
      </div>
    );
  }

  // Computed values
  const openCount = metrics.status.open + metrics.status.in_progress;
  const resolvedRate =
    metrics.total > 0
      ? Math.round((metrics.status.resolved / metrics.total) * 100)
      : 0;

  // Severity bar percentages
  const sevTotal = Math.max(
    (metrics.severity?.critical || 0) +
      (metrics.severity?.high || 0) +
      (metrics.severity?.medium || 0) +
      (metrics.severity?.low || 0),
    1
  );
  const sevPercent = {
    critical: Math.round(((metrics.severity?.critical || 0) / sevTotal) * 100),
    high: Math.round(((metrics.severity?.high || 0) / sevTotal) * 100),
    medium: Math.round(((metrics.severity?.medium || 0) / sevTotal) * 100),
    low: Math.round(((metrics.severity?.low || 0) / sevTotal) * 100),
  };

  // Chart data
  const chartLabels = (metrics.incidents_over_time || []).map((d) => {
    const date = new Date(d.date);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });

  const chartValues = (metrics.incidents_over_time || []).map((d) =>
    parseInt(d.count)
  );

  const chartData = {
    labels: chartLabels.length > 0 ? chartLabels : ["No data"],
    datasets: [
      {
        label: "Incidents",
        data: chartValues.length > 0 ? chartValues : [0],
        borderColor: "#6366f1",
        backgroundColor: (ctx) => {
          if (!ctx.chart.chartArea) return "rgba(99, 102, 241, 0.08)";
          const gradient = ctx.chart.ctx.createLinearGradient(
            0,
            ctx.chart.chartArea.top,
            0,
            ctx.chart.chartArea.bottom
          );
          gradient.addColorStop(0, "rgba(99, 102, 241, 0.15)");
          gradient.addColorStop(1, "rgba(99, 102, 241, 0.01)");
          return gradient;
        },
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "#6366f1",
        pointHoverBorderColor: "#fff",
        pointHoverBorderWidth: 2,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: "index",
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "#16162a",
        titleColor: "#e8e8ed",
        bodyColor: "#a0a0b8",
        borderColor: "#2a2a3e",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
        titleFont: { family: "Inter", size: 12, weight: 600 },
        bodyFont: { family: "Inter", size: 11 },
        displayColors: false,
        callbacks: {
          title: (items) => items[0]?.label || "",
          label: (item) => `${item.raw} incident${item.raw !== 1 ? "s" : ""}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: "#4a4a62",
          font: { family: "Inter", size: 11 },
          maxTicksLimit: 7,
        },
        border: { display: false },
      },
      y: {
        grid: {
          color: "rgba(255,255,255,0.03)",
          drawBorder: false,
        },
        ticks: {
          color: "#4a4a62",
          font: { family: "Inter", size: 11 },
          stepSize: 1,
          padding: 8,
        },
        border: { display: false },
        beginAtZero: true,
      },
    },
  };

  const getActivityIcon = (action) => {
    if (!action) return "📝";
    const lower = action.toLowerCase();
    if (lower.includes("escalat")) return "🔺";
    if (lower.includes("assign")) return "👤";
    if (lower.includes("resolv")) return "✅";
    if (lower.includes("closed")) return "🔒";
    if (lower.includes("status")) return "🔄";
    if (lower.includes("created")) return "📝";
    return "📋";
  };

  const getActivityDotClass = (action) => {
    if (!action) return "created";
    const lower = action.toLowerCase();
    if (lower.includes("escalat")) return "escalated";
    if (lower.includes("assign")) return "assigned";
    if (lower.includes("resolv")) return "resolved";
    if (lower.includes("status")) return "status";
    return "created";
  };

  return (
    <div className="dash">
      {/* Page Header */}
      <div className="dash-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Overview of your incident management system
          </p>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="dash-metrics">
        {/* Total Incidents */}
        <div className="dash-metric-card" id="metric-total">
          <div className="dash-metric-icon-wrap dash-metric-icon-total">
            <Layers size={16} />
          </div>
          <div className="dash-metric-body">
            <div className="dash-metric-label">Total Incidents</div>
            <div className="dash-metric-value">{metrics.total}</div>
          </div>
          <div className="dash-metric-footer">
            <span className="dash-metric-sub">
              {metrics.status.resolved} resolved
            </span>
          </div>
        </div>

        {/* Open Incidents */}
        <div className="dash-metric-card" id="metric-open">
          <div className="dash-metric-icon-wrap dash-metric-icon-open">
            <Clock size={16} />
          </div>
          <div className="dash-metric-body">
            <div className="dash-metric-label">Open Incidents</div>
            <div className="dash-metric-value">{openCount}</div>
          </div>
          <div className="dash-metric-footer">
            <span className="dash-metric-sub">
              {metrics.status.in_progress} in progress
            </span>
          </div>
        </div>

        {/* Critical */}
        <div className="dash-metric-card" id="metric-critical">
          <div className="dash-metric-icon-wrap dash-metric-icon-critical">
            <AlertTriangle size={16} />
          </div>
          <div className="dash-metric-body">
            <div className="dash-metric-label">Critical</div>
            <div className="dash-metric-value dash-value-critical">
              {metrics.critical}
            </div>
          </div>
          <div className="dash-metric-footer">
            <span className="dash-metric-sub">
              {metrics.overdue} overdue
            </span>
          </div>
        </div>

        {/* Avg Resolution */}
        <div className="dash-metric-card" id="metric-resolution">
          <div className="dash-metric-icon-wrap dash-metric-icon-resolved">
            <CheckCircle2 size={16} />
          </div>
          <div className="dash-metric-body">
            <div className="dash-metric-label">Avg. Resolution</div>
            <div className="dash-metric-value">
              {metrics.avg_resolution_hours}
              <span className="dash-metric-unit">hrs</span>
            </div>
          </div>
          <div className="dash-metric-footer">
            <span className="dash-metric-sub">{resolvedRate}% resolved</span>
          </div>
        </div>
      </div>

      {/* Row: Severity Distribution */}
      <div className="dash-severity-card">
        <div className="dash-severity-header">
          <div className="dash-severity-title">
            <BarChart3 size={14} />
            <span>Severity Distribution</span>
          </div>
        </div>
        <div className="dash-severity-bar">
          {sevPercent.critical > 0 && (
            <div
              className="sev-segment sev-critical"
              style={{ width: `${sevPercent.critical}%` }}
              title={`Critical: ${metrics.severity?.critical || 0}`}
            ></div>
          )}
          {sevPercent.high > 0 && (
            <div
              className="sev-segment sev-high"
              style={{ width: `${sevPercent.high}%` }}
              title={`High: ${metrics.severity?.high || 0}`}
            ></div>
          )}
          {sevPercent.medium > 0 && (
            <div
              className="sev-segment sev-medium"
              style={{ width: `${sevPercent.medium}%` }}
              title={`Medium: ${metrics.severity?.medium || 0}`}
            ></div>
          )}
          {sevPercent.low > 0 && (
            <div
              className="sev-segment sev-low"
              style={{ width: `${sevPercent.low}%` }}
              title={`Low: ${metrics.severity?.low || 0}`}
            ></div>
          )}
        </div>
        <div className="dash-severity-legend">
          <div className="sev-legend-item">
            <span className="sev-dot sev-dot-critical"></span>
            <span className="sev-legend-label">Critical</span>
            <span className="sev-legend-count">
              {metrics.severity?.critical || 0}
            </span>
          </div>
          <div className="sev-legend-item">
            <span className="sev-dot sev-dot-high"></span>
            <span className="sev-legend-label">High</span>
            <span className="sev-legend-count">
              {metrics.severity?.high || 0}
            </span>
          </div>
          <div className="sev-legend-item">
            <span className="sev-dot sev-dot-medium"></span>
            <span className="sev-legend-label">Medium</span>
            <span className="sev-legend-count">
              {metrics.severity?.medium || 0}
            </span>
          </div>
          <div className="sev-legend-item">
            <span className="sev-dot sev-dot-low"></span>
            <span className="sev-legend-label">Low</span>
            <span className="sev-legend-count">
              {metrics.severity?.low || 0}
            </span>
          </div>
        </div>
      </div>

      {/* Chart + Activity Grid */}
      <div className="dash-grid">
        {/* Line Chart */}
        <div className="dash-chart-card">
          <div className="dash-card-header">
            <div>
              <div className="dash-card-title">Incidents Over Time</div>
              <div className="dash-card-subtitle">Last 30 days</div>
            </div>
            <div className="dash-card-badge">
              <Activity size={12} />
              <span>Trend</span>
            </div>
          </div>
          <div className="dash-chart-area">
            <Line data={chartData} options={chartOptions} />
          </div>
        </div>

        {/* Activity Feed */}
        <div className="dash-activity-card">
          <div className="dash-card-header">
            <div className="dash-card-title">Recent Activity</div>
            <button
              className="dash-card-link"
              onClick={() => navigate("/tickets")}
            >
              View all
              <ArrowRight size={12} />
            </button>
          </div>

          <div className="dash-activity-list">
            {(!metrics.recent_activity ||
              metrics.recent_activity.length === 0) ? (
              <div className="dash-activity-empty">
                No recent activity recorded.
              </div>
            ) : (
              metrics.recent_activity.map((item, idx) => (
                <div className="dash-activity-item" key={item.id || idx}>
                  <div
                    className={`dash-activity-dot-wrap ${getActivityDotClass(
                      item.action
                    )}`}
                  >
                    <span className="dash-activity-emoji">
                      {getActivityIcon(item.action)}
                    </span>
                  </div>
                  <div className="dash-activity-content">
                    <div className="dash-activity-text">
                      <strong>
                        {item.action?.replace(/_/g, " ")}
                      </strong>
                      {item.ticket_title && (
                        <span className="dash-activity-ticket">
                          {" "}
                          — {item.ticket_title}
                        </span>
                      )}
                    </div>
                    <div className="dash-activity-meta">
                      {item.performer_name && (
                        <span>{item.performer_name}</span>
                      )}
                      {item.performer_name && <span>·</span>}
                      <span>{timeAgo(item.created_at)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}