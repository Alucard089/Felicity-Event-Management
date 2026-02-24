import { useState, useEffect } from "react";
import axios from "axios";

import { API_ADMIN } from "../config";

const API = API_ADMIN;

const CATEGORIES = [
  "Technology", "Robotics & Electronics", "Sports", "Dramatics", "Design",
  "Comedy & Humour", "Literature", "Photography", "Fashion", "Art",
  "Chess", "Dance", "Debate", "Gaming", "Language & Culture",
  "Music", "Quiz", "Career & Motivation", "Community & Inclusion",
];

export default function ManageOrganizers() {
  const token = localStorage.getItem("token");
  const headers = { "x-auth-token": token };

  const [organizers, setOrganizers] = useState([]);
  const [form, setForm] = useState({ name: "", email: "", category: "", description: "", contactEmail: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [credentials, setCredentials] = useState(null); // { email, password } shown after creation

  useEffect(() => {
    fetchOrganizers();
  }, []);

  const fetchOrganizers = async () => {
    try {
      const res = await axios.get(`${API}/organizers`, { headers });
      setOrganizers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCreate = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setCredentials(null);
    try {
      const res = await axios.post(`${API}/create-organizer`, form, { headers });
      setSuccess(res.data.msg);
      setCredentials(res.data.credentials); // show auto-generated password
      setForm({ name: "", email: "", category: "", description: "", contactEmail: "" });
      fetchOrganizers();
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to create organizer");
    }
  };

  const handleToggle = async (id) => {
    try {
      await axios.put(`${API}/organizer/${id}/toggle`, {}, { headers });
      fetchOrganizers();
    } catch (err) {
      setError(err.response?.data?.msg || "Failed");
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`PERMANENTLY delete "${name}"? This cannot be undone. Consider disabling instead.`)) return;
    try {
      await axios.delete(`${API}/organizer/${id}`, { headers });
      fetchOrganizers();
    } catch (err) {
      setError(err.response?.data?.msg || "Failed");
    }
  };

  const inputStyle = { width: "100%", padding: 8, marginBottom: 8, boxSizing: "border-box", border: "1px solid #ccc", borderRadius: 4 };

  return (
    <div>
      <h2>Manage Clubs / Organizers</h2>

      {/* Create Form */}
      <div style={{ background: "#f9fafb", borderRadius: 8, padding: 16, marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>Add New Club/Organizer</h3>
        <p style={{ fontSize: 13, color: "#888", marginTop: -8 }}>
          System auto-generates a secure password. Credentials are shown once after creation — share them with the club.
        </p>

        {error && <p style={{ color: "#dc2626", background: "#fee2e2", padding: 8, borderRadius: 6 }}>{error}</p>}
        {success && <p style={{ color: "#059669", background: "#dcfce7", padding: 8, borderRadius: 6 }}>{success}</p>}

        {/* Credential reveal box */}
        {credentials && (
          <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <p style={{ margin: 0, fontWeight: 700, color: "#92400e" }}>📋 Auto-Generated Credentials (copy and share):</p>
            <p style={{ margin: "6px 0 0", fontSize: 14, fontFamily: "monospace" }}>
              <strong>Email:</strong> {credentials.email}<br />
              <strong>Password:</strong> {credentials.password}
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`Email: ${credentials.email}\nPassword: ${credentials.password}`);
                setSuccess("Credentials copied to clipboard!");
              }}
              style={{ marginTop: 8, padding: "4px 12px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
            >
              Copy to Clipboard
            </button>
          </div>
        )}

        <form onSubmit={handleCreate}>
          <input name="name" placeholder="Club / Organizer Name *" value={form.name} onChange={handleChange} required style={inputStyle} />
          <input name="email" type="email" placeholder="Login Email *" value={form.email} onChange={handleChange} required style={inputStyle} />
          <select name="category" value={form.category} onChange={handleChange} style={inputStyle}>
            <option value="">-- Select Category --</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <textarea name="description" placeholder="Description" value={form.description} onChange={handleChange} rows={2} style={inputStyle} />
          <input name="contactEmail" type="email" placeholder="Contact Email (defaults to login email)" value={form.contactEmail} onChange={handleChange} style={inputStyle} />
          <button type="submit" style={{ width: "100%", padding: 10, background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>
            Create Organizer
          </button>
        </form>
      </div>

      {/* Organizer List */}
      <h3>All Clubs/Organizers ({organizers.length})</h3>
      {organizers.length === 0 ? (
        <p style={{ color: "#888", textAlign: "center" }}>No organizers yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {organizers.map((org) => (
            <div key={org._id} style={{
              border: "1px solid #e5e7eb", borderRadius: 8, padding: 14,
              opacity: org.active === false ? 0.6 : 1,
              background: org.active === false ? "#fef2f2" : "#fff",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <strong style={{ fontSize: 15 }}>{org.name}</strong>
                  {org.category && <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>({org.category})</span>}
                  {org.active === false && <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#fee2e2", color: "#991b1b", marginLeft: 8 }}>DISABLED</span>}
                  <br />
                  <span style={{ fontSize: 13, color: "#666" }}>{org.email}</span>
                  {org.contactEmail && org.contactEmail !== org.email && (
                    <span style={{ fontSize: 13, color: "#666" }}> | Contact: {org.contactEmail}</span>
                  )}
                  {org.description && <p style={{ fontSize: 13, color: "#888", margin: "4px 0 0" }}>{org.description}</p>}
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button
                    onClick={() => handleToggle(org._id)}
                    style={{
                      padding: "4px 12px", fontSize: 12, border: "1px solid #ccc", borderRadius: 4,
                      background: org.active === false ? "#059669" : "#f59e0b",
                      color: "#fff", cursor: "pointer",
                    }}
                  >
                    {org.active === false ? "Enable" : "Disable"}
                  </button>
                  <button
                    onClick={() => handleDelete(org._id, org.name)}
                    style={{ padding: "4px 12px", fontSize: 12, background: "#dc2626", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
