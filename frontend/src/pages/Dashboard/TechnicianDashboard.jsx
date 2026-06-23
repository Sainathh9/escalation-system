import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from "../../api/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../hooks/useSocket.js";
import { useSocketEvent } from "../../hooks/useSocketEvent.js";
import { Wrench } from "lucide-react";

// Tech workspace panels
import EscalationBanner from "./tech-panels/EscalationBanner.jsx";
import TechStatsStrip from "./tech-panels/TechStatsStrip.jsx";
import PriorityQueue from "./tech-panels/PriorityQueue.jsx";
import MyDaySidebar from "./tech-panels/MyDaySidebar.jsx";

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isConnected } = useSocket();

  // 🔌 Real-time: invalidate queries on dashboard events
  useSocketEvent('dashboard:metrics-updated', () => {
    queryClient.invalidateQueries({ queryKey: ['tech-dashboard-tickets'] });
    queryClient.invalidateQueries({ queryKey: ['tech-my-stats'] });
  });

  useSocketEvent('ticket:assigned-direct', () => {
    queryClient.invalidateQueries({ queryKey: ['tech-dashboard-tickets'] });
    queryClient.invalidateQueries({ queryKey: ['tech-my-stats'] });
  });

  // Fetch assigned tickets
  const { data: ticketData, isLoading: ticketsLoading } = useQuery({
    queryKey: ['tech-dashboard-tickets', user.id],
    queryFn: async () => {
      const res = await apiFetch(`/tickets?limit=200`);
      if (res.error) throw new Error(res.error);
      let data = res.data || [];
      // Client-side filter to my tickets
      data = data.filter(t => t.assigned_to === user.id);
      return data;
    },
    staleTime: 30000,
  });

  // Fetch personal stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['tech-my-stats', user.id],
    queryFn: async () => {
      const res = await apiFetch('/tickets/my-stats');
      if (res.error) throw new Error(res.error);
      return res;
    },
    staleTime: 30000,
    refetchInterval: 60000,
  });

  const isLoading = ticketsLoading || statsLoading;

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        Initializing workspace...
      </div>
    );
  }

  const tickets = ticketData || [];
  const myStats = stats || {
    active_count: 0,
    sla_at_risk: 0,
    sla_breached: 0,
    resolved_today: 0,
    resolved_this_week: 0,
    avg_resolution_hours: 0,
    escalated_count: 0,
    total_assigned: 0,
  };

  return (
    <div className="ops-workspace">
      {/* Header */}
      <div className="dash-header" style={{ marginBottom: '-4px' }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={18} style={{ color: 'var(--accent)' }} />
            Workspace
          </h1>
          <p className="page-subtitle">
            What needs your attention right now
          </p>
        </div>
        <button
          className="btn btn-secondary"
          onClick={() => navigate("/tickets")}
          id="view-all-tickets-btn"
        >
          All Tickets
        </button>
      </div>

      {/* Escalation Banner (conditional) */}
      <EscalationBanner tickets={tickets} />

      {/* Stats Strip */}
      <TechStatsStrip stats={myStats} />

      {/* Main Content: Priority Queue + Sidebar */}
      <div className="ops-main-row">
        <PriorityQueue tickets={tickets} userId={user.id} />
        <MyDaySidebar stats={myStats} tickets={tickets} />
      </div>
    </div>
  );
}
