import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { API_EVENTS } from "../config";

const API = API_EVENTS;

const STATUS_COLORS = {
  draft: { bg: "#f3f4f6", color: "#6b7280" },
  published: { bg: "#dbeafe", color: "#1d4ed8" },
  ongoing: { bg: "#dcfce7", color: "#15803d" },
  completed: { bg: "#e0e7ff", color: "#4338ca" },
  closed: { bg: "#fee2e2", color: "#991b1b" },
};

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const headers = { "x-auth-token": token };

  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      axios.get(`${API}/my`, { headers }),
      axios.get(`${API}/my/analytics`, { headers }),
    ])
      .then(([evRes, anRes]) => {
        setEvents(evRes.data);
        setAnalytics(anRes.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const fmt = (d) => (d ? new Date(d).toLocaleDateString() : "—");

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2>Organizer Dashboard</h2>

      {/* Analytics Summary */}
      {analytics && analytics.completedEvents > 0 && (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: 12, marginBottom: 24,
        }}>
          {[
            { label: "Completed Events", value: analytics.completedEvents },
            { label: "Total Registrations", value: analytics.totalRegistrations },
            { label: "Revenue", value: `₹${analytics.totalRevenue}` },
            { label: "Merch Sold", value: analytics.totalMerchSold },
          ].map((s) => (
            <div key={s.label} style={{
              background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10,
              padding: 16, textAlign: "center",
            }}>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#2563eb" }}>{s.value}</p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#6b7280" }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Events Carousel / Card Grid */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0 }}>My Events ({events.length})</h3>
        <button
          onClick={() => navigate("/organizer/create-event")}
          style={{
            padding: "8px 20px", background: "#2563eb", color: "#fff",
            border: "none", borderRadius: 6, cursor: "pointer", fontWeight: 600,
          }}
        >
          + New Event
        </button>
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign: "center", color: "#888", padding: 40 }}>
          <p>No events yet. Create your first event to get started!</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {events.map((ev) => {
            const sc = STATUS_COLORS[ev.status] || STATUS_COLORS.draft;
            return (
              <div
                key={ev._id}
                onClick={() => navigate(`/organizer/event/${ev._id}`)}
                style={{
                  border: "1px solid #e5e7eb", borderRadius: 10,
                  padding: 16, cursor: "pointer", background: "#fff",
                  transition: "box-shadow .15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 10px rgba(0,0,0,.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
              >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <h4 style={{ margin: 0, fontSize: 15, flex: 1, marginRight: 8 }}>{ev.name}</h4>
                  <span style={{
                    fontSize: 11, padding: "3px 10px", borderRadius: 12,
                    background: sc.bg, color: sc.color, fontWeight: 600,
                    textTransform: "capitalize", whiteSpace: "nowrap",
                  }}>
                    {ev.status || "draft"}
                  </span>
                </div>

                {/* Badges */}
                <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 10,
                    background: ev.eventType === "merchandise" ? "#fef3c7" : "#dbeafe",
                    color: ev.eventType === "merchandise" ? "#92400e" : "#1e40af",
                  }}>
                    {ev.eventType}
                  </span>
                  <span style={{
                    fontSize: 11, padding: "2px 8px", borderRadius: 10,
                    background: "#f3f4f6", color: "#555",
                  }}>
                    {ev.eligibility === "iiit_only" ? "IIIT Only" : "All"}
                  </span>
                </div>

                {/* Info rows */}
                <div style={{ fontSize: 12, color: "#666", lineHeight: 1.8 }}>
                  <div>Start: {fmt(ev.startDate)}</div>
                  {ev.registrationDeadline && <div>Deadline: {fmt(ev.registrationDeadline)}</div>}
                  <div>Fee: {ev.registrationFee ? `₹${ev.registrationFee}` : "Free"}</div>
                  <div>Registrations: {ev.registrationCount || 0}{ev.registrationLimit > 0 ? ` / ${ev.registrationLimit}` : ""}</div>
                </div>

                {/* Tags */}
                {ev.tags && ev.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
                    {ev.tags.slice(0, 3).map((t) => (
                      <span key={t} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 8, background: "#e0e7ff", color: "#4338ca" }}>
                        {t}
                      </span>
                    ))}
                    {ev.tags.length > 3 && (
                      <span style={{ fontSize: 10, color: "#888" }}>+{ev.tags.length - 3}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
