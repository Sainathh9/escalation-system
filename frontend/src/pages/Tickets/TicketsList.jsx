import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../../api/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import {
  StatusBadge,
  PriorityBadge,
  SeverityBadge,
  formatDate,
} from "../../components/Badges.jsx";
import {
  Search,
  Eye,
  Pencil,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Ticket,
  AlertTriangle,
  Clock,
  CheckCircle2,
  X,
} from "lucide-react";

export default function TicketsList() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const queryParams = new URLSearchParams(location.search);
  const initialAssigned = queryParams.get("assigned_to") || queryParams.get("assigned") || "";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState(
    user?.role === "Technician" ? user.id.toString() : initialAssigned
  );

  // Sync state when URL query params change (mostly for non-technicians)
  useEffect(() => {
    if (user?.role !== "Technician") {
      const params = new URLSearchParams(location.search);
      const assigned = params.get("assigned_to") || params.get("assigned") || "";
      setAssignedFilter(assigned);
      setPage(1);
    }
  }, [location.search, user?.role]);

  // Pagination
  const [page, setPage] = useState(1);
  const limit = 12;

  // Active filters count
  const activeFilters = [statusFilter, severityFilter, priorityFilter, user?.role === "Technician" ? "" : assignedFilter]
    .filter(Boolean).length;

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const res = await apiFetch("/tickets/users");
      return res.error ? [] : res;
    },
    staleTime: 5 * 60 * 1000,
    enabled: user?.role === 'Admin'
  });

  const { data: ticketData, isLoading: loading } = useQuery({
    queryKey: ['tickets', page, search, statusFilter, severityFilter, priorityFilter, assignedFilter, user?.id],
    queryFn: async () => {
      let url = `/tickets?page=${page}&limit=${limit}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${encodeURIComponent(statusFilter)}`;
      if (severityFilter) url += `&severity=${encodeURIComponent(severityFilter)}`;
      if (priorityFilter) url += `&priority=${encodeURIComponent(priorityFilter)}`;
      
      // Inject assignment correctly based on role
      if (user?.role === "Technician") {
        url += `&assigned_to=${user.id}`;
      } else if (assignedFilter) {
        url += `&assigned_to=${encodeURIComponent(assignedFilter)}`;
      }

      const res = await apiFetch(url);
      if (res.error) throw new Error(res.error);

      let data = res.data || [];
      // Client-side fallback just in case backend ignores query params
      if (user?.role === "User") {
        data = data.filter((t) => t.created_by === user.id);
      } else if (user?.role === "Technician") {
        data = data.filter((t) => t.assigned_to === user.id);
      } else {
        if (assignedFilter === "unassigned") {
          data = data.filter((t) => !t.assigned_to);
        } else if (assignedFilter) {
          data = data.filter((t) => t.assigned_to === parseInt(assignedFilter));
        }
      }

      return {
        tickets: data,
        pagination: res.pagination || { total: 0, totalPages: 1 }
      };
    },
    placeholderData: (prev) => prev, 
    staleTime: 30000,
  });

  const tickets = ticketData?.tickets || [];
  const total = ticketData?.pagination?.total || 0;
  const totalPages = ticketData?.pagination?.totalPages || 1;

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const clearAllFilters = () => {
    setStatusFilter("");
    setSeverityFilter("");
    setPriorityFilter("");
    if (user?.role !== "Technician") {
      setAssignedFilter("");
    }
    setSearchInput("");
    setSearch("");
    setPage(1);
  };

  // Helper for SLA
  const getSlaLabel = (deadline) => {
    if (!deadline) return "—";
    const diffMs = new Date(deadline) - new Date();
    const hours = diffMs / (1000 * 60 * 60);
    if (hours < 0) return <span className="text-red-500 font-bold" style={{color: '#dc2626'}}>Overdue</span>;
    if (hours <= 4) return <span className="text-yellow-600 font-bold" style={{color: '#ca8a04'}}>{Math.floor(hours)}h left</span>;
    return <span>{Math.floor(hours)}h left</span>;
  };

  const stats = {
    total,
    open: tickets.filter((t) => t.status === "Open").length,
    inProgress: tickets.filter(
      (t) => t.status === "In Progress" || t.status === "In-Progress"
    ).length,
    critical: tickets.filter((t) => t.severity === "Critical").length,
  };

  const getRowRange = () => {
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    return `${start}–${end}`;
  };

  return (
    <div className="tickets-page">
      {/* Page Header */}
      <div className="tickets-header">
        <div className="tickets-header-left">
          <h1 className="page-title">{user?.role === "Technician" ? "My Tickets" : "Tickets"}</h1>
          <p className="page-subtitle">
            {user?.role === "Technician" 
              ? "Manage and resolve your assigned incidents"
              : "Manage, track, and resolve incidents across your organization"}
          </p>
        </div>
      </div>

      {/* Summary Stats Bar */}
      <div className="tickets-stats-bar">
        <div className="tickets-stat-item">
          <Ticket size={14} className="tickets-stat-icon" />
          <span className="tickets-stat-value">{stats.total}</span>
          <span className="tickets-stat-label">Total</span>
        </div>
        <div className="tickets-stat-divider" />
        <div className="tickets-stat-item">
          <Clock size={14} className="tickets-stat-icon stat-icon-open" />
          <span className="tickets-stat-value">{stats.open}</span>
          <span className="tickets-stat-label">Open</span>
        </div>
        <div className="tickets-stat-divider" />
        <div className="tickets-stat-item">
          <AlertTriangle size={14} className="tickets-stat-icon stat-icon-progress" />
          <span className="tickets-stat-value">{stats.inProgress}</span>
          <span className="tickets-stat-label">In Progress</span>
        </div>
        <div className="tickets-stat-divider" />
        <div className="tickets-stat-item">
          <CheckCircle2 size={14} className="tickets-stat-icon stat-icon-critical" />
          <span className="tickets-stat-value">{stats.critical}</span>
          <span className="tickets-stat-label">Critical</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="table-container">
        {/* --- Toolbar --- */}
        <div className="table-toolbar">
          <div className="table-toolbar-left">
            {/* Search */}
            <div className="table-search">
              <span className="search-icon">
                <Search size={14} />
              </span>
              <input
                type="text"
                placeholder="Search by title or description..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                id="tickets-search"
              />
              {searchInput && (
                <button
                  className="search-clear"
                  onClick={() => {
                    setSearchInput("");
                    setSearch("");
                    setPage(1);
                  }}
                  id="search-clear-btn"
                >
                  <X size={12} />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="table-filter">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                id="status-filter"
              >
                <option value="">All Status</option>
                <option value="Open">Open</option>
                <option value="In-Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            <div className="table-filter">
              <select
                value={priorityFilter}
                onChange={(e) => {
                  setPriorityFilter(e.target.value);
                  setPage(1);
                }}
                id="priority-filter"
              >
                <option value="">All Priority</option>
                <option value="1">P1 — Urgent</option>
                <option value="2">P2 — High</option>
                <option value="3">P3 — Medium</option>
                <option value="4">P4 — Low</option>
                <option value="5">P5 — Minimal</option>
              </select>
            </div>

            {user?.role === "Admin" && (
              <div className="table-filter">
                <select
                  value={assignedFilter}
                  onChange={(e) => {
                    setAssignedFilter(e.target.value);
                    setPage(1);
                  }}
                  id="assigned-filter"
                >
                  <option value="">All Assignees</option>
                  <option value="unassigned">Unassigned</option>
                  {users
                    .filter((u) => u.role === "Technician")
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* Clear filters */}
            {activeFilters > 0 && (
              <button
                className="btn btn-ghost clear-filters-btn"
                onClick={clearAllFilters}
                id="clear-filters-btn"
              >
                <X size={12} />
                Clear ({activeFilters})
              </button>
            )}
          </div>

          <div className="table-toolbar-right">
            <span className="table-count">
              {total} result{total !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* --- Table --- */}
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            Loading tickets...
          </div>
        ) : tickets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">
              <Ticket size={40} strokeWidth={1} />
            </div>
            <div className="empty-state-title">No tickets found</div>
            <div className="empty-state-text">
              {activeFilters > 0 || search
                ? "Try adjusting your filters or search query"
                : "Your queue is completely empty. Great work!"}
            </div>
          </div>
        ) : (
          <div className="table-scroll-area">
            <table className="data-table" id="tickets-table">
              <thead>
                <tr>
                  <th className="th-id">ID</th>
                  <th className="th-title">Title</th>
                  <th className="th-status">Status</th>
                  <th className="th-priority">Priority</th>
                  {user?.role !== "Technician" && <th className="th-assigned">Assigned To</th>}
                  {user?.role === "Technician" && <th className="th-assigned">SLA Remaining</th>}
                  <th className="th-date">Last Updated</th>
                  <th className="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} id={`ticket-row-${ticket.id}`}>
                    <td className="cell-id">
                      <span className="ticket-id-badge">INC-{ticket.id}</span>
                    </td>
                    <td className="cell-title">
                      <div className="title-content">
                        <span
                          className="title-text"
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          {ticket.title}
                        </span>
                        <span className="title-severity">
                          <SeverityBadge severity={ticket.severity} />
                        </span>
                      </div>
                    </td>
                    <td className="cell-status">
                      <StatusBadge status={ticket.status} />
                    </td>
                    <td className="cell-priority">
                      <PriorityBadge priority={ticket.priority} />
                    </td>

                    {user?.role !== "Technician" && (
                      <td className="cell-assigned">
                        {ticket.assigned_to_name ? (
                          <div className="assigned-user">
                            <div className="assigned-avatar">
                              {ticket.assigned_to_name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .toUpperCase()}
                            </div>
                            <span className="assigned-name">
                              {ticket.assigned_to_name}
                            </span>
                          </div>
                        ) : (
                          <span className="unassigned-label">Unassigned</span>
                        )}
                      </td>
                    )}
                    
                    {user?.role === "Technician" && (
                       <td className="cell-assigned" style={{ fontSize: '13px' }}>
                          {ticket.status === "Closed" || ticket.status === "Resolved" 
                            ? "—" 
                            : getSlaLabel(ticket.sla_deadline)}
                       </td>
                    )}

                    <td className="cell-date">
                      {formatDate(ticket.updated_at || ticket.created_at)}
                    </td>
                    <td className="cell-actions">
                      <div className="action-buttons">
                        <button
                          className="action-btn"
                          onClick={() => navigate(`/tickets/${ticket.id}`)}
                          title="View ticket"
                          id={`view-btn-${ticket.id}`}
                        >
                          <Eye size={14} />
                        </button>
                        {user?.role === "Admin" && (
                          <button
                            className="action-btn"
                            onClick={() => navigate(`/tickets/${ticket.id}`)}
                            title="Edit ticket"
                            id={`edit-btn-${ticket.id}`}
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* --- Pagination --- */}
        {totalPages >= 1 && !loading && tickets.length > 0 && (
          <div className="table-pagination">
            <div className="table-pagination-info">
              Showing <strong>{getRowRange()}</strong> of{" "}
              <strong>{total}</strong> tickets
            </div>
            <div className="table-pagination-controls">
              <button
                className="pagination-btn"
                disabled={page === 1}
                onClick={() => setPage(1)}
                title="First page"
                id="first-page-btn"
              >
                <ChevronsLeft size={14} />
              </button>
              <button
                className="pagination-btn"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                title="Previous page"
                id="prev-page-btn"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page numbers */}
              <div className="pagination-pages">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      className={`pagination-page-btn ${
                        page === pageNum ? "active" : ""
                      }`}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                className="pagination-btn"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                title="Next page"
                id="next-page-btn"
              >
                <ChevronRight size={14} />
              </button>
              <button
                className="pagination-btn"
                disabled={page >= totalPages}
                onClick={() => setPage(totalPages)}
                title="Last page"
                id="last-page-btn"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
