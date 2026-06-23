import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../../../api/api.js";
import { Users } from "lucide-react";

const MAX_LOAD = 8; // Visual capacity cap for workload bar

export default function TechWorkload() {
  const { data: technicians = [] } = useQuery({
    queryKey: ['admin-tech-workload'],
    queryFn: async () => {
      const res = await apiFetch("/admin/technician-workload");
      if (res.error) throw new Error(res.error);
      return res;
    },
    refetchInterval: 30000,
    staleTime: 15000,
  });

  const getBarClass = (load) => {
    if (load >= 6) return 'cmd-tech-bar-fill--danger';
    if (load >= 3) return 'cmd-tech-bar-fill--warning';
    return 'cmd-tech-bar-fill--ok';
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="cmd-panel">
      <div className="cmd-panel-header">
        <div className="cmd-panel-title">
          <Users size={13} />
          <span>Technician Workload</span>
        </div>
        <span className="cmd-panel-badge cmd-panel-badge--info">
          {technicians.length} technician{technicians.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="cmd-panel-body">
        {technicians.length === 0 ? (
          <div className="cmd-empty">
            <Users size={20} />
            <div>No technicians registered</div>
          </div>
        ) : (
          <div className="cmd-techs">
            {technicians.map((tech) => {
              const load = tech.open_tickets || 0;
              const barPercent = Math.min((load / MAX_LOAD) * 100, 100);

              return (
                <div className="cmd-tech-card" key={tech.id}>
                  <div className="cmd-tech-header">
                    <div className="cmd-tech-avatar">
                      {getInitials(tech.name)}
                      <span className={`cmd-tech-online-dot ${tech.is_online ? 'cmd-tech-online-dot--online' : 'cmd-tech-online-dot--offline'}`}></span>
                    </div>
                    <div className="cmd-tech-info">
                      <div className="cmd-tech-name">{tech.name}</div>
                      <div className="cmd-tech-email">{tech.email}</div>
                    </div>
                  </div>

                  <div className="cmd-tech-stats">
                    <div className="cmd-tech-stat">
                      <div className="cmd-tech-stat-value">{tech.open_tickets}</div>
                      <div className="cmd-tech-stat-label">Open</div>
                    </div>
                    <div className="cmd-tech-stat">
                      <div className="cmd-tech-stat-value">{tech.in_progress}</div>
                      <div className="cmd-tech-stat-label">Active</div>
                    </div>
                    <div className="cmd-tech-stat">
                      <div className="cmd-tech-stat-value">{tech.resolved_today}</div>
                      <div className="cmd-tech-stat-label">Today</div>
                    </div>
                  </div>

                  {/* Capacity bar */}
                  <div className="cmd-tech-bar-track">
                    <div
                      className={`cmd-tech-bar-fill ${getBarClass(load)}`}
                      style={{ width: `${barPercent}%` }}
                    ></div>
                  </div>

                  {tech.sla_breached > 0 && (
                    <div style={{ fontSize: '10px', color: 'var(--status-critical)', fontWeight: 600 }}>
                      ⚠ {tech.sla_breached} SLA breach{tech.sla_breached !== 1 ? 'es' : ''}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
