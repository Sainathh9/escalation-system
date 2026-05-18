import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/api";
import { useAuth } from "../context/AuthContext";
import {
  X,
  Type,
  AlignLeft,
  AlertTriangle,
  ChevronUp,
  Layers,
  UserPlus,
} from "lucide-react";

export default function CreateTicketModal({ onClose }) {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [category, setCategory] = useState("General");
  const [priority, setPriority] = useState(3);
  const [assignTo, setAssignTo] = useState("");
  const [users, setUsers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await apiFetch("/tickets/users");
      if (!res.error) {
        setUsers(res.filter((u) => u.role === "Technician"));
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setSubmitting(true);
    setError("");

    const res = await apiFetch("/tickets", {
      method: "POST",
      body: JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        severity,
        category,
        priority: parseInt(priority),
      }),
    });

    if (res.error) {
      setError(res.error);
      setSubmitting(false);
      return;
    }

    // res is the unwrapped ticket object from api.js
    // If assign is selected, assign the ticket
    if (assignTo && res.id) {
      await apiFetch(`/tickets/${res.id}/assign`, {
        method: "PUT",
        body: JSON.stringify({ assigned_to: parseInt(assignTo) }),
      });
    }

    // Invalidate tickets cache instead of forcing a page reload
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-content">
            <h2 className="modal-title">Create New Ticket</h2>
            <span className="modal-subtitle">
              Report a new incident to the escalation chain
            </span>
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            id="modal-close-btn"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="login-error">{error}</div>}

            <div className="form-group">
              <label className="form-label" htmlFor="ticket-title">
                <Type size={14} />
                Title
              </label>
              <input
                id="ticket-title"
                className="form-input"
                type="text"
                placeholder="Brief description of the incident"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="ticket-description">
                <AlignLeft size={14} />
                Description
              </label>
              <textarea
                id="ticket-description"
                className="form-input"
                placeholder="Detailed description of the incident..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="ticket-severity">
                  <AlertTriangle size={14} />
                  Severity
                </label>
                <select
                  id="ticket-severity"
                  className="form-select"
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                >
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="ticket-priority">
                  <ChevronUp size={14} />
                  Priority
                </label>
                <select
                  id="ticket-priority"
                  className="form-select"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value={1}>P1 — Urgent</option>
                  <option value={2}>P2 — High</option>
                  <option value={3}>P3 — Medium</option>
                  <option value={4}>P4 — Low</option>
                  <option value={5}>P5 — Minimal</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="ticket-category">
                  <Layers size={14} />
                  Category
                </label>
                <select
                  id="ticket-category"
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="General">General</option>
                  <option value="Network">Network</option>
                  <option value="Hardware">Hardware</option>
                  <option value="Software">Software</option>
                  <option value="Security">Security</option>
                </select>
              </div>

              {/* Only Admins can assign tickets during creation */}
              {isAdmin && (
                <div className="form-group">
                  <label className="form-label" htmlFor="ticket-assign">
                    <UserPlus size={14} />
                    Assign To
                  </label>
                  <select
                    id="ticket-assign"
                    className="form-select"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                  >
                    <option value="">Unassigned</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              id="submit-ticket-btn"
            >
              {submitting ? "Creating..." : "Create Ticket"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
