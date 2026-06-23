import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/api.js";
import { FileText, Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowLeft } from "lucide-react";
import { timeAgo, formatDateTime } from "../components/Badges.jsx";
import { useNavigate } from "react-router-dom";

export default function AuditLogPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 25;

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: logData, isLoading } = useQuery({
    queryKey: ['admin-audit-logs-page', page, searchDebounced, actionFilter],
    queryFn: async () => {
      let url = `/admin/audit-logs?page=${page}&limit=${limit}`;
      if (searchDebounced) url += `&search=${encodeURIComponent(searchDebounced)}`;
      if (actionFilter) url += `&action=${encodeURIComponent(actionFilter)}`;
      const res = await apiFetch(url);
      if (res.error) throw new Error(res.error);
      return res;
    },
    staleTime: 15000,
  });

  const logs = logData?.data || logData || [];
  const pagination = logData?.pagination || { total: 0, totalPages: 1, page: 1 };
  const actionTypes = logData?.filters?.actions || [];

  const getActionStyle = (action) => {
    if (!action) return {};
    const lower = action.toLowerCase();
    if (lower.includes("escalat")) return { color: 'var(--status-critical)' };
    if (lower.includes("assign")) return { color: 'var(--accent-hover)' };
    if (lower.includes("resolv")) return { color: 'var(--status-resolved)' };
    if (lower.includes("status")) return { color: 'var(--status-progress)' };
    return { color: 'var(--text-secondary)' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Header */}
      <div className="dash-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <button className="btn btn-ghost" onClick={() => navigate("/dashboard")} id="audit-back-btn">
              <ArrowLeft size={14} /> Back
            </button>
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} style={{ color: 'var(--accent)' }} />
            Audit Log Explorer
          </h1>
          <p className="page-subtitle">
            Complete audit trail of all system actions
          </p>
        </div>
      </div>

      {/* Main Panel */}
      <div className="cmd-panel">
        {/* Toolbar */}
        <div className="cmd-audit-toolbar">
          <div className="cmd-audit-search" style={{ maxWidth: '400px' }}>
            <Search size={12} />
            <input
              type="text"
              placeholder="Search by action, ticket, or performer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="audit-page-search"
            />
          </div>
          <select
            className="cmd-audit-filter"
            value={actionFilter}
            onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
            id="audit-page-action-filter"
          >
            <option value="">All Actions</option>
            {actionTypes.map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <div style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-tertiary)' }}>
            {pagination.total} total entries
          </div>
        </div>

        {/* Table */}
        <div className="cmd-panel-body--flush">
          {isLoading ? (
            <div className="loading-state" style={{ padding: '40px' }}>
              <div className="loading-spinner"></div>
              Loading audit logs...
            </div>
          ) : Array.isArray(logs) && logs.length === 0 ? (
            <div className="cmd-empty" style={{ padding: '40px' }}>
              <FileText size={24} />
              <div>No audit logs found</div>
            </div>
          ) : (
            <table className="cmd-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Action</th>
                  <th>Ticket</th>
                  <th>Severity</th>
                  <th>Performer</th>
                  <th>Role</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(logs) ? logs : []).map((log, idx) => (
                  <tr key={log.id || idx}>
                    <td className="cell-muted" style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>
                      {formatDateTime(log.created_at)}
                    </td>
                    <td>
                      <span style={{ ...getActionStyle(log.action), fontWeight: 600, fontSize: '11px' }}>
                        {log.action?.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="cell-mono">
                      {log.ticket_id ? (
                        <span
                          className="cell-title-link"
                          onClick={() => navigate(`/tickets/${log.ticket_id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          INC-{log.ticket_id}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      {log.ticket_severity ? (
                        <span className={`cmd-sev cmd-sev--${(log.ticket_severity || '').toLowerCase()}`}>
                          {log.ticket_severity}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="cell-muted">
                      {log.performer_name || 'System'}
                    </td>
                    <td className="cell-muted" style={{ fontSize: '10px' }}>
                      {log.performer_role || '—'}
                    </td>
                    <td style={{ maxWidth: '300px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                      {log.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="cmd-audit-pagination">
            <span>
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total}
            </span>
            <div className="cmd-audit-page-controls">
              <button className="cmd-audit-page-btn" disabled={page <= 1} onClick={() => setPage(1)} id="audit-first">
                <ChevronsLeft size={12} />
              </button>
              <button className="cmd-audit-page-btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)} id="audit-prev-page">
                <ChevronLeft size={12} />
              </button>
              <span style={{ padding: '0 8px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                {page} / {pagination.totalPages}
              </span>
              <button className="cmd-audit-page-btn" disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} id="audit-next-page">
                <ChevronRight size={12} />
              </button>
              <button className="cmd-audit-page-btn" disabled={page >= pagination.totalPages} onClick={() => setPage(pagination.totalPages)} id="audit-last">
                <ChevronsRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
