import { Users as UsersIcon } from "lucide-react";

export default function UsersList() {
  return (
    <div className="dash">
      <div className="dash-header">
        <div>
          <h1 className="page-title">Users & Metrics</h1>
          <p className="page-subtitle">Manage system users and view detailed metrics (Placeholder)</p>
        </div>
      </div>
      
      <div className="empty-state" style={{ marginTop: '2rem' }}>
        <div className="empty-state-icon">
          <UsersIcon size={40} />
        </div>
        <div className="empty-state-title">User Management Coming Soon</div>
        <div className="empty-state-text">
          This section is currently under construction. Future updates will include user roles configuration, metric exports, and team management tracking.
        </div>
      </div>
    </div>
  );
}
