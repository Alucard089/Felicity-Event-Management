import { useState, useEffect } from "react";
import axios from "axios";

import { API_EVENTS, API_ADMIN } from "../config";

const API = API_EVENTS;

const CATEGORIES = [
  "Technology", "Robotics & Electronics", "Sports", "Dramatics", "Design",
  "Comedy & Humour", "Literature", "Photography", "Fashion", "Art",
  "Chess", "Dance", "Debate", "Gaming", "Language & Culture",
  "Music", "Quiz", "Career & Motivation", "Community & Inclusion",
];

export default function OrganizerProfile() {
  const token = localStorage.getItem("token");
  const headers = { "x-auth-token": token };

  const [profile, setProfile] = useState({
    email: "", name: "", category: "", description: "",
    contactEmail: "", contactNumber: "", discordWebhookUrl: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  // Password reset request state
  const [resetReason, setResetReason] = useState("");
  const [resetStatus, setResetStatus] = useState(null); // latest request status

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get(`${API}/my/profile`, { headers });
        setProfile({
          email: res.data.email || "",
          name: res.data.name || "",
          category: res.data.category || "",
          description: res.data.description || "",
          contactEmail: res.data.contactEmail || "",
          contactNumber: res.data.contactNumber || "",
          discordWebhookUrl: res.data.discordWebhookUrl || "",
        });
      } catch (err) {
        console.error(err);
        setError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Fetch latest password reset request status
  useEffect(() => {
    const fetchResetStatus = async () => {
      try {
        const res = await axios.get(`${API_ADMIN}/my-reset-status`, { headers });
        if (res.data.hasRequest) setResetStatus(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchResetStatus();
  }, []);

  const handleChange = (e) => {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setMsg(""); setError(""); setSaving(true);
    try {
      const { email, ...updateData } = profile; // email is not editable
      const res = await axios.put(`${API}/my/profile`, updateData, { headers });
      setMsg(res.data.msg || "Profile saved!");

      // Also update localStorage user object if name changed
      const storedUser = JSON.parse(localStorage.getItem("user") || "{}");
      if (profile.name !== storedUser.name) {
        storedUser.name = profile.name;
        localStorage.setItem("user", JSON.stringify(storedUser));
      }
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = { width: "100%", padding: 8, marginBottom: 10, boxSizing: "border-box", border: "1px solid #ccc", borderRadius: 4 };
  const labelStyle = { fontSize: 13, color: "#555", display: "block", marginBottom: 3 };

  if (loading) return <p>Loading...</p>;

  return (
    <div style={{ maxWidth: 540, margin: "0 auto" }}>
      <h2>Organizer Profile</h2>

      {msg && <p style={{ color: "#059669", background: "#dcfce7", padding: 10, borderRadius: 6 }}>{msg}</p>}
      {error && <p style={{ color: "#dc2626", background: "#fee2e2", padding: 10, borderRadius: 6 }}>{error}</p>}

      <form onSubmit={handleSave}>
        {/* Login email — read-only */}
        <label style={labelStyle}>Login Email (cannot be changed)</label>
        <input value={profile.email} disabled style={{ ...inputStyle, background: "#f3f4f6", color: "#888", cursor: "not-allowed" }} />

        {/* Editable fields */}
        <label style={labelStyle}>Organization / Club Name *</label>
        <input name="name" value={profile.name} onChange={handleChange} required style={inputStyle} placeholder="e.g. Ping! Tech Club" />

        <label style={labelStyle}>Category</label>
        <select name="category" value={profile.category} onChange={handleChange} style={inputStyle}>
          <option value="">-- Select Category --</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <label style={labelStyle}>Description</label>
        <textarea name="description" value={profile.description} onChange={handleChange} rows={3} style={inputStyle} placeholder="About your club or organization..." />

        <label style={labelStyle}>Contact Email</label>
        <input name="contactEmail" type="email" value={profile.contactEmail} onChange={handleChange} style={inputStyle} placeholder="public-facing contact email" />

        <label style={labelStyle}>Contact Number</label>
        <input name="contactNumber" value={profile.contactNumber} onChange={handleChange} style={inputStyle} placeholder="+91-XXXXXXXXXX" />

        {/* Discord Webhook */}
        <div style={{ border: "1px solid #5865f2", borderRadius: 8, padding: 14, marginBottom: 16, marginTop: 8 }}>
          <h4 style={{ margin: "0 0 6px 0", color: "#5865f2" }}>Discord Integration</h4>
          <p style={{ fontSize: 12, color: "#888", margin: "0 0 8px 0" }}>
            Paste your Discord channel webhook URL below. When you publish a new event, it will automatically be posted to your Discord channel.
          </p>
          <label style={labelStyle}>Webhook URL</label>
          <input
            name="discordWebhookUrl"
            value={profile.discordWebhookUrl}
            onChange={handleChange}
            style={inputStyle}
            placeholder="https://discord.com/api/webhooks/..."
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{
            width: "100%", padding: 10, background: "#2563eb", color: "#fff",
            border: "none", borderRadius: 6, fontSize: 15, cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      {/* Password Reset Request */}
      <div style={{ marginTop: 24, border: "1px solid #e5e7eb", borderRadius: 8, padding: 14 }}>
        <h4 style={{ margin: "0 0 6px" }}>Password Reset</h4>

        {/* Show latest request status if exists */}
        {resetStatus && (
          <div style={{
            padding: 10, borderRadius: 6, marginBottom: 10, fontSize: 13,
            background: resetStatus.status === "pending" ? "#fef3c7"
              : resetStatus.status === "approved" ? "#dcfce7" : "#fee2e2",
            color: resetStatus.status === "pending" ? "#92400e"
              : resetStatus.status === "approved" ? "#15803d" : "#991b1b",
          }}>
            <strong>Latest request:</strong> <span style={{ textTransform: "capitalize" }}>{resetStatus.status}</span>
            <br />
            <span style={{ fontSize: 12 }}>Submitted: {new Date(resetStatus.createdAt).toLocaleString()}</span>
            {resetStatus.resolvedAt && (
              <span style={{ fontSize: 12 }}> · Resolved: {new Date(resetStatus.resolvedAt).toLocaleString()}</span>
            )}
            {resetStatus.adminComment && (
              <p style={{ margin: "6px 0 0", fontSize: 12 }}>
                <strong>Admin comment:</strong> {resetStatus.adminComment}
              </p>
            )}
          </div>
        )}

        {/* Show form only if no pending request */}
        {(!resetStatus || resetStatus.status !== "pending") && (
          <>
            <p style={{ fontSize: 13, color: "#888", margin: "0 0 8px" }}>
              Submit a request to the admin to reset your password. Please provide a reason.
            </p>
            <textarea
              value={resetReason}
              onChange={(e) => setResetReason(e.target.value)}
              placeholder="Why do you need a password reset? e.g., Forgot password, compromised account..."
              rows={2}
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6, fontSize: 13, boxSizing: "border-box", marginBottom: 8 }}
            />
            <button
              onClick={async () => {
                if (!resetReason.trim()) {
                  setError("Please provide a reason for the password reset");
                  return;
                }
                try {
                  const res = await axios.post(`${API_ADMIN}/request-reset`, { reason: resetReason }, { headers });
                  setMsg(res.data.msg);
                  setResetReason("");
                  setResetStatus({ status: "pending", createdAt: new Date().toISOString() });
                } catch (err) {
                  setError(err.response?.data?.msg || "Failed");
                }
              }}
              style={{ padding: "8px 16px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
            >
              Request Password Reset
            </button>
          </>
        )}

        {resetStatus && resetStatus.status === "pending" && (
          <p style={{ fontSize: 13, color: "#92400e", margin: "8px 0 0" }}>
            Your password reset request is pending admin review.
          </p>
        )}
      </div>
    </div>
  );
}
