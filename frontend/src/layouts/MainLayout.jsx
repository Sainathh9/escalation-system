import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import Topbar from "../components/Topbar.jsx";
import CreateTicketModal from "../components/CreateTicketModal.jsx";

export default function MainLayout() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main-area">
        <Topbar onCreateTicket={() => setShowCreateModal(true)} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>

      {showCreateModal && (
        <CreateTicketModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}
