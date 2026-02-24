import { useState, useEffect } from "react";
import axios from "axios";

import { API_ADMIN } from "../config";

const API = API_ADMIN;

const STATUS_COLORS = {
  pending: { bg: "#fef3c7", color: "#92400e" },
  approved: { bg: "#dcfce7", color: "#15803d" },
  rejected: { bg: "#fee2e2", color: "#991b1b" },
};

export default function PasswordResetRequests() {
  const token = localStorage.getItem("token");
  const headers = { "x-auth-token": token };

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [msg, setMsg] = useState("");
  const [credentials, setCredentials] = useState(null);

  // Comment modal
  const [showCommentModal, setShowCommentModal] = useState(false);
  const [modalAction, setModalAction] = useState(""); // "approve" or "reject"
  const [modalRequestId, setModalRequestId] = useState("");
  const [adminComment, setAdminComment] = useState("");

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/reset-requests`, {
        headers,
        params: { status: statusFilter },
      });
      setRequests(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (action, requestId) => {
    setModalAction(action);
    setModalRequestId(requestId);
    setAdminComment("");
    setShowCommentModal(true);
  };

  const handleSubmitAction = async () => {
    setMsg("");
    setCredentials(null);
    setShowCommentModal(false);

    try {
      if (modalAction === "approve") {
        const res = await axios.post(
          `${API}/approve-reset/${modalRequestId}`,
          { comment: adminComment },
          { headers }
        );
        setMsg(res.data.msg);
        setCredentials(res.data.credentials);
      } else {
        const res = await axios.post(
          `${API}/reject-reset/${modalRequestId}`,
          { comment: adminComment },
          { headers }
        );
        setMsg(res.data.msg);
      }
      fetchRequests();
    } catch (err) {
      setMsg(err.response?.data?.msg || "Action failed");
    }
  };

  const fmt = (d) => (d ? new Date(d).toLocaleString() : "—");

  return (
    <div>
      <h2>Password Reset Requests</h2>
      <p style={{ fontSize: 13, color: "#888" }}>
        Review organizer password reset requests. Approve to auto-generate a new password, or reject with a reason.
      </p>

      {/* Status filter tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {["pending", "approved", "rejected", "all"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: "6px 16px", border: "1px solid #ccc", borderRadius: 20,
              background: statusFilter === s ? "#2563eb" : "#fff",
              color: statusFilter === s ? "#fff" : "#333",
              cursor: "pointer", fontSize: 13, textTransform: "capitalize",
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {msg && (
        <p style={{ color: "#059669", background: "#dcfce7", padding: 10, borderRadius: 6, marginBottom: 12 }}>
          {msg}
        </p>
      )}

      {/* Credential reveal box */}
      {credentials && (
        <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, padding: 14, marginBottom: 12 }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#92400e" }}>
            New Credentials (share with the organizer):
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 14, fontFamily: "monospace" }}>
            <strong>Email:</strong> {credentials.email}
            <br />
            <strong>Password:</strong> {credentials.password}
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `Email: ${credentials.email}\nPassword: ${credentials.password}`
              );
              setMsg("Credentials copied to clipboard!");
            }}
            style={{
              marginTop: 8, padding: "4px 12px", background: "#f59e0b",
              color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontSize: 12,
            }}
          >
            Copy to Clipboard
          </button>
        </div>
      )}

      {/* Request list */}
      {loading ? (
        <p>Loading...</p>
      ) : requests.length === 0 ? (
        <p style={{ color: "#888", textAlign: "center", padding: 30 }}>
          No {statusFilter !== "all" ? statusFilter : ""} requests found.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {requests.map((r) => {
            const org = r.organizer || {};
            const sc = STATUS_COLORS[r.status] || STATUS_COLORS.pending;
            return (
              <div
                key={r._id}
                style={{
                  border: "1px solid #e5e7eb", borderRadius: 8, padding: 14, background: "#fff",
                }}
              >
                {/* Header row */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <strong style={{ fontSize: 15 }}>{org.name || "Unknown"}</strong>
                    {org.category && (
                      <span style={{ fontSize: 12, color: "#888", marginLeft: 8 }}>
                        ({org.category})
                      </span>
                    )}
                    <br />
                    <span style={{ fontSize: 13, color: "#666" }}>{org.email}</span>
                  </div>
                  <span
                    style={{
                      fontSize: 11, padding: "3px 10px", borderRadius: 12,
                      background: sc.bg, color: sc.color, fontWeight: 600, textTransform: "capitalize",
                    }}
                  >
                    {r.status}
                  </span>
                </div>

                {/* Reason */}
                <div style={{
                  marginTop: 10, padding: 10, background: "#f9fafb",
                  borderRadius: 6, fontSize: 13, color: "#444",
                }}>
                  <strong>Reason:</strong> {r.reason}
                </div>

                {/* Dates */}
                <div style={{ fontSize: 12, color: "#999", marginTop: 6 }}>
                  Requested: {fmt(r.createdAt)}
                  {r.resolvedAt && <span> · Resolved: {fmt(r.resolvedAt)}</span>}
                </div>

                {/* Admin comment (if resolved) */}
                {r.adminComment && (
                  <div style={{
                    marginTop: 6, padding: 8, background: "#eef2ff",
                    borderRadius: 6, fontSize: 13, color: "#3730a3",
                  }}>
                    <strong>Admin Comment:</strong> {r.adminComment}
                  </div>
                )}

                {/* Generated password (for approved) */}
                {r.status === "approved" && r.generatedPassword && (
                  <div style={{
                    marginTop: 6, padding: 8, background: "#fef3c7",
                    borderRadius: 6, fontSize: 13, fontFamily: "monospace",
                  }}>
                    Generated Password: {r.generatedPassword}
                  </div>
                )}

                {/* Action buttons (only for pending) */}
                {r.status === "pending" && (
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      onClick={() => openModal("approve", r._id)}
                      style={{
                        padding: "6px 16px", background: "#059669", color: "#fff",
                        border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13,
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => openModal("reject", r._id)}
                      style={{
                        padding: "6px 16px", background: "#dc2626", color: "#fff",
                        border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13,
                      }}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Comment Modal */}
      {showCommentModal && (
        <div
          style={{
            position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
            background: "rgba(0,0,0,0.4)", display: "flex",
            alignItems: "center", justifyContent: "center", zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff", borderRadius: 10, padding: 24,
              maxWidth: 420, width: "90%",
            }}
          >
            <h3 style={{ marginTop: 0, textTransform: "capitalize" }}>
              {modalAction} Request
            </h3>
            <p style={{ fontSize: 13, color: "#666" }}>
              {modalAction === "approve"
                ? "A new password will be auto-generated and the organizer's password will be updated."
                : "The request will be rejected. Optionally add a reason."}
            </p>
            <label style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
              Comment {modalAction === "reject" ? "(recommended)" : "(optional)"}
            </label>
            <textarea
              value={adminComment}
              onChange={(e) => setAdminComment(e.target.value)}
              placeholder={modalAction === "approve" ? "Any notes..." : "Why is this being rejected?"}
              rows={3}
              style={{
                width: "100%", padding: 8, border: "1px solid #ccc",
                borderRadius: 6, fontSize: 13, boxSizing: "border-box",
              }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowCommentModal(false)}
                style={{
                  padding: "8px 16px", background: "#f3f4f6", border: "1px solid #ccc",
                  borderRadius: 6, cursor: "pointer", fontSize: 13,
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAction}
                style={{
                  padding: "8px 16px",
                  background: modalAction === "approve" ? "#059669" : "#dc2626",
                  color: "#fff", border: "none", borderRadius: 6,
                  cursor: "pointer", fontSize: 13,
                }}
              >
                {modalAction === "approve" ? "Approve & Generate Password" : "Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
