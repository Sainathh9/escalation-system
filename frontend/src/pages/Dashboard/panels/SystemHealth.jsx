import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../api/api.js";
import { Database, Wifi, Radio } from "lucide-react";

function HealthStatus({ status }) {
  const cls = status === 'healthy' ? 'cmd-health-status--healthy'
    : status === 'degraded' ? 'cmd-health-status--degraded'
    : 'cmd-health-status--down';
  const label = status === 'healthy' ? 'Healthy'
    : status === 'degraded' ? 'Degraded'
    : status === 'down' ? 'Down'
    : 'Unknown';
  return <span className={`cmd-health-status ${cls}`}>{label}</span>;
}

export default function SystemHealth() {
  const { data: health } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: async () => {
      const res = await apiFetch("/admin/system-health");
      if (res.error) throw new Error(res.error);
      return res;
    },
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const db = health?.database || {};
  const redis = health?.redis || {};
  const socketio = health?.socketio || {};
  const mem = health?.memoryUsage || {};
  const uptime = health?.uptime || 0;

  const formatUptime = (s) => {
    const hours = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-header">
        <div className="cmd-panel-title">
          <Radio size={13} />
          <span>System Health</span>
        </div>
        <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
          Uptime: {formatUptime(uptime)}
        </span>
      </div>
      <div className="cmd-panel-body">
        <div className="cmd-health-grid">
          {/* PostgreSQL */}
          <div className="cmd-health-item">
            <div className="cmd-health-item-header">
              <span className="cmd-health-item-name">
                <Database size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                PostgreSQL
              </span>
              <HealthStatus status={db.status || 'unknown'} />
            </div>
            <div className="cmd-health-stats">
              <div className="cmd-health-stat-row">
                <span className="cmd-health-stat-key">Latency</span>
                <span className="cmd-health-stat-val">{db.latencyMs ?? '—'}ms</span>
              </div>
              <div className="cmd-health-stat-row">
                <span className="cmd-health-stat-key">Pool Total</span>
                <span className="cmd-health-stat-val">{db.totalConnections ?? '—'}</span>
              </div>
              <div className="cmd-health-stat-row">
                <span className="cmd-health-stat-key">Idle</span>
                <span className="cmd-health-stat-val">{db.idleConnections ?? '—'}</span>
              </div>
              <div className="cmd-health-stat-row">
                <span className="cmd-health-stat-key">Waiting</span>
                <span className="cmd-health-stat-val">{db.waitingRequests ?? '—'}</span>
              </div>
            </div>
          </div>

          {/* Redis */}
          <div className="cmd-health-item">
            <div className="cmd-health-item-header">
              <span className="cmd-health-item-name">
                <Wifi size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Redis
              </span>
              <HealthStatus status={redis.status || 'unknown'} />
            </div>
            <div className="cmd-health-stats">
              <div className="cmd-health-stat-row">
                <span className="cmd-health-stat-key">Latency</span>
                <span className="cmd-health-stat-val">{redis.latencyMs ?? '—'}ms</span>
              </div>
              <div className="cmd-health-stat-row">
                <span className="cmd-health-stat-key">Memory</span>
                <span className="cmd-health-stat-val">{redis.usedMemory || '—'}</span>
              </div>
              <div className="cmd-health-stat-row">
                <span className="cmd-health-stat-key">Clients</span>
                <span className="cmd-health-stat-val">{redis.connectedClients || '—'}</span>
              </div>
            </div>
          </div>

          {/* Socket.IO + Node */}
          <div className="cmd-health-item">
            <div className="cmd-health-item-header">
              <span className="cmd-health-item-name">
                <Radio size={11} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                Node / Socket.IO
              </span>
              <HealthStatus status={socketio.status || 'unknown'} />
            </div>
            <div className="cmd-health-stats">
              <div className="cmd-health-stat-row">
                <span className="cmd-health-stat-key">Sockets</span>
                <span className="cmd-health-stat-val">{socketio.connectedClients ?? '—'}</span>
              </div>
              <div className="cmd-health-stat-row">
                <span className="cmd-health-stat-key">Heap Used</span>
                <span className="cmd-health-stat-val">{mem.heapUsed ?? '—'} MB</span>
              </div>
              <div className="cmd-health-stat-row">
                <span className="cmd-health-stat-key">RSS</span>
                <span className="cmd-health-stat-val">{mem.rss ?? '—'} MB</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
