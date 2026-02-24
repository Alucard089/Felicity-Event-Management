import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { API_EVENTS } from "../config";

const API = API_EVENTS;

export default function BrowseEvents() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const headers = { "x-auth-token": token };

  const [events, setEvents] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [eventType, setEventType] = useState("all");
  const [eligibility, setEligibility] = useState("all");
  const [startAfter, setStartAfter] = useState("");
  const [startBefore, setStartBefore] = useState("");
  const [followedOnly, setFollowedOnly] = useState(false);

  useEffect(() => {
    fetchTrending();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [search, eventType, eligibility, startAfter, startBefore, followedOnly]);

  const fetchEvents = async () => {
    try {
      const params = {};
      if (search) params.search = search;
      if (eventType !== "all") params.eventType = eventType;
      if (eligibility !== "all") params.eligibility = eligibility;
      if (startAfter) params.startAfter = startAfter;
      if (startBefore) params.startBefore = startBefore;
      if (followedOnly) params.followedClubs = "true";

      const res = await axios.get(API, { headers, params });
      setEvents(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrending = async () => {
    try {
      const res = await axios.get(`${API}/trending`, { headers });
      setTrending(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString() : "—";
  const now = new Date();

  const selectStyle = { padding: 6, borderRadius: 4, border: "1px solid #ccc", fontSize: 13 };

  return (
    <div>
      <h2>Browse Events</h2>

      {/* Trending Section */}
      {trending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, color: "#4f46e5", marginBottom: 8 }}>
            Trending (Top {trending.length} in last 24h)
          </h3>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8 }}>
            {trending.map((ev) => (
              <div
                key={ev._id}
                onClick={() => navigate(`/events/${ev._id}`)}
                style={{
                  minWidth: 200, padding: 12, borderRadius: 8,
                  border: "2px solid #e0e7ff", background: "#f5f3ff",
                  cursor: "pointer", flexShrink: 0,
                }}
              >
                <h4 style={{ margin: 0, fontSize: 14 }}>{ev.name}</h4>
                <p style={{ fontSize: 12, color: "#666", margin: "4px 0" }}>
                  {ev.organizer?.name || "—"}
                </p>
                <p style={{ fontSize: 12, color: "#4f46e5", margin: 0 }}>
                  {ev.trendingCount} registration{ev.trendingCount !== 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div style={{ marginBottom: 16, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <input
          placeholder="Search events or organizers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 200, padding: 8, borderRadius: 6, border: "1px solid #ccc", fontSize: 14 }}
        />
        <select value={eventType} onChange={(e) => setEventType(e.target.value)} style={selectStyle}>
          <option value="all">All Types</option>
          <option value="normal">Normal</option>
          <option value="merchandise">Merchandise</option>
        </select>
        <select value={eligibility} onChange={(e) => setEligibility(e.target.value)} style={selectStyle}>
          <option value="all">All Eligibility</option>
          <option value="all">Open to All</option>
          <option value="iiit_only">IIIT Only</option>
        </select>
        <label style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 4 }}>
          <input type="checkbox" checked={followedOnly} onChange={(e) => setFollowedOnly(e.target.checked)} />
          Followed Clubs
        </label>
      </div>

      {/* Date Range */}
      <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, color: "#666" }}>From:</label>
        <input
          type="date"
          value={startAfter}
          onChange={(e) => setStartAfter(e.target.value)}
          style={{ padding: 4, border: "1px solid #ccc", borderRadius: 4, fontSize: 13 }}
        />
        <label style={{ fontSize: 12, color: "#666" }}>To:</label>
        <input
          type="date"
          value={startBefore}
          onChange={(e) => setStartBefore(e.target.value)}
          style={{ padding: 4, border: "1px solid #ccc", borderRadius: 4, fontSize: 13 }}
        />
        {(search || eventType !== "all" || eligibility !== "all" || startAfter || startBefore || followedOnly) && (
          <button
            onClick={() => {
              setSearch(""); setEventType("all"); setEligibility("all");
              setStartAfter(""); setStartBefore(""); setFollowedOnly(false);
            }}
            style={{ padding: "4px 12px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <p>Loading...</p>
      ) : events.length === 0 ? (
        <p style={{ color: "#999", textAlign: "center", padding: 40 }}>No events found matching your criteria.</p>
      ) : (
        <div>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>{events.length} event{events.length !== 1 ? "s" : ""} found</p>
          {events.map((ev) => {
            const deadlinePassed = ev.registrationDeadline && new Date(ev.registrationDeadline) < now;
            const eventStarted = new Date(ev.startDate) < now;

            return (
              <div
                key={ev._id}
                onClick={() => navigate(`/events/${ev._id}`)}
                style={{
                  border: "1px solid #e5e7eb", borderRadius: 8,
                  padding: 16, marginBottom: 12, cursor: "pointer",
                  opacity: eventStarted ? 0.6 : 1,
                  transition: "box-shadow 0.2s",
                }}
                onMouseEnter={(e) => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)"}
                onMouseLeave={(e) => e.currentTarget.style.boxShadow = "none"}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <h4 style={{ margin: 0 }}>
                      {ev.name}
                      <span style={{
                        fontSize: 11, padding: "2px 8px", borderRadius: 10, marginLeft: 8,
                        background: ev.eventType === "merchandise" ? "#f59e0b" : "#3b82f6",
                        color: "#fff",
                      }}>
                        {ev.eventType}
                      </span>
                      {ev.eligibility === "iiit_only" && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, marginLeft: 6, background: "#8b5cf6", color: "#fff" }}>
                          IIIT Only
                        </span>
                      )}
                      {deadlinePassed && (
                        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, marginLeft: 6, background: "#ef4444", color: "#fff" }}>
                          Deadline Passed
                        </span>
                      )}
                    </h4>
                    {ev.description && (
                      <p style={{ fontSize: 13, color: "#666", margin: "4px 0", maxWidth: 500 }}>
                        {ev.description.length > 120 ? ev.description.slice(0, 120) + "..." : ev.description}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: "right", fontSize: 13, color: "#888", whiteSpace: "nowrap" }}>
                    <div>{fmt(ev.startDate)}</div>
                    <div style={{ fontSize: 12 }}>{ev.registrationFee ? `₹${ev.registrationFee}` : "Free"}</div>
                    {ev.registrationCount > 0 && (
                      <div style={{ fontSize: 11, color: "#4f46e5" }}>{ev.registrationCount} registered</div>
                    )}
                  </div>
                </div>

                <div style={{ fontSize: 12, color: "#888", marginTop: 6, display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <span>by {ev.organizer?.name || "—"}</span>
                  {ev.registrationDeadline && <span>Deadline: {fmt(ev.registrationDeadline)}</span>}
                  {ev.registrationLimit > 0 && <span>Limit: {ev.registrationLimit}</span>}
                </div>

                {ev.tags && ev.tags.length > 0 && (
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 6 }}>
                    {ev.tags.map((t) => (
                      <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#e0e7ff", color: "#4338ca" }}>
                        {t}
                      </span>
                    ))}
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
