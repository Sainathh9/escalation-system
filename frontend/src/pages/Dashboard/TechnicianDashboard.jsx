import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from "../../api/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../hooks/useSocket.js";
import { useSocketEvent } from "../../hooks/useSocketEvent.js";
import { StatusBadge, PriorityBadge, formatDate } from "../../components/Badges.jsx";
import { AlertCircle, Clock, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

export default function TechnicianDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isConnected } = useSocket();

  // 🔌 Listen to real-time update events and invalidate technician queries
  useSocketEvent('dashboard:metrics-updated', (payload) => {
    console.log('🔧 Technician Dashboard received real-time updates:', payload);
    queryClient.invalidateQueries({ queryKey: ['tech-dashboard-tickets', user.id] });
  });

  useSocketEvent('ticket:assigned-direct', (payload) => {
    console.log('⚡ Direct ticket assignment received on Technician Dashboard:', payload);
    queryClient.invalidateQueries({ queryKey: ['tech-dashboard-tickets', user.id] });
  });

  const { data: ticketData, isLoading } = useQuery({
    queryKey: ['tech-dashboard-tickets', user.id],
    queryFn: async () => {
      // Fetch only assigned tickets, using existing assigned_to param if supported or fallback to all and filter
      const res = await apiFetch(`/tickets?limit=200`);
      if (res.error) throw new Error(res.error);
      
      let data = res.data || [];
      // Client-side precise filter
      data = data.filter(t => t.assigned_to === user.id);
      
      return data;
    },
    staleTime: 30000 
  });

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        Loading dashboard...
      </div>
    );
  }

  const tickets = ticketData || [];
  
  const now = new Date();

  // SLA Calculation Helpers
  const getSLAHoursDiff = (deadlineStr) => {
    if (!deadlineStr) return null;
    const diffMs = new Date(deadlineStr) - now;
    return diffMs / (1000 * 60 * 60);
  };

  const isOverdue = (t) => {
    if (t.status === "Resolved" || t.status === "Closed" || !t.sla_deadline) return false;
    return getSLAHoursDiff(t.sla_deadline) !== null && getSLAHoursDiff(t.sla_deadline) < 0;
  };

  const isNearBreach = (t) => {
    if (t.status === "Resolved" || t.status === "Closed" || !t.sla_deadline) return false;
    const hours = getSLAHoursDiff(t.sla_deadline);
    return hours !== null && hours >= 0 && hours <= 4;
  };

  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "Open" || t.status === "In Progress" || t.status === "In-Progress").length,
    resolvedToday: tickets.filter(t => {
       if (t.status !== "Resolved" && t.status !== "Closed") return false;
       const updated = new Date(t.updated_at);
       const today = new Date();
       return updated.toDateString() === today.toDateString();
    }).length,
    critical: tickets.filter(t => t.severity === "Critical" && t.status !== "Resolved" && t.status !== "Closed").length,
    overdue: tickets.filter(isOverdue).length,
    nearBreach: tickets.filter(isNearBreach).length
  };

  // Urgent Tickets list (Overdue > Critical > Nearest SLA)
  const urgentTickets = tickets
    .filter(t => t.status !== "Closed" && t.status !== "Resolved")
    .sort((a, b) => {
      // 1. Overdue first
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;

      // 2. Critical first
      if (a.severity === "Critical" && b.severity !== "Critical") return -1;
      if (b.severity === "Critical" && a.severity !== "Critical") return 1;

      // 3. Nearest SLA
      const aDiff = getSLAHoursDiff(a.sla_deadline) || Infinity;
      const bDiff = getSLAHoursDiff(b.sla_deadline) || Infinity;
      return aDiff - bDiff;
    })
    .slice(0, 10);

  const getSlaLabel = (deadline) => {
    if (!deadline) return "—";
    const hours = getSLAHoursDiff(deadline);
    if (hours < 0) return <span className="text-red-500 font-bold">Overdue by {Math.abs(Math.floor(hours))}h</span>;
    if (hours <= 4) return <span className="text-yellow-600 font-bold">{Math.floor(hours)}h left</span>;
    return <span>{Math.floor(hours)}h left</span>;
  };

  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <h1 className="page-title">Technician Workspace</h1>
          <p className="page-subtitle">Focus on what needs attention right now.</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={() => navigate("/tickets")}
        >
          View All My Tickets
        </button>
      </div>

      {/* SECTION D: SLA Alert Panel */}
      {(stats.overdue > 0 || stats.nearBreach > 0) && (
        <div className="alert-panel alert-danger" style={{ marginBottom: '24px', padding: '16px', borderRadius: '8px', border: '1px solid #fecaca', backgroundColor: '#fef2f2', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AlertCircle size={20} color="#dc2626" />
          <div>
            <h4 style={{ margin: 0, color: '#991b1b', fontSize: '14px', fontWeight: 600 }}>Urgent Attention Required</h4>
            <p style={{ margin: 0, color: '#b91c1c', fontSize: '13px' }}>
              {stats.overdue > 0 && <span><strong>{stats.overdue}</strong> ticket(s) overdue. </span>}
              {stats.nearBreach > 0 && <span><strong>{stats.nearBreach}</strong> ticket(s) nearing SLA deadline.</span>}
            </p>
          </div>
        </div>
      )}

      {/* SECTION A: URGENCY CARDS */}
      <h3 className="section-heading" style={{ marginTop: '0', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Urgency Overview</h3>
      <div className="dash-metrics grid-columns-3" style={{ marginBottom: '32px' }}>
        <div className="dash-metric-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="dash-metric-icon-wrap" style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}><ShieldAlert size={16} /></div>
          <div className="dash-metric-body">
            <div className="dash-metric-label">Critical Priority</div>
            <div className="dash-metric-value" style={{ color: '#dc2626' }}>{stats.critical}</div>
          </div>
        </div>
        <div className="dash-metric-card" style={{ borderLeft: '4px solid #ea580c' }}>
          <div className="dash-metric-icon-wrap" style={{ backgroundColor: '#fff7ed', color: '#ea580c' }}><AlertTriangle size={16} /></div>
          <div className="dash-metric-body">
            <div className="dash-metric-label">Overdue</div>
            <div className="dash-metric-value" style={{ color: '#ea580c' }}>{stats.overdue}</div>
          </div>
        </div>
        <div className="dash-metric-card" style={{ borderLeft: '4px solid #eab308' }}>
          <div className="dash-metric-icon-wrap" style={{ backgroundColor: '#fefce8', color: '#eab308' }}><Clock size={16} /></div>
          <div className="dash-metric-body">
            <div className="dash-metric-label">Near SLA Breach</div>
            <div className="dash-metric-value" style={{ color: '#ca8a04' }}>{stats.nearBreach}</div>
          </div>
        </div>
      </div>

      {/* SECTION B: WORK SUMMARY */}
      <h3 className="section-heading" style={{ marginTop: '0', fontSize: '14px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>Today's Summary</h3>
      <div className="dash-metrics grid-columns-3" style={{ marginBottom: '32px' }}>
        <div className="dash-metric-card">
          <div className="dash-metric-body">
            <div className="dash-metric-label">Total Assigned</div>
            <div className="dash-metric-value">{stats.total}</div>
          </div>
        </div>
        <div className="dash-metric-card">
          <div className="dash-metric-body">
            <div className="dash-metric-label">In Progress</div>
            <div className="dash-metric-value">{stats.open}</div>
          </div>
        </div>
        <div className="dash-metric-card">
          <div className="dash-metric-body">
            <div className="dash-metric-label">Resolved Today</div>
            <div className="dash-metric-value" style={{ color: '#16a34a' }}>{stats.resolvedToday}</div>
          </div>
        </div>
      </div>

      {/* SECTION C: URGENT TICKETS LIST */}
      <div className="dash-grid" style={{ display: 'block' }}>
        <div className="dash-chart-card">
          <div className="dash-card-header">
            <div className="dash-card-title">Urgent Tickets Action List</div>
            <button className="dash-card-link" onClick={() => navigate("/tickets")}>
              View all
            </button>
          </div>
          
          <div className="table-scroll-area">
            {urgentTickets.length === 0 ? (
              <div className="dash-activity-empty">No urgent tickets in your queue. Great job!</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>SLA Remaining</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {urgentTickets.map(t => (
                    <tr key={t.id} onClick={() => navigate(`/tickets/${t.id}`)} style={{cursor: 'pointer'}}>
                      <td className="cell-title">
                        <span className="title-text" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {isOverdue(t) && <AlertCircle size={14} color="#dc2626" />}
                          {t.title}
                        </span>
                      </td>
                      <td><PriorityBadge priority={t.priority} /></td>
                      <td style={{ fontSize: '13px' }}>{getSlaLabel(t.sla_deadline)}</td>
                      <td><StatusBadge status={t.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
