import { Search, Plus, Shield } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import NotificationBell from "./NotificationBell.jsx";

export default function Topbar({ onCreateTicket }) {
  const { user } = useAuth();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "U";

  const roleBadgeClass =
    user?.role === "Admin"
      ? "role-badge-admin"
      : user?.role === "Technician"
      ? "role-badge-tech"
      : "role-badge-user";

  return (
    <header className="topbar">
      <div className="topbar-left">
        <div className="topbar-search">
          <span className="topbar-search-icon">
            <Search size={14} />
          </span>
          <input
            type="text"
            placeholder="Search incidents..."
            id="global-search"
          />
        </div>
      </div>

      <div className="topbar-right">
        {/* Only Admins and Users create tickets from topbar */}
        {(user?.role === "Admin" || user?.role === "User") && (
          <button className="btn btn-primary" onClick={onCreateTicket} id="create-ticket-btn">
            <Plus size={14} />
            New Ticket
          </button>
        )}

        {/* Live notification bell with dropdown panel */}
        <NotificationBell />

        <div className="topbar-user-group">
          <div className="topbar-avatar" id="user-avatar">
            {initials}
          </div>
          <span className={`topbar-role-badge ${roleBadgeClass}`}>
            {user?.role === "Admin" && <Shield size={10} />}
            {user?.role || "User"}
          </span>
        </div>
      </div>
    </header>
  );
}
