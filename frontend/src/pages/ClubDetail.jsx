import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

import { API_PREFERENCES } from "../config";

const API = API_PREFERENCES;

const badge = (text, bg = "#f3f4f6", color = "#555") => ({
  display: "inline-block",
  fontSize: 11,
  background: bg,
  color,
  padding: "2px 10px",
  borderRadius: 12,
  marginRight: 6,
});

export default function ClubDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const headers = { "x-auth-token": token };

  const [org, setOrg] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [tab, setTab] = useState("upcoming");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get(`${API}/organizer/${id}`, { headers })
      .then((res) => {
        setOrg(res.data.organizer);
        setUpcoming(res.data.upcoming);
        setPast(res.data.past);
        setIsFollowing(res.data.isFollowing);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const toggleFollow = async () => {
    try {
      const res = await axios.post(`${API}/follow/${id}`, {}, { headers });
      const followed = res.data.followingClubs.some(
        (fId) => fId.toString() === id
      );
      setIsFollowing(followed);
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <p>Loading…</p>;
  if (!org) return <p>Organizer not found.</p>;

  const events = tab === "upcoming" ? upcoming : past;

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 20,
        }}
      >
        <div>
          <h2 style={{ margin: 0 }}>{org.name}</h2>
          {org.category && <span style={badge()}>{org.category}</span>}
        </div>
        <button
          onClick={toggleFollow}
          style={{
            padding: "8px 20px",
            borderRadius: 6,
            border: isFollowing ? "1px solid #ef4444" : "1px solid #4f46e5",
            background: isFollowing ? "#fff" : "#4f46e5",
            color: isFollowing ? "#ef4444" : "#fff",
            cursor: "pointer",
            fontWeight: 600,
          }}
        >
          {isFollowing ? "Unfollow" : "Follow"}
        </button>
      </div>

      {/* Info */}
      {org.description && (
        <p style={{ color: "#555", lineHeight: 1.6, marginBottom: 12 }}>
          {org.description}
        </p>
      )}
      {org.contactEmail && (
        <p style={{ fontSize: 13, color: "#888" }}>
          <strong>Contact:</strong> {org.contactEmail}
        </p>
      )}

      <hr style={{ margin: "20px 0", border: "none", borderTop: "1px solid #e5e7eb" }} />

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["upcoming", "past"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: "6px 18px",
              borderRadius: 20,
              border: tab === t ? "2px solid #4f46e5" : "1px solid #ccc",
              background: tab === t ? "#eef2ff" : "#fff",
              color: tab === t ? "#4f46e5" : "#333",
              fontWeight: tab === t ? 700 : 400,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {t} ({t === "upcoming" ? upcoming.length : past.length})
          </button>
        ))}
      </div>

      {/* Events list */}
      {events.length === 0 ? (
        <p style={{ color: "#888" }}>No {tab} events.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {events.map((evt) => (
            <div
              key={evt._id}
              onClick={() => navigate(`/events/${evt._id}`)}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 14,
                cursor: "pointer",
                background: "#fff",
                transition: "box-shadow .15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.08)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>{evt.title}</strong>
                <span style={badge(evt.eventType === "merchandise" ? "Merchandise" : "Normal", "#e0e7ff", "#4338ca")}>
                  {evt.eventType === "merchandise" ? "Merchandise" : "Normal"}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "#888", margin: "4px 0 0" }}>
                {new Date(evt.startDate).toLocaleDateString()} — {new Date(evt.endDate).toLocaleDateString()}
              </p>
              {evt.tags && evt.tags.length > 0 && (
                <div style={{ marginTop: 6, display: "flex", gap: 4, flexWrap: "wrap" }}>
                  {evt.tags.map((tag) => (
                    <span key={tag} style={{ ...badge(), fontSize: 10 }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
