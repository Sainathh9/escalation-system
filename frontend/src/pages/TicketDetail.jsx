import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../api/api";
import Navbar from "../components/Navbar";
import "./TicketDetail.css";

export default function TicketDetail() {
  const { id } = useParams();

  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const t = await apiFetch(`/tickets/${id}`);
        const c = await apiFetch(`/tickets/${id}/comments`);
        const l = await apiFetch(`/tickets/${id}/logs`);

        if (!t.error) setTicket(t);
        if (!c.error) setComments(c);
        if (!l.error) setLogs(l);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  // ✅ ADD COMMENT FUNCTION
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    setPosting(true);

    const res = await apiFetch(`/tickets/${id}/comments`, {
      method: "POST",
      body: JSON.stringify({ comment: newComment }),
    });

    if (!res.error) {
      setComments((prev) => [...prev, res]);
      setNewComment("");
    } else {
      alert(res.error);
    }

    setPosting(false);
  };

  if (loading) return <p style={{ padding: "20px" }}>Loading...</p>;
  if (!ticket) return <p style={{ padding: "20px" }}>Ticket not found</p>;

  return (
    <>
      <Navbar />

      <div className="ticket-detail">
        {/* TITLE */}
        <h2 className="detail-title">{ticket.title}</h2>

        {/* DESCRIPTION */}
        <p className="detail-desc">{ticket.description}</p>

        {/* META */}
        <div className="meta">
          <span className="badge">{ticket.status}</span>
          <span className="badge">{ticket.severity}</span>
          <span className="badge">P{ticket.priority}</span>
        </div>

        {/* COMMENTS */}
        <div className="section">
          <h3>Comments</h3>

          {/* INPUT */}
          <div className="comment-input-box">
            <input
              type="text"
              placeholder="Write a comment..."
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />

            <button onClick={handleAddComment} disabled={posting}>
              {posting ? "Posting..." : "Add"}
            </button>
          </div>

          {/* LIST */}
          {comments.length === 0 ? (
            <p>No comments</p>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="comment">
                {c.comment}
              </div>
            ))
          )}
        </div>

        {/* LOGS */}
        <div className="section">
          <h3>Activity Logs</h3>

          {logs.length === 0 ? (
            <p>No logs</p>
          ) : (
            logs.map((l) => (
              <div key={l.id} className="log">
                <strong>{l.action}</strong> — {l.note}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}