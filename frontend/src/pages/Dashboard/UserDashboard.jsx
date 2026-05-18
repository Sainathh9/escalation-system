import { useNavigate } from "react-router-dom";
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from "../../api/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { StatusBadge, PriorityBadge, formatDate } from "../../components/Badges.jsx";
import { Ticket, AlertCircle, Clock, CheckCircle2 } from "lucide-react";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: ticketData, isLoading } = useQuery({
    queryKey: ['user-dashboard-tickets', user.id],
    queryFn: async () => {
      // Assuming backend supports filtering by creator if not we'd do it client side
      // User likely only has access to their own tickets from the backend anyway
      const res = await apiFetch(`/tickets?limit=100`); 
      if (res.error) throw new Error(res.error);
      
      let data = res.data || [];
      // Client-side fallback if backend doesn't filter perfectly
      // data = data.filter(t => t.created_by === user.id); 
      
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
  
  const stats = {
    total: tickets.length,
    open: tickets.filter(t => t.status === "Open" || t.status === "In Progress" || t.status === "In-Progress").length,
    resolved: tickets.filter(t => t.status === "Resolved" || t.status === "Closed").length,
  };

  const recentTickets = tickets.slice(0, 5);

  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <h1 className="page-title">Welcome back, {user?.name.split(' ')[0]}</h1>
          <p className="page-subtitle">Track your support requests and incidents here</p>
        </div>
      </div>

      <div className="dash-metrics grid-columns-3">
        <div className="dash-metric-card">
          <div className="dash-metric-icon-wrap dash-metric-icon-total"><Ticket size={16} /></div>
          <div className="dash-metric-body">
            <div className="dash-metric-label">Total Requests</div>
            <div className="dash-metric-value">{stats.total}</div>
          </div>
        </div>
        <div className="dash-metric-card">
          <div className="dash-metric-icon-wrap dash-metric-icon-open"><Clock size={16} /></div>
          <div className="dash-metric-body">
            <div className="dash-metric-label">Pending / Open</div>
            <div className="dash-metric-value">{stats.open}</div>
          </div>
        </div>
        <div className="dash-metric-card">
          <div className="dash-metric-icon-wrap dash-metric-icon-resolved"><CheckCircle2 size={16} /></div>
          <div className="dash-metric-body">
            <div className="dash-metric-label">Resolved</div>
            <div className="dash-metric-value">{stats.resolved}</div>
          </div>
        </div>
      </div>

      <div className="dash-grid">
        <div className="dash-chart-card" style={{ gridColumn: 'span 2' }}>
          <div className="dash-card-header">
            <div className="dash-card-title">Recent Requests</div>
            <button className="dash-card-link" onClick={() => navigate("/tickets")}>
              View all
            </button>
          </div>
          
          <div className="table-scroll-area">
            {recentTickets.length === 0 ? (
              <div className="dash-activity-empty">No recent tickets submitted.</div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTickets.map(t => (
                    <tr key={t.id} onClick={() => navigate(`/tickets/${t.id}`)} style={{cursor: 'pointer'}}>
                      <td><span className="ticket-id-badge">INC-{t.id}</span></td>
                      <td className="cell-title"><span className="title-text">{t.title}</span></td>
                      <td><StatusBadge status={t.status} /></td>
                      <td className="cell-date">{formatDate(t.created_at)}</td>
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
