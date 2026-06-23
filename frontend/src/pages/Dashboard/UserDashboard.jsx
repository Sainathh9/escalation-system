import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../api/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { useSocket } from "../../hooks/useSocket.js";
import { useSocketEvent } from "../../hooks/useSocketEvent.js";
import { StatusBadge, PriorityBadge, formatDate } from "../../components/Badges.jsx";

// Import modular portal components
import PortalTimeline from "./user-panels/PortalTimeline.jsx";
import PortalComments from "./user-panels/PortalComments.jsx";
import PortalFeedback from "./user-panels/PortalFeedback.jsx";
import PortalNotificationCenter from "./user-panels/PortalNotificationCenter.jsx";

// Icon imports
import { 
  Ticket, 
  Clock, 
  CheckCircle2, 
  PlusCircle, 
  History, 
  HelpCircle, 
  ChevronRight, 
  Layers, 
  Sparkles,
  MessageSquare
} from "lucide-react";

export default function UserDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { isConnected } = useSocket();
  
  // Selected ticket state
  const [selectedTicketId, setSelectedTicketId] = useState(null);
  
  // Left menu tab state: 'active' | 'history'
  const [activeTab, setActiveTab] = useState("active");

  // 1️⃣ Live Socket.IO Listeners: Invalidate queries to sync metrics in real-time
  useSocketEvent("dashboard:metrics-updated", () => {
    queryClient.invalidateQueries({ queryKey: ["user-dashboard-tickets", user.id] });
  });

  useSocketEvent("ticket:status-updated", (payload) => {
    queryClient.invalidateQueries({ queryKey: ["user-dashboard-tickets", user.id] });
  });

  useSocketEvent("ticket:assigned", () => {
    queryClient.invalidateQueries({ queryKey: ["user-dashboard-tickets", user.id] });
  });

  // 2️⃣ Fetch user's tickets
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["user-dashboard-tickets", user.id],
    queryFn: async () => {
      // Backend automatically filters to user-created tickets for role 'User'
      const res = await apiFetch(`/tickets?limit=150&sort=created_at&order=desc`);
      if (res.error) throw new Error(res.error);
      return res.data || res || [];
    },
    staleTime: 30000
  });

  // 3️⃣ Auto-select first ticket if nothing selected and active tickets exist
  const activeTickets = tickets.filter(t => t.status !== "Closed");
  const pastTickets = tickets.filter(t => t.status === "Closed");
  
  useEffect(() => {
    if (!selectedTicketId && activeTickets.length > 0 && activeTab === "active") {
      setSelectedTicketId(activeTickets[0].id);
    }
  }, [tickets, selectedTicketId, activeTab]);

  if (isLoading) {
    return (
      <div className="loading-state">
        <div className="loading-spinner"></div>
        Initializing Support Portal...
      </div>
    );
  }

  // Calculate statistics
  const totalCount = tickets.length;
  const pendingCount = tickets.filter(t => t.status === "Open" || t.status === "In-Progress" || t.status === "In Progress").length;
  const resolvedCount = tickets.filter(t => t.status === "Resolved" || t.status === "Closed").length;

  const selectedTicket = tickets.find(t => t.id === selectedTicketId);

  const handleTicketCreated = (newTicket) => {
    // Switch to active tab and highlight new ticket
    setActiveTab("active");
    setSelectedTicketId(newTicket.id);
  };

  return (
    <div className="portal-workspace">
      {/* Dynamic Toast Center */}
      <PortalNotificationCenter tickets={tickets} />

      {/* Header Banner */}
      <div className="portal-header">
        <div>
          <h1 className="portal-header-title">Welcome back, {user?.name.split(" ")[0]}</h1>
          <p className="portal-header-subtitle">
            Need support? Raise an incident or track your existing tickets in real-time.
          </p>
        </div>
        <div className="portal-connection-status">
          <span className={`portal-status-beacon ${isConnected ? "online" : "offline"}`} />
          <span>{isConnected ? "Support Sync Live" : "Offline"}</span>
        </div>
      </div>

      {/* Grid Strip KPIs */}
      <div className="portal-kpi-grid">
        <div className="portal-kpi-card">
          <div className="portal-kpi-icon-wrap blue">
            <Ticket size={16} />
          </div>
          <div>
            <span className="portal-kpi-value">{totalCount}</span>
            <span className="portal-kpi-label">Total Submissions</span>
          </div>
        </div>
        <div className="portal-kpi-card">
          <div className="portal-kpi-icon-wrap amber">
            <Clock size={16} />
          </div>
          <div>
            <span className="portal-kpi-value">{pendingCount}</span>
            <span className="portal-kpi-label">Pending Response</span>
          </div>
        </div>
        <div className="portal-kpi-card">
          <div className="portal-kpi-icon-wrap green">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <span className="portal-kpi-value">{resolvedCount}</span>
            <span className="portal-kpi-label">Fully Resolved</span>
          </div>
        </div>
      </div>

      {/* Split Layout */}
      <div className="portal-layout-row">
        {/* LEFT COLUMN: Queue & Creation Toggle */}
        <div className="portal-sidebar-column">
          {/* Tab Selector Nav */}
          <div className="portal-tabs">
            <button 
              className={`portal-tab-btn ${activeTab === "active" ? "active" : ""}`}
              onClick={() => setActiveTab("active")}
            >
              <Clock size={13} />
              <span>Active Items</span>
              {activeTickets.length > 0 && (
                <span className="portal-tab-counter">{activeTickets.length}</span>
              )}
            </button>
            <button 
              className={`portal-tab-btn ${activeTab === "history" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("history");
                setSelectedTicketId(null);
              }}
            >
              <History size={13} />
              <span>History</span>
            </button>
          </div>

          {/* Ticket Listing Queue */}
          <div className="portal-list-container">
            {activeTab === "active" ? (
              activeTickets.length === 0 ? (
                <div className="portal-empty-state">
                  <Ticket size={28} className="text-tertiary" />
                  <h4>No Active Incidents</h4>
                  <p>All your support requests are completed. Need something fixed?</p>
                  <button className="portal-empty-action" onClick={() => window.dispatchEvent(new CustomEvent("open-create-ticket-modal"))}>
                    Create a New Ticket
                  </button>
                </div>
              ) : (
                <div className="portal-ticket-list">
                  {activeTickets.map((t) => {
                    const isSelected = t.id === selectedTicketId;
                    return (
                      <div
                        key={t.id}
                        className={`portal-ticket-card ${isSelected ? "selected" : ""}`}
                        onClick={() => setSelectedTicketId(t.id)}
                      >
                        <div className="portal-card-header">
                          <span className="portal-card-id">INC-{t.id}</span>
                          <span className="portal-card-date">{formatDate(t.created_at)}</span>
                        </div>
                        <h4 className="portal-card-title">{t.title}</h4>
                        <div className="portal-card-footer">
                          <div className="portal-badge-group">
                            <StatusBadge status={t.status} />
                            <PriorityBadge priority={t.priority} />
                          </div>
                          <ChevronRight size={14} className="portal-card-arrow" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )
            ) : pastTickets.length === 0 ? (
              <div className="portal-empty-state">
                <History size={28} className="text-tertiary" />
                <h4>No History Yet</h4>
                <p>You haven't resolved any incidents in the past.</p>
              </div>
            ) : (
              <div className="portal-ticket-list">
                {pastTickets.map((t) => {
                  const isSelected = t.id === selectedTicketId;
                  return (
                    <div
                      key={t.id}
                      className={`portal-ticket-card history ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedTicketId(t.id)}
                    >
                      <div className="portal-card-header">
                        <span className="portal-card-id">INC-{t.id}</span>
                        <span className="portal-card-date">{formatDate(t.created_at)}</span>
                      </div>
                      <h4 className="portal-card-title">{t.title}</h4>
                      <div className="portal-card-footer">
                        <div className="portal-badge-group">
                          <StatusBadge status={t.status} />
                        </div>
                        <ChevronRight size={14} className="portal-card-arrow" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Incident Console */}
        <div className="portal-console-column">
          {selectedTicket ? (
            <div className="portal-console">
              {/* Timeline Header */}
              <PortalTimeline ticket={selectedTicket} />

              {/* Resolution Feedback (Visible if status is Resolved) */}
              {selectedTicket.status === "Resolved" && (
                <PortalFeedback 
                  ticketId={selectedTicket.id}
                  onClose={() => queryClient.invalidateQueries({ queryKey: ["user-dashboard-tickets", user.id] })} 
                />
              )}

              {/* Chat & Comment Stream */}
              <PortalComments ticketId={selectedTicket.id} />
            </div>
          ) : (
            <div className="portal-console-placeholder">
              <HelpCircle size={40} className="text-tertiary" />
              <h3>Incident Console</h3>
              <p>
                Select an active ticket from the left panel to open live tracking, escalation statuses, assigned technician cards, and real-time chat support.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
