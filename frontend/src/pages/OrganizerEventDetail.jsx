import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

import { API_EVENTS, API_FEEDBACK, API_REGISTRATIONS, API_TEAMS } from "../config";
import DiscussionForum from "../components/DiscussionForum";

const API = API_EVENTS;

const STATUS_COLORS = {
  draft: { bg: "#f3f4f6", color: "#6b7280" },
  published: { bg: "#dbeafe", color: "#1d4ed8" },
  ongoing: { bg: "#dcfce7", color: "#15803d" },
  completed: { bg: "#e0e7ff", color: "#4338ca" },
  closed: { bg: "#fee2e2", color: "#991b1b" },
};

const TRANSITIONS = {
  draft: ["published"],
  published: ["ongoing", "closed"],
  ongoing: ["completed", "closed"],
  completed: ["closed"],
  closed: [],
};

export default function OrganizerEventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const headers = { "x-auth-token": token };

  const [event, setEvent] = useState(null);
  const [stats, setStats] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);

  // Participant filters
  const [searchP, setSearchP] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterTeam, setFilterTeam] = useState("");

  // Status change
  const [statusMsg, setStatusMsg] = useState("");

  // Feedback state
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [fbFilterRating, setFbFilterRating] = useState("all");

  // Payment proofs state (merchandise only)
  const [paymentOrders, setPaymentOrders] = useState([]);
  const [paymentFilter, setPaymentFilter] = useState("pending");
  const [proofModal, setProofModal] = useState(null);  // order being viewed
  const [actionMsg, setActionMsg] = useState("");

  // Teams state (hackathon only)
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    loadAll();
  }, [id]);

  const loadAll = async () => {
    try {
      const [evRes, stRes] = await Promise.all([
        axios.get(`${API}/${id}`, { headers }),
        axios.get(`${API}/${id}/stats`, { headers }),
      ]);
      setEvent(evRes.data);
      setStats(stRes.data);
      loadParticipants();
      if (evRes.data.eventType === "hackathon") loadTeams();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadParticipants = async () => {
    try {
      const params = {};
      if (searchP) params.search = searchP;
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterTeam) params.team = filterTeam;
      const res = await axios.get(`${API}/${id}/participants`, { headers, params });
      setParticipants(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadTeams = async () => {
    try {
      const res = await axios.get(`${API_TEAMS}/event/${id}`, { headers });
      setTeams(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (event) loadParticipants();
  }, [searchP, filterStatus, filterTeam]);

  // Load feedback for completed/closed events
  const loadFeedback = async (ratingFilter) => {
    try {
      const params = {};
      if (ratingFilter && ratingFilter !== "all") params.filterRating = ratingFilter;
      const res = await axios.get(`${API_FEEDBACK}/${id}`, { headers, params });
      setFeedbackList(res.data.feedbacks);
      setFeedbackStats(res.data.stats);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (event && ["completed", "closed"].includes(event.status)) {
      loadFeedback(fbFilterRating);
    }
  }, [event, fbFilterRating]);

  // Load payment proof orders for merchandise events
  const loadPaymentOrders = async (filter) => {
    try {
      const res = await axios.get(`${API_REGISTRATIONS}/event/${id}/payment-proofs`, {
        headers,
        params: { status: filter || paymentFilter },
      });
      setPaymentOrders(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (event && event.eventType === "merchandise") {
      loadPaymentOrders(paymentFilter);
    }
  }, [event, paymentFilter]);

  const handleApprove = async (orderId) => {
    if (!window.confirm("Approve this payment and confirm the order?")) return;
    setActionMsg("");
    try {
      const res = await axios.post(`${API_REGISTRATIONS}/${orderId}/approve-payment`, {}, { headers });
      setActionMsg(res.data.msg);
      setProofModal(null);
      loadPaymentOrders(paymentFilter);
      // Refresh stats
      const stRes = await axios.get(`${API}/${id}/stats`, { headers });
      setStats(stRes.data);
    } catch (err) {
      setActionMsg(err.response?.data?.msg || "Approval failed");
    }
  };

  const handleReject = async (orderId) => {
    if (!window.confirm("Reject this payment?")) return;
    setActionMsg("");
    try {
      const res = await axios.post(`${API_REGISTRATIONS}/${orderId}/reject-payment`, {}, { headers });
      setActionMsg(res.data.msg);
      setProofModal(null);
      loadPaymentOrders(paymentFilter);
    } catch (err) {
      setActionMsg(err.response?.data?.msg || "Rejection failed");
    }
  };

  const changeStatus = async (newStatus) => {
    setStatusMsg("");
    if (!window.confirm(`Change status to "${newStatus}"?`)) return;
    try {
      const res = await axios.put(`${API}/${id}/status`, { status: newStatus }, { headers });
      setEvent({ ...event, status: res.data.event.status });
      setStatusMsg(res.data.msg);
      // Refresh stats
      const stRes = await axios.get(`${API}/${id}/stats`, { headers });
      setStats(stRes.data);
    } catch (err) {
      setStatusMsg(err.response?.data?.msg || "Failed");
    }
  };

  const exportCSV = () => {
    window.open(`${API}/${id}/participants/csv?token=${token}`, "_blank");
  };

  const downloadCSV = async () => {
    try {
      const res = await axios.get(`${API}/${id}/participants/csv`, {
        headers,
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(event?.name || "event").replace(/[^a-zA-Z0-9]/g, "_")}_participants.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
  };

  const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");

  if (loading) return <p>Loading...</p>;
  if (!event) return <p>Event not found.</p>;

  const sc = STATUS_COLORS[event.status] || STATUS_COLORS.draft;
  const nextStatuses = TRANSITIONS[event.status] || [];

  return (
    <div>
      {/* Back + Title */}
      <button
        onClick={() => navigate("/organizer")}
        style={{ marginBottom: 12, padding: "6px 16px", background: "#888", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
      >
        ← Back to Dashboard
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0 }}>{event.name}</h2>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <span style={{
              fontSize: 12, padding: "3px 12px", borderRadius: 12,
              background: sc.bg, color: sc.color, fontWeight: 600, textTransform: "capitalize",
            }}>
              {event.status || "draft"}
            </span>
            <span style={{
              fontSize: 12, padding: "3px 12px", borderRadius: 12,
              background: event.eventType === "merchandise" ? "#fef3c7" : "#dbeafe",
              color: event.eventType === "merchandise" ? "#92400e" : "#1e40af",
              textTransform: "capitalize",
            }}>
              {event.eventType}
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {(event.status === "draft" || event.status === "published") && (
            <button
              onClick={() => navigate(`/organizer/event/${id}/edit`)}
              style={{ padding: "8px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
            >
              Edit Event
            </button>
          )}
        </div>
      </div>

      {/* Status Actions */}
      {nextStatuses.length > 0 && (
        <div style={{ marginBottom: 16, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 13, color: "#666" }}>Change status:</span>
          {nextStatuses.map((s) => (
            <button
              key={s}
              onClick={() => changeStatus(s)}
              style={{
                padding: "6px 14px", borderRadius: 6, border: "1px solid #ccc",
                background: "#fff", cursor: "pointer", fontSize: 13, textTransform: "capitalize",
              }}
            >
              {s}
            </button>
          ))}
          {statusMsg && <span style={{ fontSize: 13, color: "#2563eb" }}>{statusMsg}</span>}
        </div>
      )}

      {/* Overview */}
      <div style={{ background: "#f9fafb", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, fontSize: 16 }}>Event Overview</h3>
        {event.description && <p style={{ color: "#555", marginBottom: 12 }}>{event.description}</p>}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 14 }}>
          <p><strong>Start:</strong> {fmt(event.startDate)}</p>
          <p><strong>End:</strong> {fmt(event.endDate)}</p>
          <p><strong>Deadline:</strong> {event.registrationDeadline ? fmt(event.registrationDeadline) : "None"}</p>
          <p><strong>Fee:</strong> {event.registrationFee ? `₹${event.registrationFee}` : "Free"}</p>
          <p><strong>Eligibility:</strong> {event.eligibility === "iiit_only" ? "IIIT Only" : "Open to All"}</p>
          <p><strong>Limit:</strong> {event.registrationLimit > 0 ? event.registrationLimit : "Unlimited"}</p>
        </div>
        {event.tags && event.tags.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 8 }}>
            {event.tags.map((t) => (
              <span key={t} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#e0e7ff", color: "#4338ca" }}>{t}</span>
            ))}
          </div>
        )}
      </div>

      {/* Analytics */}
      {stats && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 16 }}>Analytics</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 10 }}>
            {[
              { label: "Registrations", value: stats.registrations },
              { label: "Cancelled", value: stats.cancelled },
              { label: "Revenue", value: `₹${stats.totalRevenue}` },
              ...(event.eventType === "merchandise" ? [{ label: "Items Sold", value: stats.merchSold }] : []),
              ...(stats.teams > 0 ? [{ label: "Teams", value: stats.teams }] : []),
            ].map((s) => (
              <div key={s.label} style={{
                border: "1px solid #e5e7eb", borderRadius: 8, padding: 14, textAlign: "center",
              }}>
                <p style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#2563eb" }}>{s.value}</p>
                <p style={{ margin: "4px 0 0", fontSize: 11, color: "#6b7280" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Participants */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Participants ({participants.length})</h3>
          <button
            onClick={downloadCSV}
            style={{ padding: "6px 14px", background: "#059669", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
          >
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <input
            placeholder="Search name or email..."
            value={searchP}
            onChange={(e) => setSearchP(e.target.value)}
            style={{ flex: 1, minWidth: 180, padding: 6, border: "1px solid #ccc", borderRadius: 4, fontSize: 13 }}
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: 6, border: "1px solid #ccc", borderRadius: 4, fontSize: 13 }}
          >
            <option value="all">All Status</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input
            placeholder="Filter by team..."
            value={filterTeam}
            onChange={(e) => setFilterTeam(e.target.value)}
            style={{ width: 140, padding: 6, border: "1px solid #ccc", borderRadius: 4, fontSize: 13 }}
          />
        </div>

        {/* Table */}
        {participants.length === 0 ? (
          <p style={{ color: "#888", textAlign: "center", padding: 20 }}>No participants found.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#f9fafb", textAlign: "left" }}>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>Name</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>Email</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>Reg Date</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>Payment</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>Team</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>Status</th>
                  <th style={{ padding: "8px 10px", borderBottom: "1px solid #e5e7eb" }}>Ticket</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((r) => {
                  const p = r.participant || {};
                  return (
                    <tr key={r._id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "8px 10px" }}>{p.firstName} {p.lastName}</td>
                      <td style={{ padding: "8px 10px" }}>{p.email}</td>
                      <td style={{ padding: "8px 10px" }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td style={{ padding: "8px 10px" }}>₹{(event.registrationFee || 0) * (r.quantity || 1)}</td>
                      <td style={{ padding: "8px 10px" }}>{r.teamName || "—"}</td>
                      <td style={{ padding: "8px 10px" }}>
                        <span style={{
                          fontSize: 11, padding: "2px 8px", borderRadius: 10,
                          background: r.status === "confirmed" ? "#dcfce7" : "#fee2e2",
                          color: r.status === "confirmed" ? "#15803d" : "#991b1b",
                        }}>
                          {r.status}
                        </span>
                      </td>
                      <td style={{ padding: "8px 10px", fontFamily: "monospace", fontSize: 11 }}>{r.ticketId}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===== PAYMENT PROOFS (merchandise events only) ===== */}
      {event.eventType === "merchandise" && (
        <div style={{ marginTop: 30, borderTop: "2px solid #e5e7eb", paddingTop: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Payment Proofs</h3>

          {actionMsg && (
            <p style={{
              padding: 8, borderRadius: 6, fontSize: 13, marginBottom: 12,
              background: actionMsg.includes("approved") || actionMsg.includes("confirmed") ? "#dcfce7" : "#fef2f2",
              color: actionMsg.includes("approved") || actionMsg.includes("confirmed") ? "#166534" : "#991b1b",
            }}>
              {actionMsg}
            </p>
          )}

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            {["pending", "awaiting_proof", "approved", "rejected", "all"].map((f) => (
              <button
                key={f}
                onClick={() => setPaymentFilter(f)}
                style={{
                  padding: "6px 14px", borderRadius: 6,
                  border: paymentFilter === f ? "2px solid #2563eb" : "1px solid #ccc",
                  background: paymentFilter === f ? "#eff6ff" : "#fff",
                  color: paymentFilter === f ? "#2563eb" : "#333",
                  cursor: "pointer", fontSize: 13, textTransform: "capitalize", fontWeight: paymentFilter === f ? 600 : 400,
                }}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Orders list */}
          {paymentOrders.length === 0 ? (
            <p style={{ color: "#888", textAlign: "center", padding: 20 }}>
              No {paymentFilter !== "all" ? paymentFilter : ""} orders found.
            </p>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {paymentOrders.map((order) => {
                const p = order.participant || {};
                const variant = event.variants.find((v) => v._id === order.selectedVariant);
                const variantLabel = variant
                  ? variant.label || `${variant.size || ""} ${variant.color || ""}`.trim()
                  : "—";
                return (
                  <div key={order._id} style={{
                    border: "1px solid #e5e7eb", borderRadius: 8, padding: 14,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    background: order.paymentStatus === "pending" || order.paymentStatus === "awaiting_proof" ? "#fffbeb" : "#fff",
                  }}>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14 }}>
                        {p.firstName} {p.lastName}
                      </p>
                      <p style={{ margin: "2px 0", fontSize: 12, color: "#666" }}>{p.email}</p>
                      <p style={{ margin: "2px 0", fontSize: 12, color: "#666" }}>
                        Variant: {variantLabel} · Qty: {order.quantity || 1} · ₹{(event.registrationFee || 0) * (order.quantity || 1)}
                      </p>
                      <p style={{ margin: "2px 0", fontSize: 11, color: "#999" }}>
                        {new Date(order.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{
                        fontSize: 11, padding: "3px 10px", borderRadius: 10,
                        background: order.paymentStatus === "approved" ? "#dcfce7"
                          : order.paymentStatus === "rejected" ? "#fee2e2"
                          : order.paymentStatus === "awaiting_proof" ? "#f3f4f6" : "#fef3c7",
                        color: order.paymentStatus === "approved" ? "#166534"
                          : order.paymentStatus === "rejected" ? "#991b1b"
                          : order.paymentStatus === "awaiting_proof" ? "#6b7280" : "#92400e",
                        fontWeight: 600,
                      }}>
                        {order.paymentStatus}
                      </span>
                      {order.paymentProofData && (
                        <button
                          onClick={() => setProofModal(order)}
                          style={{
                            padding: "6px 12px", background: "#2563eb", color: "#fff",
                            border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12,
                          }}
                        >
                          View Proof
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Proof modal */}
          {proofModal && (
            <div style={{
              position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
              background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
              justifyContent: "center", zIndex: 1000,
            }}>
              <div style={{
                background: "#fff", borderRadius: 12, padding: 24, maxWidth: 520,
                width: "90%", position: "relative", maxHeight: "90vh", overflowY: "auto",
              }}>
                <button
                  onClick={() => setProofModal(null)}
                  style={{
                    position: "absolute", top: 12, right: 12, background: "none",
                    border: "none", fontSize: 20, cursor: "pointer", color: "#666",
                  }}
                >
                  ✕
                </button>

                <h3 style={{ marginTop: 0 }}>Payment Proof</h3>

                <div style={{ fontSize: 14, marginBottom: 12 }}>
                  <p><strong>From:</strong> {proofModal.participant?.firstName} {proofModal.participant?.lastName} ({proofModal.participant?.email})</p>
                  <p><strong>Quantity:</strong> {proofModal.quantity || 1}</p>
                  <p><strong>Amount:</strong> ₹{(event.registrationFee || 0) * (proofModal.quantity || 1)}</p>
                </div>

                {proofModal.paymentProofData && (
                  <img
                    src={proofModal.paymentProofData}
                    alt="Payment proof"
                    style={{
                      width: "100%", maxHeight: 400, objectFit: "contain",
                      borderRadius: 8, border: "1px solid #e5e7eb", marginBottom: 16,
                    }}
                  />
                )}

                {proofModal.paymentStatus === "pending" && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => handleApprove(proofModal._id)}
                      style={{
                        flex: 1, padding: "10px 0", background: "#16a34a", color: "#fff",
                        border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600,
                      }}
                    >
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleReject(proofModal._id)}
                      style={{
                        flex: 1, padding: "10px 0", background: "#dc2626", color: "#fff",
                        border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14, fontWeight: 600,
                      }}
                    >
                      ✗ Reject
                    </button>
                  </div>
                )}

                {proofModal.paymentStatus === "approved" && (
                  <p style={{ color: "#16a34a", fontWeight: 600, textAlign: "center" }}>✓ This payment has been approved</p>
                )}
                {proofModal.paymentStatus === "rejected" && (
                  <p style={{ color: "#dc2626", fontWeight: 600, textAlign: "center" }}>✗ This payment was rejected</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== HACKATHON TEAMS ===== */}
      {event.eventType === "hackathon" && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 24 }}>
          <h3 style={{ marginTop: 0 }}>Teams ({teams.length})</h3>
          {teams.length === 0 ? (
            <p style={{ color: "#888" }}>No teams formed yet.</p>
          ) : (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
              {teams.map((t) => (
                <div key={t._id} style={{
                  border: "1px solid #d1d5db", borderRadius: 8, padding: 14, minWidth: 200, flex: "0 0 auto",
                  background: t.isLocked ? "#f0fdf4" : "#fff"
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <strong>{t.name}</strong>
                    <span style={{
                      fontSize: 11, padding: "2px 8px", borderRadius: 12,
                      background: t.isLocked ? "#dcfce7" : "#fef3c7",
                      color: t.isLocked ? "#15803d" : "#92400e"
                    }}>
                      {t.isLocked ? "Locked" : "Open"}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "#888", margin: "0 0 6px" }}>Code: {t.joinCode}</p>
                  <ul style={{ margin: 0, paddingLeft: 16, fontSize: 13 }}>
                    {t.members.map((m) => (
                      <li key={m._id}>
                        {m.name} {m._id === (t.leader._id || t.leader) && <span style={{ color: "#6366f1" }}>(L)</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== DISCUSSION FORUM ===== */}
      <DiscussionForum eventId={id} isOrganizer={true} />

      {/* ===== FEEDBACK SECTION (only for completed/closed events) ===== */}
      {["completed", "closed"].includes(event.status) && (
        <div style={{ marginTop: 30, borderTop: "2px solid #e5e7eb", paddingTop: 20 }}>
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>
            Participant Feedback
            {feedbackStats && ` (${feedbackStats.total} review${feedbackStats.total !== 1 ? "s" : ""})`}
          </h3>

          {/* Aggregated Stats */}
          {feedbackStats && feedbackStats.total > 0 ? (
            <>
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <div style={{ textAlign: "center", minWidth: 90 }}>
                    <p style={{ fontSize: 36, fontWeight: 700, margin: 0, color: "#f59e0b" }}>
                      {feedbackStats.avgRating}
                    </p>
                    <div style={{ color: "#f59e0b", fontSize: 18 }}>
                      {"★".repeat(Math.round(feedbackStats.avgRating))}
                      {"☆".repeat(5 - Math.round(feedbackStats.avgRating))}
                    </div>
                    <p style={{ fontSize: 12, color: "#888", margin: "4px 0 0" }}>Average Rating</p>
                  </div>
                  <div style={{ flex: 1 }}>
                    {[5, 4, 3, 2, 1].map((star) => {
                      const count = feedbackStats.distribution[star] || 0;
                      const pct = feedbackStats.total > 0 ? (count / feedbackStats.total) * 100 : 0;
                      return (
                        <div key={star} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                          <span style={{ fontSize: 12, width: 24, textAlign: "right" }}>{star}★</span>
                          <div style={{ flex: 1, height: 10, background: "#f3f4f6", borderRadius: 5 }}>
                            <div style={{ width: `${pct}%`, height: "100%", background: "#f59e0b", borderRadius: 5 }} />
                          </div>
                          <span style={{ fontSize: 11, color: "#888", width: 24 }}>{count}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Filter by rating */}
              <div style={{ marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}>
                <span style={{ fontSize: 13, color: "#666" }}>Filter:</span>
                {["all", 5, 4, 3, 2, 1].map((val) => (
                  <button
                    key={val}
                    onClick={() => setFbFilterRating(val)}
                    style={{
                      padding: "4px 10px", border: "1px solid #ccc", borderRadius: 12,
                      background: fbFilterRating == val ? "#2563eb" : "#fff",
                      color: fbFilterRating == val ? "#fff" : "#333",
                      cursor: "pointer", fontSize: 12,
                    }}
                  >
                    {val === "all" ? "All" : `${val}★`}
                  </button>
                ))}
              </div>

              {/* Feedback list */}
              {feedbackList.length > 0 ? (
                feedbackList.map((fb) => (
                  <div key={fb._id} style={{
                    border: "1px solid #f3f4f6", borderRadius: 8, padding: 12, marginBottom: 8,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "#f59e0b", fontSize: 14 }}>
                        {"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}
                      </span>
                      <span style={{ fontSize: 11, color: "#999" }}>
                        {new Date(fb.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {fb.comment && (
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#444", fontStyle: "italic" }}>
                        "{fb.comment}"
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <p style={{ color: "#888", textAlign: "center" }}>No feedback matches this filter.</p>
              )}
            </>
          ) : (
            <p style={{ color: "#888", textAlign: "center", padding: 16 }}>No feedback received yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
