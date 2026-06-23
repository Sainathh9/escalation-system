import { useState } from "react";
import { apiFetch } from "../../../api/api.js";
import { useQueryClient } from "@tanstack/react-query";
import { Star, CheckCircle, Smile, MessageSquare } from "lucide-react";

export default function PortalFeedback({ ticketId, onClose }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    // Create a special formatted feedback comment
    const starStr = "★".repeat(rating) + "☆".repeat(5 - rating);
    const feedbackComment = `[FEEDBACK SURVEY] Rating: ${rating}/5 ${starStr}\nUser Remarks: ${remarks.trim() || "No additional comments provided."}`;

    const res = await apiFetch(`/tickets/${ticketId}/comments`, {
      method: "POST",
      body: JSON.stringify({ comment: feedbackComment })
    });

    setSubmitting(false);

    if (res.error) {
      setError(res.error);
      return;
    }

    setSubmitted(true);
    
    // Invalidate queries to update chat and list states
    queryClient.invalidateQueries({ queryKey: ["ticket-comments", ticketId] });
    queryClient.invalidateQueries({ queryKey: ["user-dashboard-tickets"] });

    setTimeout(() => {
      if (onClose) onClose();
    }, 2500);
  };

  if (submitted) {
    return (
      <div className="portal-feedback-card submitted">
        <div className="portal-feedback-success-icon animate-bounce">
          <Smile size={32} className="text-status-resolved" />
        </div>
        <h4 className="portal-feedback-thanks">Thank you for your feedback!</h4>
        <p className="portal-feedback-thanks-sub">Your rating helps us improve support quality and reward our technicians.</p>
      </div>
    );
  }

  return (
    <div className="portal-feedback-card">
      <div className="portal-feedback-header">
        <CheckCircle size={16} className="text-status-resolved" />
        <h4 className="portal-feedback-title">Rate Your Support Experience</h4>
      </div>
      <p className="portal-feedback-desc">
        Our technician has marked this incident as **Resolved**. Please take 10 seconds to share your feedback.
      </p>

      <form onSubmit={handleSubmit} className="portal-feedback-form">
        {error && <div className="portal-form-alert error">{error}</div>}

        {/* Star Rating Selector */}
        <div className="portal-rating-selector">
          {[1, 2, 3, 4, 5].map((val) => {
            const isActive = (hoverRating || rating) >= val;
            return (
              <button
                key={val}
                type="button"
                className={`portal-star-btn ${isActive ? "active" : ""}`}
                onClick={() => setRating(val)}
                onMouseEnter={() => setHoverRating(val)}
                onMouseLeave={() => setHoverRating(0)}
              >
                <Star size={24} fill={isActive ? "currentColor" : "none"} />
              </button>
            );
          })}
          <span className="portal-rating-text-hint">
            {rating === 5 && "Excellent (5/5)"}
            {rating === 4 && "Very Good (4/5)"}
            {rating === 3 && "Satisfactory (3/5)"}
            {rating === 2 && "Poor (2/5)"}
            {rating === 1 && "Very Poor (1/5)"}
          </span>
        </div>

        {/* Remarks */}
        <div className="portal-field-group">
          <label className="portal-label" htmlFor="feedback-remarks">
            <MessageSquare size={12} />
            Optional Remarks
          </label>
          <textarea
            id="feedback-remarks"
            className="portal-textarea"
            placeholder="Tell us what went well or how we can improve..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
          />
        </div>

        <div className="portal-feedback-actions">
          <button
            type="submit"
            className="portal-feedback-submit-btn"
            disabled={submitting}
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>
        </div>
      </form>
    </div>
  );
}
