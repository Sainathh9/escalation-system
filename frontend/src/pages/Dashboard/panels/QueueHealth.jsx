import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../api/api.js";
import { Server, AlertCircle } from "lucide-react";

export default function QueueHealth() {
  const { data: queueData } = useQuery({
    queryKey: ['admin-queue-health'],
    queryFn: async () => {
      const res = await apiFetch("/admin/queue-health");
      if (res.error) throw new Error(res.error);
      return res;
    },
    refetchInterval: 30000, // Auto-refresh every 30s
    staleTime: 15000,
  });

  const counts = queueData?.counts || {};
  const recentFailed = queueData?.recent_failed || [];
  const pendingEscalations = queueData?.pending_escalations || [];

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-header">
        <div className="cmd-panel-title">
          <Server size={13} />
          <span>Queue Health</span>
        </div>
        {(counts.failed || 0) > 0 && (
          <span className="cmd-panel-badge cmd-panel-badge--danger">
            {counts.failed} failed
          </span>
        )}
      </div>
      <div className="cmd-panel-body">
        {/* Job Count Gauges */}
        <div className="cmd-queue-gauges">
          <div className="cmd-queue-gauge">
            <div className="cmd-queue-gauge-value">{counts.waiting || 0}</div>
            <div className="cmd-queue-gauge-label">Waiting</div>
          </div>
          <div className={`cmd-queue-gauge ${(counts.active || 0) > 0 ? 'cmd-queue-gauge--active' : ''}`}>
            <div className="cmd-queue-gauge-value">{counts.active || 0}</div>
            <div className="cmd-queue-gauge-label">Active</div>
          </div>
          <div className={`cmd-queue-gauge ${(counts.delayed || 0) > 0 ? 'cmd-queue-gauge--delayed' : ''}`}>
            <div className="cmd-queue-gauge-value">{counts.delayed || 0}</div>
            <div className="cmd-queue-gauge-label">Delayed</div>
          </div>
          <div className="cmd-queue-gauge">
            <div className="cmd-queue-gauge-value">{counts.completed || 0}</div>
            <div className="cmd-queue-gauge-label">Done</div>
          </div>
          <div className={`cmd-queue-gauge ${(counts.failed || 0) > 0 ? 'cmd-queue-gauge--failed' : ''}`}>
            <div className="cmd-queue-gauge-value">{counts.failed || 0}</div>
            <div className="cmd-queue-gauge-label">Failed</div>
          </div>
        </div>

        {/* Pending Escalations */}
        {pendingEscalations.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px' }}>
              Pending Escalations
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {pendingEscalations.slice(0, 5).map((job) => (
                <div key={job.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', padding: '3px 0' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>INC-{job.ticketId}</span>
                  <span style={{ color: 'var(--accent-hover)', fontVariantNumeric: 'tabular-nums' }}>
                    {job.processAt ? new Date(job.processAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Failures */}
        {recentFailed.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'var(--status-critical)', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <AlertCircle size={10} />
              Recent Failures
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {recentFailed.map((job) => (
                <div key={job.id} style={{ fontSize: '11px', color: 'var(--text-secondary)', padding: '3px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                  <span>INC-{job.ticketId}</span>
                  <span style={{ color: 'var(--text-tertiary)', marginLeft: '8px' }}>{job.failedReason?.substring(0, 60)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
