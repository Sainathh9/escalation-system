import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <h1 className="page-title">System Settings</h1>
          <p className="page-subtitle">Configure Escalation and Global SLAs</p>
        </div>
      </div>
      
      <div className="empty-state" style={{ marginTop: '2rem' }}>
        <div className="empty-state-icon">
          <SettingsIcon size={40} />
        </div>
        <div className="empty-state-title">Settings Panel Offline</div>
        <div className="empty-state-text">
          System wide configurations are currently locked. Updates are coming soon to allow SLA modifications and ticket routing algorithms directly from this panel.
        </div>
      </div>
    </div>
  );
}
