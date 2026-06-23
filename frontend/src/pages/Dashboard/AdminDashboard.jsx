import { apiFetch } from "../../api/api";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSocket } from "../../hooks/useSocket.js";
import { useSocketEvent } from "../../hooks/useSocketEvent.js";
import { Shield, RefreshCw } from "lucide-react";

// Panel components
import KpiStrip from "./panels/KpiStrip.jsx";
import CriticalIncidents from "./panels/CriticalIncidents.jsx";
import ActivityFeed from "./panels/ActivityFeed.jsx";
import QueueHealth from "./panels/QueueHealth.jsx";
import TechWorkload from "./panels/TechWorkload.jsx";
import IncidentAnalytics from "./panels/IncidentAnalytics.jsx";
import CategoryBreakdown from "./panels/CategoryBreakdown.jsx";
import SystemHealth from "./panels/SystemHealth.jsx";
import AuditLogExplorer from "./panels/AuditLogExplorer.jsx";

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const { isConnected } = useSocket();

  // 🔌 Real-time: invalidate all admin queries on any dashboard event
  useSocketEvent('dashboard:metrics-updated', (payload) => {
    queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
    queryClient.invalidateQueries({ queryKey: ['admin-tech-workload'] });
    queryClient.invalidateQueries({ queryKey: ['admin-audit-logs'] });
  });

  // Core metrics query
  const { data: metrics, isLoading, isError } = useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const res = await apiFetch("/tickets/metrics");
      if (res.error) throw new Error(res.error);
      return res;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        Initializing command center...
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

  return (
    <div className="cmd-grid">
      {/* Page Header */}
      <div className="dash-header" style={{ marginBottom: '-4px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={18} style={{ color: 'var(--accent)' }} />
            Command Center
          </h1>
          <p className="page-subtitle">
            Operational overview — IncidentFlow
          </p>
        </div>
      </div>

      {/* Row 1: KPI Strip */}
      <KpiStrip metrics={metrics} />

      {/* Row 2: Critical Incidents (60%) + Live Activity (40%) */}
      <div className="cmd-grid-row cmd-grid-row--60-40">
        <CriticalIncidents
          slaBreaches={metrics.sla_breaches || []}
          approachingSla={metrics.approaching_sla || []}
        />
        <ActivityFeed activities={metrics.recent_activity || []} />
      </div>

      {/* Row 3: SLA Queue Health (60%) + Queue Health (40%) */}
      <div className="cmd-grid-row cmd-grid-row--60-40">
        <TechWorkload />
        <QueueHealth />
      </div>

      {/* Row 4: Incident Analytics (60%) + Category Breakdown (40%) */}
      <div className="cmd-grid-row cmd-grid-row--60-40">
        <IncidentAnalytics incidentsOverTime={metrics.incidents_over_time || []} />
        <CategoryBreakdown categories={metrics.category_breakdown || []} />
      </div>

      {/* Row 5: System Health (full width) */}
      <SystemHealth />

      {/* Row 6: Audit Log Explorer (full width) */}
      <AuditLogExplorer />
    </div>
  );
}