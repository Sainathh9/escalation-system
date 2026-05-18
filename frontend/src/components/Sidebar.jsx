import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Ticket,
  LogOut,
  ChevronRight,
  Settings,
  Users,
  Briefcase
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase()
    : "U";

  // Role-based Navigation
  const navItems = [];

  // DASHBOARD is available for everyone now, but its content changes
  navItems.push({
    label: user?.role === "Technician" ? "My Dashboard" : "Dashboard",
    path: "/dashboard",
    icon: <LayoutDashboard size={16} />,
  });

  // TICKETS based on role
  if (user?.role === "Admin") {
    navItems.push({
      label: "All Tickets",
      path: "/tickets",
      icon: <Ticket size={16} />,
    });
    navItems.push({
      label: "Assign Tickets",
      path: "/tickets?assigned=unassigned", // Assuming frontend handles this query param
      icon: <Briefcase size={16} />,
    });
    navItems.push({
      label: "Metrics & Users",
      path: "/users",
      icon: <Users size={16} />,
    });
    navItems.push({
      label: "Settings",
      path: "/settings",
      icon: <Settings size={16} />,
    });
  } else if (user?.role === "Technician") {
    navItems.push({
      label: "My Tickets (Assigned)",
      path: `/tickets?assigned_to=${user.id}`, // Custom default view
      icon: <Ticket size={16} />,
    });
  } else {
    // Standard User
    navItems.push({
      label: "My Tickets",
      path: "/tickets",
      icon: <Ticket size={16} />,
    });
  }

  const isActive = (path) => {
    const basePath = path.split("?")[0];
    const pathSearch = path.split("?")[1] || "";
    // If paths mismatch, entirely false
    if (location.pathname !== basePath) return false;
    
    // If the nav item expects a specific query string, strictly match it
    if (pathSearch) {
      if (!location.search.includes(pathSearch)) return false;
    } else {
      // If the nav item is just the base path but we currently HAVE a query string (e.g. assigned=unassigned), 
      // don't mark the generic one as active to avoid double highlighting.
      if (location.search && basePath === "/tickets") return false;
    }
    
    return true;
  };

  return (
    <aside className="sidebar">
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-logo">IF</div>
        <span className="sidebar-brand">IncidentFlow</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <div className="sidebar-section-label">Main</div>
        {navItems.map((item, idx) => (
          <div
            key={idx}
            className={`sidebar-link ${isActive(item.path) ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}

        <div className="sidebar-section-label" style={{ marginTop: "auto", paddingTop: "16px" }}>
          Account
        </div>
        <div className="sidebar-link" onClick={logout}>
          <LogOut size={16} />
          <span>Logout</span>
        </div>
      </nav>

      {/* User Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.name || "User"}</div>
            <div className="sidebar-user-role">{user?.role || "User"}</div>
          </div>
          <ChevronRight size={14} style={{ color: "var(--text-tertiary)" }} />
        </div>
      </div>
    </aside>
  );
}
