import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../../api/api.js";
import { 
  FileText, 
  AlertTriangle, 
  HelpCircle, 
  Layers, 
  Sparkles, 
  CheckCircle,
  Clock
} from "lucide-react";

export default function PortalIncidentForm({ onSuccess }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [category, setCategory] = useState("General");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const severityMetadata = {
    Critical: {
      label: "Critical (P1)",
      desc: "Core client-facing system is completely down. Business operations halted (e.g., checkout offline, platform unreachable).",
      sla: "Target Response: < 6 seconds (Immediate Escalation)",
      color: "#ef4444"
    },
    High: {
      label: "High (P2)",
      desc: "Critical service severely degraded or backup in use. High latency, core functionality impacted for multiple users.",
      sla: "Target Response: 2 minutes",
      color: "#f97316"
    },
    Medium: {
      label: "Medium (P3)",
      desc: "Minor service disruption or partial outage. Non-critical tools degraded; workable workaround exists.",
      sla: "Target Response: 3 minutes",
      color: "#f59e0b"
    },
    Low: {
      label: "Low (P4)",
      desc: "General inquiry, cosmetic bug, or minor enhancement request. Business operations unaffected.",
      sla: "Target Response: 4 minutes",
      color: "#22c55e"
    }
  };

  const priorityMap = {
    Critical: 1,
    High: 2,
    Medium: 3,
    Low: 4
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError("Please provide a short summary of the issue.");
      return;
    }
    if (!description.trim()) {
      setError("Please describe the incident in detail so we can help quickly.");
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
        priority: priorityMap[severity]
      })
    });

    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    // Reset Form
    setTitle("");
    setDescription("");
    setSeverity("Medium");
    setCategory("General");

    // Invalidate react-query cache to refresh list
    queryClient.invalidateQueries({ queryKey: ["user-dashboard-tickets"] });
    
    if (onSuccess) {
      onSuccess(res);
    }
  };

  return (
    <div className="portal-form-card">
      <div className="portal-form-header">
        <div className="portal-icon-container">
          <Sparkles size={16} className="text-accent" />
        </div>
        <div>
          <h2 className="portal-form-title">Report a New Incident</h2>
          <p className="portal-form-subtitle">Need technical help? Submit a ticket into our live escalation chain.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="portal-form">
        {error && (
          <div className="portal-form-alert error">
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* Title */}
        <div className="portal-field-group">
          <label className="portal-label" htmlFor="inc-title">
            <FileText size={13} />
            Short Summary
          </label>
          <input
            id="inc-title"
            type="text"
            className="portal-input"
            placeholder="e.g. Can't access corporate staging repository"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={submitting}
          />
          <span className="portal-help-text">Keep it brief and descriptive.</span>
        </div>

        {/* Category */}
        <div className="portal-field-group">
          <label className="portal-label" htmlFor="inc-category">
            <Layers size={13} />
            Service Category
          </label>
          <select
            id="inc-category"
            className="portal-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={submitting}
          >
            <option value="General">General / Other Support</option>
            <option value="Network">Network & VPN Connectivity</option>
            <option value="Hardware">Corporate Hardware & Provisioning</option>
            <option value="Software">Software & Cloud Applications</option>
            <option value="Security">Security & Access Management</option>
          </select>
        </div>

        {/* Severity Explainer Cards */}
        <div className="portal-field-group">
          <label className="portal-label">
            <AlertTriangle size={13} />
            Impact Severity
          </label>
          <div className="portal-severity-grid">
            {Object.keys(severityMetadata).map((sev) => {
              const meta = severityMetadata[sev];
              const isSelected = severity === sev;
              return (
                <div
                  key={sev}
                  className={`portal-severity-card ${isSelected ? "selected" : ""}`}
                  style={{ "--border-glow": meta.color }}
                  onClick={() => setSeverity(sev)}
                >
                  <div className="portal-severity-header">
                    <span 
                      className="portal-severity-dot" 
                      style={{ backgroundColor: meta.color }}
                    />
                    <span className="portal-severity-label">{meta.label}</span>
                  </div>
                  <p className="portal-severity-desc">{meta.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* SLA Information Box */}
        <div className="portal-sla-indicator">
          <Clock size={14} className="text-secondary" />
          <div>
            <span className="portal-sla-title">Expected SLA Target</span>
            <span className="portal-sla-value" style={{ color: severityMetadata[severity].color }}>
              {severityMetadata[severity].sla}
            </span>
          </div>
        </div>

        {/* Description */}
        <div className="portal-field-group">
          <label className="portal-label" htmlFor="inc-desc">
            <HelpCircle size={13} />
            Detailed Description
          </label>
          <textarea
            id="inc-desc"
            className="portal-textarea"
            placeholder="Please detail steps to reproduce, error messages, and what steps you've already attempted..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={submitting}
            rows={4}
          />
        </div>

        <button 
          type="submit" 
          className="portal-submit-btn" 
          disabled={submitting}
        >
          {submitting ? (
            <>
              <div className="portal-spinner"></div>
              Submitting Incident...
            </>
          ) : (
            <>
              <CheckCircle size={15} />
              Submit Live Ticket
            </>
          )}
        </button>
      </form>
    </div>
  );
}
