import "./Navbar.css";
import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/");
  };

  return (
    <div className="navbar">
      <div className="logo" onClick={() => navigate("/dashboard")}>
        IncidentFlow
      </div>

      <div className="nav-right">
        <span
          className={`nav-item ${
            location.pathname === "/dashboard" ? "active" : ""
          }`}
          onClick={() => navigate("/dashboard")}
        >
          Dashboard
        </span>

        <span
          className={`nav-item ${
            location.pathname === "/metrics" ? "active" : ""
          }`}
          onClick={() => navigate("/metrics")}
        >
          Metrics
        </span>

        <span className="nav-item logout" onClick={logout}>
          Logout
        </span>
      </div>
    </div>
  );
}