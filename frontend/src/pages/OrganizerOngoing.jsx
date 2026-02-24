import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { API_EVENTS } from "../config";

const API = API_EVENTS;

export default function OrganizerOngoing() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/my`, { headers: { "x-auth-token": token } });
        setEvents(res.data.filter((e) => e.status === "ongoing"));
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
      <h2 style={{ marginBottom: 16 }}>Ongoing Events</h2>
      {events.length === 0 ? (
        <p style={{ color: "#888", textAlign: "center", padding: 30 }}>No ongoing events right now.</p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
          {events.map((ev) => (
            <div
              key={ev._id}
              onClick={() => navigate(`/organizer/event/${ev._id}`)}
              style={{
                border: "1px solid #e5e7eb", borderRadius: 10, padding: 16,
                cursor: "pointer", background: "#fff", transition: "box-shadow .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              <h3 style={{ margin: 0, fontSize: 16 }}>{ev.name}</h3>
              <p style={{ margin: "6px 0 0", fontSize: 13, color: "#555" }}>
                <strong>Type:</strong> {ev.eventType} &nbsp;|&nbsp;
                <strong>Registrations:</strong> {ev.registrationCount ?? 0}{ev.registrationLimit > 0 ? `/${ev.registrationLimit}` : ""}
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 12, color: "#888" }}>
                {ev.startDate ? new Date(ev.startDate).toLocaleDateString() : ""} – {ev.endDate ? new Date(ev.endDate).toLocaleDateString() : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
