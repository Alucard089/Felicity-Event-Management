import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { API_REGISTRATIONS } from "../config";

const API_REG = API_REGISTRATIONS;

const TABS = ["Upcoming", "Normal", "Merchandise", "Completed", "Cancelled"];

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");
  const headers = { "x-auth-token": token };

  const [registrations, setRegistrations] = useState([]);
  const [activeTab, setActiveTab] = useState("Upcoming");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRegistrations();
  }, []);

  const fetchRegistrations = async () => {
    try {
      const res = await axios.get(API_REG, { headers });
      setRegistrations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();

  const filtered = registrations.filter((reg) => {
    if (!reg.event) return false;
    const start = new Date(reg.event.startDate);
    const end = reg.event.endDate ? new Date(reg.event.endDate) : start;

    switch (activeTab) {
      case "Upcoming":
        return reg.status === "confirmed" && start > now;
      case "Normal":
        return reg.event.eventType === "normal" && reg.status === "confirmed";
      case "Merchandise":
        return reg.event.eventType === "merchandise" && reg.status === "confirmed";
      case "Completed":
        return reg.status === "confirmed" && end < now;
      case "Cancelled":
        return reg.status === "cancelled" || reg.status === "rejected";
      default:
        return true;
    }
  });

  const fmt = (d) => d ? new Date(d).toLocaleString() : "—";

  const tabStyle = (t) => ({
    padding: "8px 18px",
    border: "none",
    borderBottom: activeTab === t ? "3px solid #4f46e5" : "3px solid transparent",
    background: "none",
    cursor: "pointer",
    fontWeight: activeTab === t ? 600 : 400,
    color: activeTab === t ? "#4f46e5" : "#666",
    fontSize: 14,
  });

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2>My Events Dashboard</h2>
      <p style={{ color: "#666", marginBottom: 20 }}>
        Welcome back, <strong>{user.firstName || user.name}</strong>!
      </p>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #e5e7eb", marginBottom: 20 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} style={tabStyle(t)}>
            {t}
            {t === "Upcoming" && (
              <span style={{ marginLeft: 6, fontSize: 12, background: "#e0e7ff", color: "#4338ca", padding: "2px 6px", borderRadius: 10 }}>
                {registrations.filter((r) => r.event && r.status === "confirmed" && new Date(r.event.startDate) > now).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Event Records */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "#999", padding: 40 }}>
          <p>No events found in this category.</p>
          {activeTab === "Upcoming" && (
            <button
              onClick={() => navigate("/browse")}
              style={{ marginTop: 12, padding: "8px 24px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
            >
              Browse Events
            </button>
          )}
        </div>
      ) : (
        <div>
          {filtered.map((reg) => (
            <div
              key={reg._id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 16,
                marginBottom: 12,
                background: reg.status === "cancelled" ? "#fef2f2" : "#fff",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <h4 style={{ margin: 0 }}>
                    <span
                      style={{ cursor: "pointer", color: "#4f46e5" }}
                      onClick={() => navigate(`/events/${reg.event._id}`)}
                    >
                      {reg.event.name}
                    </span>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 10, marginLeft: 8,
                      background: reg.event.eventType === "merchandise" ? "#f59e0b" : "#3b82f6",
                      color: "#fff",
                    }}>
                      {reg.event.eventType}
                    </span>
                    {reg.status === "cancelled" && (
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, marginLeft: 6, background: "#ef4444", color: "#fff" }}>
                        Cancelled
                      </span>
                    )}
                    {reg.status === "rejected" && (
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, marginLeft: 6, background: "#dc2626", color: "#fff" }}>
                        Rejected
                      </span>
                    )}
                  </h4>

                  <div style={{ fontSize: 13, color: "#555", marginTop: 6, display: "flex", flexWrap: "wrap", gap: 16 }}>
                    <span>Organizer: {reg.event.organizer?.name || "—"}</span>
                    <span>Start: {fmt(reg.event.startDate)}</span>
                    {reg.event.endDate && <span>End: {fmt(reg.event.endDate)}</span>}
                  </div>

                  {reg.teamName && (
                    <p style={{ fontSize: 13, color: "#555", margin: "4px 0 0" }}>
                      Team: {reg.teamName}
                    </p>
                  )}

                  {reg.event.eventType === "merchandise" && reg.quantity && (
                    <p style={{ fontSize: 13, color: "#555", margin: "4px 0 0" }}>
                      Quantity: {reg.quantity}
                    </p>
                  )}
                </div>

                <div style={{ textAlign: "right" }}>
                  <span
                    style={{
                      cursor: "pointer",
                      color: "#4f46e5",
                      fontSize: 13,
                      textDecoration: "underline",
                    }}
                    onClick={() => navigate(`/events/${reg.event._id}?ticket=${reg.ticketId}`)}
                  >
                    {reg.ticketId}
                  </span>
                  <p style={{ fontSize: 11, color: "#aaa", margin: "4px 0 0" }}>
                    {fmt(reg.createdAt)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
