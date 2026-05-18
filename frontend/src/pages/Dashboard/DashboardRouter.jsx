import { useAuth } from "../../context/AuthContext";
import AdminDashboard from "./AdminDashboard.jsx";
import TechnicianDashboard from "./TechnicianDashboard.jsx";
import UserDashboard from "./UserDashboard.jsx";

export default function DashboardRouter() {
  const { user } = useAuth();

  if (!user) return null;

  switch (user.role) {
    case "Admin":
      return <AdminDashboard />;
    case "Technician":
      return <TechnicianDashboard />;
    case "User":
    default:
      return <UserDashboard />;
  }
}
