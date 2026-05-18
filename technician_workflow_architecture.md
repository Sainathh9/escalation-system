# IncidentFlow: Technician Role Workflow Architecture

This document completely details the Technician (Agent) workflow for IncidentFlow, prioritizing rapid resolution, SLA adherence, and a streamlined "Execute & Move On" UX.

---

## 1. Full Page-by-Page Breakdown

### A. Main Layout (`MainLayout.jsx`)
The global skeleton ensuring navigation is permanently accessible but strictly limited.
*   **Sidebar (Left):** Context-aware. Only shows the `Dashboard` and `My Tickets` list.
*   **Topbar:** Profile quick-actions, global search.
*   **Main Content:** The active route viewport.

### B. Technician Dashboard (`TechnicianDashboard.jsx`)
The "War Room". This page answers: *What is about to breach SLA?*
*   **Top Bar:** "Agent Workspace" greeting. 
*   **Urgency Section (Red Alerts):** Metric cards displaying "Critical Tickets" and "Overdue Tickets".
*   **Quick Stats:** "Total Assigned", "In Progress", "Resolved Today".
*   **Urgent Queue (Table):** A filtered view of up to 5-10 tickets sorted by `SLA Deadline Ascending` -> `Priority Descending`. Contains Title, Priority Badge, SLA Timer string, and Status.

### C. My Tickets (`TicketsList.jsx`)
The primary execution backlog.
*   **Header:** Title and active filters (Status, Priority, Severity).
*   **Search:** Quick string matching for Title/Descriptions.
*   **Table:** Configured with columns: `ID`, `Title`, `Status`, `Priority`, `Severity`, `SLA Remaining`, `Last Updated`.
*   **Interactivity:** Full-row click navigation. Statuses are color-coded (Green=Resolved, Yellow=In Progress, Red=Open/Critical).

### D. Ticket Detail (`TicketDetail.jsx`)
The tactical execution screen. 70/30 split layout.
*   **Left Column (70%):** Ticket Context (Title, ID, Creator, Time). Description block. Action buttons.
    *   **Strict Actions:** If `Open`, show `Start Work` (Move to In-Progress). If `In-Progress`, show `Mark Resolved`.
    *   **Discussion:** Comments map below the main details.
*   **Right Column (30%):** Metadata and Logs.
    *   SLA Box: Highly visible red/green countdown.
    *   System Timeline: Read-only activity stream mapping exactly to `CREATED`, `ASSIGNED`, `STATUS_UPDATED` events.

---

## 2. Component Architecture

```text
src/
├── components/
│   ├── Sidebar.jsx          // Role-aware navigation hiding admin links
│   ├── Topbar.jsx           // Global search and profile
│   ├── StatusBadge.jsx      // Reusable colored pills (Open, In-Progress)
│   └── SlaTimer.jsx         // Logic-heavy component calculating "2h left"
├── pages/
│   ├── Dashboard/
│   │   ├── DashboardRouter.jsx       // Switches dashboard based on auth role
│   │   └── TechnicianDashboard.jsx   // The specific agent view
│   └── Tickets/
│       ├── TicketsList.jsx           // Table view with query filtering
│       └── TicketDetail.jsx          // 70/30 split view Action board
├── layouts/
│   └── MainLayout.jsx       // Wraps Outlet with Sidebar/Topbar
├── context/
│   └── AuthContext.jsx      // Provides `user` object carrying `.role`
└── api/
    └── api.js               // Fetch wrappers injecting JWT
```

---

## 3. React Code Examples

### A. Technician Dashboard (`TechnicianDashboard.jsx`)
```jsx
// Focuses entirely on urgency and immediate action routing
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../api/api';
import { StatusBadge, PriorityBadge } from '../../components/Badges';
import SlaTimer from '../../components/SlaTimer';

export default function TechnicianDashboard({ user }) {
  const navigate = useNavigate();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ['urgency-queue', user.id],
    queryFn: async () => {
      const res = await apiFetch(`/tickets?assigned_to=${user.id}`);
      return res.data || [];
    }
  });

  if (isLoading) return <div className="spinner" />;

  const overdue = tickets.filter(t => new Date(t.sla_deadline) < new Date() && t.status !== 'Resolved');
  const critical = tickets.filter(t => t.priority === 1 && t.status !== 'Resolved');
  const activeTickets = tickets.filter(t => t.status !== 'Resolved').sort((a,b) => new Date(a.sla_deadline) - new Date(b.sla_deadline)).slice(0, 5);

  return (
    <div className="dash-container">
      <h1 className="text-2xl font-bold">Agent Workspace</h1>
      
      {/* URGENCY SECTION */}
      <div className="grid grid-cols-3 gap-4 my-6">
        <div className="card bg-red-50 border-red-200">
          <h3 className="text-red-700">Overdue SLA</h3>
          <p className="text-3xl font-bold text-red-900">{overdue.length}</p>
        </div>
        <div className="card bg-orange-50 border-orange-200">
          <h3 className="text-orange-700">Critical Priority</h3>
          <p className="text-3xl font-bold text-orange-900">{critical.length}</p>
        </div>
        <div className="card bg-blue-50">
          <h3 className="text-blue-700">In Progress</h3>
          <p className="text-3xl font-bold text-blue-900">
            {tickets.filter(t => t.status === 'In-Progress').length}
          </p>
        </div>
      </div>

      {/* URGENT TICKETS LIST */}
      <div className="card">
        <h2 className="text-lg font-bold mb-4">Urgent Queue</h2>
        <table className="w-full text-left">
          <thead>
            <tr><th>Title</th><th>Priority</th><th>Status</th><th>SLA Remaining</th></tr>
          </thead>
          <tbody>
            {activeTickets.map(t => (
              <tr key={t.id} onClick={() => navigate(`/tickets/${t.id}`)} className="cursor-pointer hover:bg-gray-50">
                <td>{t.title}</td>
                <td><PriorityBadge priority={t.priority} /></td>
                <td><StatusBadge status={t.status} /></td>
                <td><SlaTimer deadline={t.sla_deadline} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### B. SLA Timer Component (`SlaTimer.jsx`)
```jsx
// Calculates and colors SLA visibly
export default function SlaTimer({ deadline }) {
  if (!deadline) return <span>-</span>;
  
  const diff = new Date(deadline) - new Date();
  const hours = Math.floor(diff / 3600000);
  
  if (hours < 0) return <span className="text-red-600 font-bold">Overdue by {Math.abs(hours)}h</span>;
  if (hours < 4) return <span className="text-orange-500 font-semibold">{hours}h left</span>;
  
  return <span className="text-green-600">{hours}h left</span>;
}
```

### C. Ticket Detail & State Machine (`TicketDetail.jsx`)
```jsx
// Strict UI locking preventing illegal API requests
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast'; // or any toast lib

export default function TicketDetail({ ticket }) {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (newStatus) => apiFetch(`/tickets/${ticket.id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    }),
    onSuccess: () => {
      toast.success("Status successfully updated!");
      queryClient.invalidateQueries(['ticket', ticket.id]);
    },
    onError: () => toast.error("Failed to update status")
  });

  return (
    <div className="flex gap-6">
      {/* LEFT COLUMN: 70% */}
      <div className="w-[70%] card">
        <div className="flex justify-between">
          <h1>{ticket.title}</h1>
          <StatusBadge status={ticket.status} />
        </div>
        
        {/* Strict Status Rendering Logic */}
        <div className="mt-8 pt-4 border-t border-gray-200">
          <h3 className="mb-4 text-sm uppercase text-gray-500">Actions</h3>
          {ticket.status === 'Open' && (
             <button 
               className="btn btn-warning"
               onClick={() => mutation.mutate('In-Progress')}
               disabled={mutation.isLoading}
             >
               Start Work
             </button>
          )}
          {ticket.status === 'In-Progress' && (
             <button 
               className="btn btn-success"
               onClick={() => mutation.mutate('Resolved')}
               disabled={mutation.isLoading}
             >
               Mark Resolved
             </button>
          )}
          {/* Resolved -> Closed is hidden from Technicians (Admin only) */}
        </div>
        
        {/* Comments block goes here */}
      </div>

      {/* RIGHT COLUMN: 30% */}
      <div className="w-[30%] flex flex-col gap-4">
         <div className="card bg-gray-50">
            <h3 className="font-bold mb-2">SLA Tracking</h3>
            <SlaTimer deadline={ticket.sla_deadline} />
         </div>
         <div className="card">
            <h3 className="font-bold mb-2">Activity Timeline</h3>
            {/* Map Logs Here */}
         </div>
      </div>
    </div>
  );
}
```

---

## 4. Routing Structure

```jsx
// App.jsx
<Route element={<ProtectedRoute />}>
  <Route element={<MainLayout />}>
    
    {/* DASHBOARD: Resolves dynamically based on AuthContext role */}
    <Route path="/dashboard" element={<DashboardRouter />} />
    
    {/* TICKETS: Self-filtering array based on role mappings */}
    <Route path="/tickets" element={<TicketsList />} />
    <Route path="/tickets/:id" element={<TicketDetail />} />
    
  </Route>
</Route>
```

---

## 5. API Integration Map

Powered by `@tanstack/react-query` to prevent stale data and reduce network loads.

1.  **Queue Fetching:** `GET /tickets?assigned_to={user.id}`
2.  **Detail Fetching:** `GET /tickets/:id` (returns SLA, metadata, descriptions)
3.  **State Mutation (Strict):** `PATCH /tickets/:id/status` `{ status: "In-Progress" }` (Triggers cache invalidation)
4.  **Comments / Logs:** `GET /tickets/:id/comments` and `GET /tickets/:id/logs` (Fetched independently so UI paints main context instantly).

---

## 6. State Management Logic

*   **Authentication State:** Maintained globally via `AuthContext`. Drives routing and Sidebar visibility.
*   **Server State (Tickets / Routing):** Exclusively handled by TanStack Query.
    *   If a technician updates a status via `PATCH`, `queryClient.invalidateQueries(['ticket', id])` fires. The entire component tree repaints the new Status, calculates the new valid state transitions (e.g. `Mark Resolved` appears), and auto-updates the timeline logs.
*   **Local State:** Kept minimal. Only used for typed queries in the Search Bar (`useState('searchString')`) and Pagination (`useState(1)`).

---

## 7. How Ticket Flow is Enforced in UI

1.  **Sidebar Restrictions:** Technicians never see a "Metrics & Users" or "Settings" link. They only see `My Dashboard` and `All Tickets`.
2.  **Dashboard Tunneling:** The Technician Dashboard completely isolates them from the noise of unassigned or non-critical issues. The UI forces them to look at `overdue > critical > active` assignments.
3.  **Status State Machine:** `TicketDetail.jsx` uses hardcoded condition blocks representing a Directed Acyclic Graph (DAG):
    *   If current system state = `Open`, output = `Start Work` button.
    *   If current system state = `In-Progress`, output = `Mark Resolved` button.
    *   If current system state = `Resolved`, output = *Null (Locked. Awaiting admin closure).*
4.  **No Backdoors:** The frontend simply hides the button to assign tickets (`PATCH /tickets/:id/assign`). Only `Admin` roles render the assignment dropdown.

---
*This architecture implements a fast loop: `Login -> Urgent Queue -> Start Work -> Resolve -> Return to Queue`, stripping all friction away from the execution unit.*
