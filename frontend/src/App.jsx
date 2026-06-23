import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login.jsx";
import DashboardRouter from "./pages/Dashboard/DashboardRouter.jsx";
import TicketsList from "./pages/Tickets/TicketsList.jsx";
import TicketDetail from "./pages/TicketDetail.jsx";
import UsersList from "./pages/UsersList.jsx";
import Settings from "./pages/Settings.jsx";
import AuditLogPage from "./pages/AuditLogPage.jsx";
import { ProtectedRoute, RoleRoute } from "./routes/ProtectedRoutes.jsx";
import MainLayout from "./layouts/MainLayout.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { SocketProvider } from "./context/SocketContext.jsx";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* Public Route */}
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* Protected Routes utilizing MainLayout via Outlet */}
            <Route element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route path="/tickets" element={<TicketsList />} />
                <Route path="/tickets/:id" element={<TicketDetail />} />
                <Route path="/dashboard" element={<DashboardRouter />} />

                {/* General routing map:
                    - Everyone gets Dashboard, but it proxies to different component via DashboardRouter
                    - Everyone gets Tickets, but TicketsList loads default filters (e.g. only "My Tickets" for user)
                */}

                {/* Admin Only Routes */}
                <Route element={<RoleRoute allowedRoles={["Admin"]} />}>
                  <Route path="/users" element={<UsersList />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/admin/audit-logs" element={<AuditLogPage />} />
                </Route>
              </Route>
            </Route>
            
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
