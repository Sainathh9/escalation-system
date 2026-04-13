import { useEffect, useState } from "react";
import { apiFetch } from "../api/api";
import Navbar from "../components/Navbar";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";
import { Pie, Bar } from "react-chartjs-2";
import "./Metrics.css";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

export default function Metrics() {
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      const res = await apiFetch("/tickets/metrics");
      if (!res.error) setMetrics(res);
    };

    fetchMetrics();
  }, []);

  if (!metrics) return <p>Loading...</p>;

  const pieData = {
    labels: ["Open", "In Progress", "Resolved"],
    datasets: [
      {
        data: [
          metrics.status.open,
          metrics.status.in_progress,
          metrics.status.resolved,
        ],
        backgroundColor: ["#3b82f6", "#f59e0b", "#22c55e"],
      },
    ],
  };

  const barData = {
    labels: ["Low", "Medium", "High"],
    datasets: [
      {
        label: "Tickets",
        data: [
          metrics.severity.low,
          metrics.severity.medium,
          metrics.severity.high,
        ],
        backgroundColor: "#6366f1",
      },
    ],
  };

  return (
    <>
      <Navbar />

      <div className="metrics">
        <h2 className="metrics-title">Metrics Dashboard</h2>

        <div className="metrics-card">
          Total Tickets: {metrics.total}
        </div>

        <div className="metrics-card">
          Overdue Tickets: {metrics.overdue}
        </div>

        <div className="charts">
          <div className="chart-box">
            <h3>Status Distribution</h3>
            <Pie data={pieData} />
          </div>

          <div className="chart-box">
            <h3>Severity Distribution</h3>
            <Bar data={barData} />
          </div>
        </div>
      </div>
    </>
  );
}