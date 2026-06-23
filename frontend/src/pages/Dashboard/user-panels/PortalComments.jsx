import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../../../api/api.js";
import { useAuth } from "../../../context/AuthContext.jsx";
import { useSocketEvent } from "../../../hooks/useSocketEvent.js";
import { Send, MessageSquare, Shield, Wrench, User } from "lucide-react";

export default function PortalComments({ ticketId }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [commentText, setCommentText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef(null);

  // 1️⃣ Fetch comments for this ticket
  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["ticket-comments", ticketId],
    queryFn: async () => {
      const res = await apiFetch(`/tickets/${ticketId}/comments`);
      if (res.error) throw new Error(res.error);
      return res || [];
    },
    staleTime: 10000
  });

  // 2️⃣ Live Updates: Listen for comment additions on this ticket
  useSocketEvent("comment:added", (payload) => {
    // payload shape from backend: { ticketId, comment: { id, ticket_id, author_id, comment, created_at, author_name, author_role } }
    const payloadTicketId = parseInt(payload.ticketId || (payload.comment && payload.comment.ticket_id));
    if (payloadTicketId === parseInt(ticketId)) {
      queryClient.invalidateQueries({ queryKey: ["ticket-comments", ticketId] });
    }
  });

  // Auto scroll to bottom when comments list updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setSubmitting(true);
    const res = await apiFetch(`/tickets/${ticketId}/comments`, {
      method: "POST",
      body: JSON.stringify({ comment: commentText.trim() })
    });
    setSubmitting(false);

    if (!res.error) {
      setCommentText("");
      queryClient.invalidateQueries({ queryKey: ["ticket-comments", ticketId] });
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case "Admin":
        return <Shield size={10} className="text-status-critical" />;
      case "Technician":
        return <Wrench size={10} className="text-accent" />;
      default:
        return <User size={10} className="text-secondary" />;
    }
  };

  const formatCommentTime = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="portal-comments-card">
      <div className="portal-comments-header">
        <MessageSquare size={14} className="text-accent" />
        <span className="portal-comments-title">Incident Chat & Activity</span>
      </div>

      {/* Chat Bubble Area */}
      <div className="portal-chat-area" ref={scrollRef}>
        {isLoading ? (
          <div className="portal-chat-loading">
            <div className="portal-spinner"></div>
            <span>Loading discussion...</span>
          </div>
        ) : comments.length === 0 ? (
          <div className="portal-chat-empty">
            <MessageSquare size={24} className="text-tertiary" />
            <p>No messages yet. Send a note to the assigned technician.</p>
          </div>
        ) : (
          <div className="portal-chat-stream">
            {comments.map((c) => {
              const isMe = parseInt(c.author_id) === parseInt(user.id);
              const authorRole = c.author_role || "User";
              const authorName = c.author_name || (isMe ? "You" : "User");

              return (
                <div key={c.id} className={`portal-chat-bubble-row ${isMe ? "me" : "them"}`}>
                  <div className="portal-chat-bubble-wrap">
                    {/* Meta info */}
                    <div className="portal-chat-meta">
                      <span className="portal-chat-author">{authorName}</span>
                      <span className="portal-chat-role-badge">
                        {getRoleIcon(authorRole)}
                        <span>{authorRole}</span>
                      </span>
                    </div>

                    {/* Bubble */}
                    <div className={`portal-chat-bubble ${authorRole.toLowerCase()}`}>
                      <p className="portal-chat-text">{c.comment}</p>
                      <span className="portal-chat-time">{formatCommentTime(c.created_at)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Message Input Box */}
      <form onSubmit={handleSubmit} className="portal-chat-input-bar">
        <input
          type="text"
          className="portal-chat-input"
          placeholder="Ask for an update, provide extra logs..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          disabled={submitting}
        />
        <button type="submit" className="portal-chat-send-btn" disabled={submitting || !commentText.trim()}>
          <Send size={14} />
        </button>
      </form>
    </div>
  );
}
