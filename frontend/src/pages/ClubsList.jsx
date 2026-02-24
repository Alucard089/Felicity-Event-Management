import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

import { API_PREFERENCES } from "../config";

const API = API_PREFERENCES;

export default function ClubsList() {
  const token = localStorage.getItem("token");
  const headers = { "x-auth-token": token };
  const navigate = useNavigate();

  const [organizers, setOrganizers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("");

  useEffect(() => {
    axios
      .get(`${API}/organizers`, { headers })
      .then((res) => {
        setOrganizers(res.data.organizers);
        setFollowing(res.data.following.map((id) => id.toString()));
      })
      .finally(() => setLoading(false));
  }, []);

  const toggleFollow = async (orgId) => {
    try {
      const res = await axios.post(`${API}/follow/${orgId}`, {}, { headers });
      setFollowing(res.data.followingClubs.map((id) => id.toString()));
    } catch (err) {
      console.error(err);
    }
  };

  // Unique categories for filter
  const categories = [...new Set(organizers.map((o) => o.category).filter(Boolean))].sort();
  const filtered = filterCat
    ? organizers.filter((o) => o.category === filterCat)
    : organizers;

  if (loading) return <p>Loading…</p>;

  return (
    <div>
      <h2>Clubs &amp; Organizers</h2>

      {/* Category filter */}
      {categories.length > 0 && (
        <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ fontWeight: 600, fontSize: 14 }}>Filter by category:</label>
          <select
            value={filterCat}
            onChange={(e) => setFilterCat(e.target.value)}
            style={{ padding: 6, borderRadius: 4, border: "1px solid #ccc", fontSize: 14 }}
          >
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      )}

      {filtered.length === 0 && <p>No organizers found.</p>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 16 }}>
        {filtered.map((org) => {
          const isFollowed = following.includes(org._id.toString());
          return (
            <div
              key={org._id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 10,
                padding: 16,
                background: "#fff",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <h3
                  style={{ margin: "0 0 4px", cursor: "pointer", color: "#4f46e5" }}
                  onClick={() => navigate(`/clubs/${org._id}`)}
                >
                  {org.name}
                </h3>
                {org.category && (
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: 11,
                      background: "#f3f4f6",
                      padding: "2px 10px",
                      borderRadius: 12,
                      color: "#6b7280",
                      marginBottom: 8,
                    }}
                  >
                    {org.category}
                  </span>
                )}
                {org.description && (
                  <p style={{ fontSize: 13, color: "#555", marginTop: 6, lineHeight: 1.4 }}>
                    {org.description.length > 120 ? org.description.slice(0, 120) + "…" : org.description}
                  </p>
                )}
              </div>

              <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
                <button
                  onClick={() => toggleFollow(org._id)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: 6,
                    border: isFollowed ? "1px solid #ef4444" : "1px solid #4f46e5",
                    background: isFollowed ? "#fff" : "#4f46e5",
                    color: isFollowed ? "#ef4444" : "#fff",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {isFollowed ? "Unfollow" : "Follow"}
                </button>
                <button
                  onClick={() => navigate(`/clubs/${org._id}`)}
                  style={{
                    flex: 1,
                    padding: "6px 0",
                    borderRadius: 6,
                    border: "1px solid #ccc",
                    background: "#fff",
                    color: "#333",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  View Details
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
