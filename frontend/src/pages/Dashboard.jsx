import { useEffect, useState } from "react";
import { apiFetch } from "../api/api";
import TicketCard from "../components/TicketCard";
import Navbar from "../components/Navbar";
import "./Dashboard.css";

export default function Dashboard() {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);

      const res = await apiFetch(
        `/tickets?search=${search}&status=${statusFilter}&page=${page}&limit=5`
      );

      if (!res.error) {
        setTickets(res.data);
        setTotalPages(res.pagination.totalPages);
      }

      setLoading(false);
    };

    fetchTickets();
  }, [search, statusFilter, page]);

  if (loading) return <p style={{ padding: "20px" }}>Loading...</p>;

  return (
    <>
      <Navbar />

      <div className="dashboard">
        <h2 className="dashboard-title">Tickets</h2>

        {/* 🔍 SEARCH */}
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1); // reset page
            }}
          />
        </div>

        {/* 🎯 FILTER */}
        <div className="filter-bar">
          <select
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Tickets</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>
        </div>

        {/* 📄 TICKETS */}
        {tickets.length === 0 ? (
          <p>No tickets found</p>
        ) : (
          tickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))
        )}

        {/* 📄 PAGINATION */}
        <div className="pagination">
          <button
            disabled={page === 1}
            onClick={() => setPage((prev) => prev - 1)}
          >
            Prev
          </button>

          <span>
            Page {page} of {totalPages}
          </span>

          <button
            disabled={page === totalPages}
            onClick={() => setPage((prev) => prev + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </>
  );
}