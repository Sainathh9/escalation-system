import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../api/api.js";
import { FileText, Search, ChevronLeft, ChevronRight } from "lucide-react";
import { timeAgo } from "../../../components/Badges.jsx";

export default function AuditLogExplorer() {
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [page, setPage] = useState(1);
  const limit = 12;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const { data: logData } = useQuery({
    queryKey: ['admin-audit-logs', page, searchDebounced, actionFilter],
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

  // The response from apiFetch is unwrapped: { data: [...], pagination: {...}, filters: {...} }
  // But the apiFetch helper only returns data.data for standard responses.
  // Since we have pagination, it returns { data: [...], pagination: {...} }
  // We need to handle the filters separately
  const logs = logData?.data || logData || [];
  const pagination = logData?.pagination || { total: 0, totalPages: 1 };
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
    <div className="cmd-panel">
      <div className="cmd-panel-header">
        <div className="cmd-panel-title">
          <FileText size={13} />
          <span>Audit Log</span>
        </div>
        <span className="cmd-panel-badge cmd-panel-badge--info">
          {pagination.total} entries
        </span>
      </div>

      {/* Toolbar */}
      <div className="cmd-audit-toolbar">
        <div className="cmd-audit-search">
          <Search size={12} />
          <input
            type="text"
            placeholder="Search logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="audit-search"
          />
        </div>
        <select
          className="cmd-audit-filter"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          id="audit-action-filter"
        >
          <option value="">All Actions</option>
          {actionTypes.map(a => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="cmd-panel-body--flush">
        {Array.isArray(logs) && logs.length === 0 ? (
          <div className="cmd-empty">
            <FileText size={20} />
            <div>No audit logs found</div>
          </div>
        ) : (
          <table className="cmd-table">
            <thead>
              <tr>
                <th>Time</th>
                <th>Action</th>
                <th>Ticket</th>
                <th>Performer</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {(Array.isArray(logs) ? logs : []).map((log, idx) => (
                <tr key={log.id || idx}>
                  <td className="cell-muted" style={{ fontSize: '10px', whiteSpace: 'nowrap' }}>
                    {timeAgo(log.created_at)}
                  </td>
                  <td>
                    <span style={{ ...getActionStyle(log.action), fontWeight: 600, fontSize: '11px' }}>
                      {log.action?.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="cell-mono">
                    {log.ticket_id ? `INC-${log.ticket_id}` : '—'}
                  </td>
                  <td className="cell-muted">
                    {log.performer_name || 'System'}
                  </td>
                  <td style={{ maxWidth: '260px', color: 'var(--text-secondary)', fontSize: '11px' }}>
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
            Page {page} of {pagination.totalPages} · {pagination.total} total
          </span>
          <div className="cmd-audit-page-controls">
            <button
              className="cmd-audit-page-btn"
              disabled={page <= 1}
              onClick={() => setPage(p => p - 1)}
              id="audit-prev"
            >
              <ChevronLeft size={12} />
            </button>
            <button
              className="cmd-audit-page-btn"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(p => p + 1)}
              id="audit-next"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
