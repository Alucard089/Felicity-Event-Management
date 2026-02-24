import { useState, useEffect } from "react";
import axios from "axios";

import { API_ADMIN } from "../config";

const API = API_ADMIN;

export default function AdminDashboard() {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const headers = { "x-auth-token": token };

  const [stats, setStats] = useState({ total: 0, active: 0, disabled: 0, resetRequests: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [orgRes, resetRes] = await Promise.all([
          axios.get(`${API}/organizers`, { headers }),
          axios.get(`${API}/reset-requests`, { headers, params: { status: "pending" } }),
        ]);
        const orgs = orgRes.data;
        setStats({
          total: orgs.length,
          active: orgs.filter((o) => o.active !== false).length,
          disabled: orgs.filter((o) => o.active === false).length,
          resetRequests: resetRes.data.length,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2>Admin Dashboard</h2>
      <p style={{ color: "#666" }}>Welcome, <strong>{user.email}</strong></p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginTop: 20 }}>
        {[
          { label: "Total Organizers", value: stats.total, color: "#2563eb" },
          { label: "Active", value: stats.active, color: "#059669" },
          { label: "Disabled", value: stats.disabled, color: "#dc2626" },
          { label: "Reset Requests", value: stats.resetRequests, color: "#f59e0b" },
        ].map((s) => (
          <div key={s.label} style={{
            border: "1px solid #e5e7eb", borderRadius: 10, padding: 20, textAlign: "center", background: "#fff",
          }}>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</p>
            <p style={{ margin: "6px 0 0", fontSize: 13, color: "#6b7280" }}>{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
