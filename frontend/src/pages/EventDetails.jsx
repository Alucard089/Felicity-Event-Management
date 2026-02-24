import { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { API_EVENTS as _API_EVENTS, API_REGISTRATIONS, API_FEEDBACK, API_TEAMS } from "../config";
import DiscussionForum from "../components/DiscussionForum";

const API_EVENTS = _API_EVENTS;
const API_REG = API_REGISTRATIONS;

export default function EventDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const headers = { "x-auth-token": token };

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [myRegistration, setMyRegistration] = useState(null);
  const [regCount, setRegCount] = useState(0);

  // Registration form state
  const [customResponses, setCustomResponses] = useState({});
  const [selectedVariant, setSelectedVariant] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [teamName, setTeamName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Ticket view
  const [ticket, setTicket] = useState(null);
  const [showTicket, setShowTicket] = useState(false);

  // Payment proof state (merchandise)
  const [proofPreview, setProofPreview] = useState(null);
  const [uploadingProof, setUploadingProof] = useState(false);
  const [proofMsg, setProofMsg] = useState("");

  // Feedback state
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [feedbackList, setFeedbackList] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState(null);
  const [feedbackFilterRating, setFeedbackFilterRating] = useState("all");

  // Hackathon team state
  const [myTeam, setMyTeam] = useState(null);
  const [newTeamName, setNewTeamName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [teamMsg, setTeamMsg] = useState("");

  useEffect(() => {
    fetchEvent();
    fetchMyRegistration();
  }, [id]);

  // If ticket param is present, fetch ticket
  useEffect(() => {
    const ticketId = searchParams.get("ticket");
    if (ticketId) {
      fetchTicket(ticketId);
    }
  }, [searchParams]);

  const fetchEvent = async () => {
    try {
      const res = await axios.get(`${API_EVENTS}/${id}`, { headers });
      setEvent(res.data);
      // Get registration count
      const allEvents = await axios.get(API_EVENTS, { headers });
      const thisEvent = allEvents.data.find((e) => e._id === id);
      if (thisEvent) setRegCount(thisEvent.registrationCount || 0);
    } catch (err) {
      setError("Event not found");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRegistration = async () => {
    try {
      const res = await axios.get(API_REG, { headers });
      const mine = res.data.find(
        (r) =>
          r.event &&
          r.event._id === id &&
          ["confirmed", "pending_payment", "pending_approval", "rejected"].includes(r.status)
      );
      if (mine) setMyRegistration(mine);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTicket = async (ticketId) => {
    try {
      const res = await axios.get(`${API_REG}/ticket/${ticketId}`, { headers });
      setTicket(res.data);
      setShowTicket(true);
    } catch (err) {
      console.error(err);
    }
  };

  // ---- Feedback functions ----
  const fetchFeedback = async (ratingFilter) => {
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

  const checkMyFeedback = async () => {
    try {
      const res = await axios.get(`${API_FEEDBACK}/${id}/my`, { headers });
      if (res.data.submitted) setFeedbackSubmitted(true);
    } catch (err) {
      console.error(err);
    }
  };

  const submitFeedback = async () => {
    setFeedbackMsg("");
    if (feedbackRating < 1 || feedbackRating > 5) {
      setFeedbackMsg("Please select a rating (1-5 stars)");
      return;
    }
    try {
      await axios.post(`${API_FEEDBACK}/${id}`, { rating: feedbackRating, comment: feedbackComment }, { headers });
      setFeedbackMsg("Thank you for your feedback!");
      setFeedbackSubmitted(true);
      fetchFeedback(feedbackFilterRating);
    } catch (err) {
      setFeedbackMsg(err.response?.data?.msg || "Failed to submit feedback");
    }
  };

  // Load feedback when event is completed/closed
  useEffect(() => {
    if (event && ["completed", "closed"].includes(event.status)) {
      fetchFeedback(feedbackFilterRating);
      if (myRegistration) checkMyFeedback();
    }
  }, [event, myRegistration, feedbackFilterRating]);

  // ---- Hackathon team functions ----
  const fetchMyTeam = async () => {
    try {
      const res = await axios.get(`${API_TEAMS}/my/${id}`, { headers });
      setMyTeam(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (event && event.eventType === "hackathon") {
      fetchMyTeam();
    }
  }, [event]);

  const createTeam = async () => {
    setTeamMsg("");
    if (!newTeamName.trim()) {
      setTeamMsg("Enter a team name");
      return;
    }
    try {
      const res = await axios.post(`${API_TEAMS}/${id}`, { teamName: newTeamName.trim() }, { headers });
      setTeamMsg(res.data.msg);
      setMyTeam(res.data.team);
      setNewTeamName("");
    } catch (err) {
      setTeamMsg(err.response?.data?.msg || "Failed to create team");
    }
  };

  const joinTeam = async () => {
    setTeamMsg("");
    if (!joinCode.trim()) {
      setTeamMsg("Enter a join code");
      return;
    }
    try {
      const res = await axios.post(`${API_TEAMS}/join`, { joinCode: joinCode.trim() }, { headers });
      setTeamMsg(res.data.msg);
      setMyTeam(res.data.team);
      setJoinCode("");
    } catch (err) {
      setTeamMsg(err.response?.data?.msg || "Failed to join team");
    }
  };

  const lockTeam = async () => {
    if (!window.confirm("Lock team and register all members? This cannot be undone.")) return;
    setTeamMsg("");
    try {
      const res = await axios.put(`${API_TEAMS}/${myTeam._id}/lock`, {}, { headers });
      setTeamMsg(res.data.msg);
      fetchMyTeam();
      fetchMyRegistration();
    } catch (err) {
      setTeamMsg(err.response?.data?.msg || "Failed to lock team");
    }
  };

  const leaveTeam = async () => {
    if (!window.confirm("Leave this team?")) return;
    setTeamMsg("");
    try {
      await axios.put(`${API_TEAMS}/${myTeam._id}/leave`, {}, { headers });
      setTeamMsg("Left the team");
      setMyTeam(null);
    } catch (err) {
      setTeamMsg(err.response?.data?.msg || "Failed to leave team");
    }
  };

  const deleteTeam = async () => {
    if (!window.confirm("Delete this team? All members will be removed.")) return;
    setTeamMsg("");
    try {
      await axios.delete(`${API_TEAMS}/${myTeam._id}`, { headers });
      setTeamMsg("Team deleted");
      setMyTeam(null);
    } catch (err) {
      setTeamMsg(err.response?.data?.msg || "Failed to delete team");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const payload = {
        customFieldResponses: event.eventType === "normal" ? customResponses : {},
        selectedVariant: event.eventType === "merchandise" ? selectedVariant : undefined,
        quantity: event.eventType === "merchandise" ? quantity : 1,
        teamName,
      };
      const res = await axios.post(`${API_REG}/${id}`, payload, { headers });
      setSuccess(res.data.msg || `Registration successful! Ticket ID: ${res.data.ticketId}`);
      setMyRegistration(res.data.registration);

      // Only show ticket modal for normal events (merchandise needs payment proof first)
      if (event.eventType !== "merchandise") {
        setTicket(res.data.registration);
        setShowTicket(true);
      }
      fetchEvent(); // refresh counts
    } catch (err) {
      setError(err.response?.data?.msg || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  // ---- Payment proof upload ----
  const handleProofFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProofMsg("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setProofMsg("Image must be under 5 MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setProofPreview(reader.result);
    reader.readAsDataURL(file);
  };

  const handleUploadProof = async () => {
    if (!proofPreview) {
      setProofMsg("Please select an image first");
      return;
    }
    setUploadingProof(true);
    setProofMsg("");
    try {
      const res = await axios.post(
        `${API_REG}/${myRegistration._id}/upload-proof`,
        { imageData: proofPreview },
        { headers }
      );
      setProofMsg(res.data.msg);
      // Refresh registration to get updated status
      fetchMyRegistration();
    } catch (err) {
      setProofMsg(err.response?.data?.msg || "Upload failed");
    } finally {
      setUploadingProof(false);
    }
  };

  if (loading) return <p>Loading...</p>;
  if (!event) return <p style={{ color: "red" }}>{error || "Event not found"}</p>;

  const now = new Date();
  const deadlinePassed = event.registrationDeadline && new Date(event.registrationDeadline) < now;
  const eventStarted = new Date(event.startDate) < now;
  const limitReached = event.registrationLimit > 0 && regCount >= event.registrationLimit;
  const ineligible = event.eligibility === "iiit_only" && !user.isIIIT;
  const alreadyRegistered = !!myRegistration;

  // For merchandise — check all variants out of stock
  const allOutOfStock = event.eventType === "merchandise" &&
    event.variants.every((v) => v.stock <= 0);

  const canRegister = !deadlinePassed && !eventStarted && !limitReached && !ineligible && !alreadyRegistered && !allOutOfStock;

  const fmt = (d) => d ? new Date(d).toLocaleString() : "—";

  return (
    <div>
      {/* Ticket Modal */}
      {showTicket && ticket && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center",
          justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{
            background: "#fff", borderRadius: 12, padding: 32, maxWidth: 420,
            width: "90%", textAlign: "center", position: "relative",
          }}>
            <button
              onClick={() => setShowTicket(false)}
              style={{
                position: "absolute", top: 12, right: 12, background: "none",
                border: "none", fontSize: 20, cursor: "pointer", color: "#666",
              }}
            >
              ✕
            </button>
            <h3 style={{ marginTop: 0, color: "#4f46e5" }}>Event Ticket</h3>
            {ticket.status === "confirmed" ? (
              <div style={{ margin: "16px auto", display: "inline-block" }}>
                <QRCodeSVG
                  value={JSON.stringify({
                    ticketId: ticket.ticketId,
                    event: ticket.event?.name || event.name,
                    participant: `${ticket.participant?.firstName || user.firstName} ${ticket.participant?.lastName || user.lastName}`,
                    email: ticket.participant?.email || user.email,
                  })}
                  size={180}
                  level="M"
                />
              </div>
            ) : (
              <div style={{ margin: "16px 0", padding: 12, background: "#fefce8", borderRadius: 8, fontSize: 14, color: "#854d0e" }}>
                QR code will be generated once payment is approved.
              </div>
            )}
            <div style={{ textAlign: "left", fontSize: 14, lineHeight: 1.8 }}>
              <p><strong>Ticket ID:</strong> {ticket.ticketId}</p>
              <p><strong>Event:</strong> {ticket.event?.name || event.name}</p>
              <p><strong>Type:</strong> {event.eventType}</p>
              <p><strong>Participant:</strong> {ticket.participant?.firstName || user.firstName} {ticket.participant?.lastName || user.lastName}</p>
              <p><strong>Email:</strong> {ticket.participant?.email || user.email}</p>
              {ticket.participant?.college && <p><strong>College:</strong> {ticket.participant.college}</p>}
              {ticket.teamName && <p><strong>Team:</strong> {ticket.teamName}</p>}
              {event.eventType === "merchandise" && ticket.quantity && (
                <p><strong>Quantity:</strong> {ticket.quantity}</p>
              )}
              <p><strong>Status:</strong> <span style={{ color: ticket.status === "confirmed" ? "green" : "red" }}>{ticket.status}</span></p>
              <p><strong>Registered:</strong> {fmt(ticket.createdAt)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        style={{ marginBottom: 12, padding: "6px 16px", background: "#888", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}
      >
        ← Back
      </button>

      {/* Event Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ marginBottom: 4 }}>
          {event.name}
          <span style={{
            fontSize: 13, padding: "4px 12px", borderRadius: 12, marginLeft: 10,
            background: event.eventType === "merchandise" ? "#f59e0b" : "#3b82f6",
            color: "#fff", verticalAlign: "middle",
          }}>
            {event.eventType}
          </span>
        </h2>
        {event.organizer && (
          <p style={{ fontSize: 14, color: "#666" }}>
            by{" "}
            <span
              style={{ color: "#4f46e5", cursor: "pointer", textDecoration: "underline" }}
              onClick={() => navigate(`/clubs/${event.organizer._id}`)}
            >
              {event.organizer.name}
            </span>
            {event.organizer.category && ` · ${event.organizer.category}`}
          </p>
        )}
      </div>

      {/* Event Details */}
      <div style={{ background: "#f9fafb", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        {event.description && <p style={{ margin: "0 0 12px" }}>{event.description}</p>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 14 }}>
          <p><strong>Start:</strong> {fmt(event.startDate)}</p>
          <p><strong>End:</strong> {event.endDate ? fmt(event.endDate) : "—"}</p>
          <p><strong>Deadline:</strong> {event.registrationDeadline ? fmt(event.registrationDeadline) : "No deadline"}</p>
          <p><strong>Fee:</strong> {event.registrationFee ? `₹${event.registrationFee}` : "Free"}</p>
          <p><strong>Eligibility:</strong> {event.eligibility === "iiit_only" ? "IIIT Students Only" : "Open to All"}</p>
          <p><strong>Limit:</strong> {event.registrationLimit > 0 ? `${regCount}/${event.registrationLimit}` : "Unlimited"}</p>
        </div>

        {event.tags && event.tags.length > 0 && (
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 12 }}>
            {event.tags.map((t) => (
              <span key={t} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 12, background: "#e0e7ff", color: "#4338ca" }}>
                {t}
              </span>
            ))}
          </div>
        )}

        {event.organizer?.contactEmail && (
          <p style={{ fontSize: 13, color: "#888", marginTop: 12 }}>
            Contact: {event.organizer.contactEmail}
          </p>
        )}
      </div>

      {/* Merchandise Variants */}
      {event.eventType === "merchandise" && event.variants && event.variants.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3>Available Variants</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
            {event.variants.map((v) => (
              <div key={v._id} style={{
                padding: 12, border: "1px solid #e5e7eb", borderRadius: 8,
                background: v.stock <= 0 ? "#fef2f2" : "#fff",
                opacity: v.stock <= 0 ? 0.6 : 1,
              }}>
                <p style={{ fontWeight: 600, margin: "0 0 4px" }}>{v.label || `${v.size} ${v.color}`}</p>
                {v.size && <p style={{ fontSize: 12, color: "#666", margin: "2px 0" }}>Size: {v.size}</p>}
                {v.color && <p style={{ fontSize: 12, color: "#666", margin: "2px 0" }}>Color: {v.color}</p>}
                <p style={{ fontSize: 12, color: v.stock <= 0 ? "#ef4444" : "#16a34a", margin: "2px 0" }}>
                  {v.stock <= 0 ? "Out of Stock" : `${v.stock} in stock`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blocking messages */}
      {deadlinePassed && !alreadyRegistered && (
        <div style={{ padding: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, marginBottom: 16, color: "#991b1b" }}>
          Registration deadline has passed.
        </div>
      )}
      {eventStarted && !deadlinePassed && !alreadyRegistered && (
        <div style={{ padding: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, marginBottom: 16, color: "#991b1b" }}>
          This event has already started.
        </div>
      )}
      {limitReached && !alreadyRegistered && (
        <div style={{ padding: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, marginBottom: 16, color: "#991b1b" }}>
          Registration limit has been reached.
        </div>
      )}
      {allOutOfStock && !alreadyRegistered && (
        <div style={{ padding: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, marginBottom: 16, color: "#991b1b" }}>
          All variants are out of stock.
        </div>
      )}
      {ineligible && (
        <div style={{ padding: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, marginBottom: 16, color: "#991b1b" }}>
          This event is restricted to IIIT students.
        </div>
      )}

      {/* Already registered */}
      {alreadyRegistered && myRegistration.status === "confirmed" && (
        <div style={{ padding: 16, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, marginBottom: 16 }}>
          <p style={{ color: "#166534", fontWeight: 600, margin: 0 }}>
            ✓ You are registered for this event
          </p>
          <p style={{ fontSize: 13, color: "#166534", margin: "4px 0" }}>
            Ticket ID:{" "}
            <span
              style={{ cursor: "pointer", textDecoration: "underline" }}
              onClick={() => fetchTicket(myRegistration.ticketId)}
            >
              {myRegistration.ticketId}
            </span>
          </p>
          <button
            onClick={() => fetchTicket(myRegistration.ticketId)}
            style={{
              marginTop: 8, padding: "6px 16px", background: "#4f46e5", color: "#fff",
              border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13,
            }}
          >
            View Ticket & QR Code
          </button>
        </div>
      )}

      {/* Merchandise — pending payment proof upload */}
      {alreadyRegistered && myRegistration.status === "pending_payment" && (
        <div style={{ padding: 20, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 8, marginBottom: 16 }}>
          <h4 style={{ margin: "0 0 8px", color: "#92400e" }}>📦 Order Placed — Upload Payment Proof</h4>
          <p style={{ fontSize: 13, color: "#78350f", margin: "0 0 16px" }}>
            Your order has been placed. Please upload a screenshot or photo of your payment to proceed.
          </p>

          <input
            type="file"
            accept="image/*"
            onChange={handleProofFile}
            style={{ marginBottom: 12, display: "block" }}
          />

          {proofPreview && (
            <div style={{ marginBottom: 12 }}>
              <img
                src={proofPreview}
                alt="Payment proof preview"
                style={{ maxWidth: 300, maxHeight: 200, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
            </div>
          )}

          <button
            onClick={handleUploadProof}
            disabled={uploadingProof || !proofPreview}
            style={{
              padding: "8px 20px",
              background: uploadingProof || !proofPreview ? "#9ca3af" : "#f59e0b",
              color: "#fff", border: "none", borderRadius: 6,
              cursor: uploadingProof || !proofPreview ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 600,
            }}
          >
            {uploadingProof ? "Uploading..." : "Upload Payment Proof"}
          </button>

          {proofMsg && (
            <p style={{ marginTop: 8, fontSize: 13, color: proofMsg.includes("Waiting") ? "green" : "#b91c1c" }}>
              {proofMsg}
            </p>
          )}
        </div>
      )}

      {/* Merchandise — pending organizer approval */}
      {alreadyRegistered && myRegistration.status === "pending_approval" && (
        <div style={{ padding: 16, background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, marginBottom: 16 }}>
          <p style={{ color: "#1e40af", fontWeight: 600, margin: 0 }}>
            ⏳ Payment Proof Submitted — Waiting for Organizer Approval
          </p>
          <p style={{ fontSize: 13, color: "#1e40af", margin: "6px 0 0" }}>
            Your payment proof is being reviewed. You'll receive a confirmation email once approved.
          </p>
        </div>
      )}

      {/* Merchandise — rejected payment (allow re-upload) */}
      {alreadyRegistered && myRegistration.status === "rejected" && (
        <div style={{ padding: 20, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, marginBottom: 16 }}>
          <p style={{ color: "#991b1b", fontWeight: 600, margin: "0 0 8px" }}>
            ✗ Payment was rejected by the organizer
          </p>
          <p style={{ fontSize: 13, color: "#991b1b", margin: "0 0 16px" }}>
            You can upload a new payment proof to retry.
          </p>

          <input
            type="file"
            accept="image/*"
            onChange={handleProofFile}
            style={{ marginBottom: 12, display: "block" }}
          />

          {proofPreview && (
            <div style={{ marginBottom: 12 }}>
              <img
                src={proofPreview}
                alt="Payment proof preview"
                style={{ maxWidth: 300, maxHeight: 200, borderRadius: 8, border: "1px solid #e5e7eb" }}
              />
            </div>
          )}

          <button
            onClick={handleUploadProof}
            disabled={uploadingProof || !proofPreview}
            style={{
              padding: "8px 20px",
              background: uploadingProof || !proofPreview ? "#9ca3af" : "#f59e0b",
              color: "#fff", border: "none", borderRadius: 6,
              cursor: uploadingProof || !proofPreview ? "not-allowed" : "pointer",
              fontSize: 14, fontWeight: 600,
            }}
          >
            {uploadingProof ? "Uploading..." : "Re-upload Payment Proof"}
          </button>

          {proofMsg && (
            <p style={{ marginTop: 8, fontSize: 13, color: proofMsg.includes("Waiting") ? "green" : "#b91c1c" }}>
              {proofMsg}
            </p>
          )}
        </div>
      )}

      {/* Hackathon Team Section */}
      {event.eventType === "hackathon" && !alreadyRegistered && !deadlinePassed && !eventStarted && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 20, marginBottom: 20 }}>
          <h3 style={{ marginTop: 0 }}>Hackathon Team</h3>
          {teamMsg && <p style={{ color: teamMsg.includes("fail") || teamMsg.includes("Failed") || teamMsg.includes("already") || teamMsg.includes("Enter") ? "red" : "green", fontSize: 13 }}>{teamMsg}</p>}

          {!myTeam ? (
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
              {/* Create team */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <h4 style={{ marginTop: 0 }}>Create a Team</h4>
                <input
                  placeholder="Team name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4, marginBottom: 8 }}
                />
                <button
                  onClick={createTeam}
                  style={{ padding: "8px 16px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
                >
                  Create Team
                </button>
              </div>

              {/* Join team */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <h4 style={{ marginTop: 0 }}>Join a Team</h4>
                <input
                  placeholder="Enter join code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4, marginBottom: 8 }}
                />
                <button
                  onClick={joinTeam}
                  style={{ padding: "8px 16px", background: "#059669", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
                >
                  Join Team
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: 16, marginBottom: 12 }}>
                <h4 style={{ margin: 0 }}>{myTeam.name}</h4>
                {!myTeam.isLocked && (
                  <p style={{ margin: "6px 0 0", fontSize: 13, color: "#555" }}>
                    Join Code: <strong style={{ fontFamily: "monospace", fontSize: 15 }}>{myTeam.joinCode}</strong>
                  </p>
                )}
                <p style={{ margin: "8px 0 4px", fontSize: 13, color: "#666" }}>
                  Members ({myTeam.members.length}/{event.maxTeamSize}):
                </p>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {myTeam.members.map((m) => (
                    <li key={m._id} style={{ fontSize: 13 }}>
                      {m.name} {m._id === myTeam.leader._id && <span style={{ color: "#6366f1", fontWeight: 600 }}>(Leader)</span>}
                    </li>
                  ))}
                </ul>
              </div>

              {myTeam.isLocked ? (
                <p style={{ color: "green", fontWeight: 600 }}>Team locked & all members registered!</p>
              ) : (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {user._id === myTeam.leader._id && (
                    <>
                      <button
                        onClick={lockTeam}
                        disabled={myTeam.members.length < event.minTeamSize}
                        title={myTeam.members.length < event.minTeamSize ? `Need at least ${event.minTeamSize} members` : ""}
                        style={{
                          padding: "8px 16px", background: myTeam.members.length < event.minTeamSize ? "#9ca3af" : "#059669",
                          color: "#fff", border: "none", borderRadius: 6,
                          cursor: myTeam.members.length < event.minTeamSize ? "not-allowed" : "pointer"
                        }}
                      >
                        Lock & Register ({myTeam.members.length}/{event.minTeamSize} min)
                      </button>
                      <button
                        onClick={deleteTeam}
                        style={{ padding: "8px 16px", background: "#dc2626", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
                      >
                        Delete Team
                      </button>
                    </>
                  )}
                  {user._id !== myTeam.leader._id && (
                    <button
                      onClick={leaveTeam}
                      style={{ padding: "8px 16px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
                    >
                      Leave Team
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <p style={{ fontSize: 12, color: "#999", marginTop: 12, marginBottom: 0 }}>
            Team size: {event.minTeamSize}–{event.maxTeamSize} members. Leader must lock the team to register everyone.
          </p>
        </div>
      )}

      {/* Registration / Purchase Form */}
      {canRegister && event.eventType !== "hackathon" && (
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>
            {event.eventType === "merchandise" ? "Purchase" : "Register"}
          </h3>

          {error && <p style={{ color: "red" }}>{error}</p>}
          {success && <p style={{ color: "green" }}>{success}</p>}

          <form onSubmit={handleRegister}>
            {/* Normal event — custom fields */}
            {event.eventType === "normal" && event.customFields && event.customFields.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <p style={{ fontSize: 13, color: "#888", marginBottom: 8 }}>Please fill out the registration form:</p>
                {event.customFields.map((field, idx) => (
                  <div key={idx} style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                      {field.label} {field.required && <span style={{ color: "red" }}>*</span>}
                    </label>
                    {field.type === "select" ? (
                      <select
                        required={field.required}
                        value={customResponses[field.label] || ""}
                        onChange={(e) => setCustomResponses({ ...customResponses, [field.label]: e.target.value })}
                        style={{ width: "100%", padding: 6, border: "1px solid #ccc", borderRadius: 4 }}
                      >
                        <option value="">Select...</option>
                        {(field.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : field.type === "textarea" ? (
                      <textarea
                        required={field.required}
                        value={customResponses[field.label] || ""}
                        onChange={(e) => setCustomResponses({ ...customResponses, [field.label]: e.target.value })}
                        style={{ width: "100%", padding: 6, border: "1px solid #ccc", borderRadius: 4 }}
                        rows={3}
                      />
                    ) : field.type === "checkbox" ? (
                      <input
                        type="checkbox"
                        checked={customResponses[field.label] || false}
                        onChange={(e) => setCustomResponses({ ...customResponses, [field.label]: e.target.checked })}
                      />
                    ) : (
                      <input
                        type={field.type}
                        required={field.required}
                        value={customResponses[field.label] || ""}
                        onChange={(e) => setCustomResponses({ ...customResponses, [field.label]: e.target.value })}
                        style={{ width: "100%", padding: 6, border: "1px solid #ccc", borderRadius: 4 }}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Merchandise event — variant & quantity selection */}
            {event.eventType === "merchandise" && (
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                  Select Variant <span style={{ color: "red" }}>*</span>
                </label>
                <select
                  required
                  value={selectedVariant}
                  onChange={(e) => setSelectedVariant(e.target.value)}
                  style={{ width: "100%", padding: 6, border: "1px solid #ccc", borderRadius: 4, marginBottom: 8 }}
                >
                  <option value="">Choose a variant...</option>
                  {event.variants
                    .filter((v) => v.stock > 0)
                    .map((v) => (
                      <option key={v._id} value={v._id}>
                        {v.label || `${v.size} ${v.color}`} — {v.stock} in stock
                      </option>
                    ))}
                </select>

                <label style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                  Quantity (max {event.purchaseLimit} per person)
                </label>
                <input
                  type="number"
                  min="1"
                  max={event.purchaseLimit}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  style={{ width: 80, padding: 6, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </div>
            )}

            {/* Optional team name */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 13, display: "block", marginBottom: 4 }}>Team Name (optional)</label>
              <input
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="Enter team name if applicable"
                style={{ width: "100%", padding: 6, border: "1px solid #ccc", borderRadius: 4 }}
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{
                width: "100%", padding: 12,
                background: submitting ? "#9ca3af" : "#4f46e5",
                color: "#fff", border: "none", borderRadius: 6,
                cursor: submitting ? "not-allowed" : "pointer",
                fontSize: 15, fontWeight: 600,
              }}
            >
              {submitting
                ? "Processing..."
                : event.eventType === "merchandise"
                  ? `Purchase${event.registrationFee ? ` — ₹${event.registrationFee * quantity}` : ""}`
                  : event.registrationFee
                    ? `Register — ₹${event.registrationFee}`
                    : "Register"
              }
            </button>
          </form>
        </div>
      )}

      {/* ===== DISCUSSION FORUM (visible when registered) ===== */}
      {(alreadyRegistered || ["completed", "closed"].includes(event.status)) && (
        <DiscussionForum eventId={id} isOrganizer={false} />
      )}

      {/* ===== FEEDBACK SECTION (only for completed/closed events) ===== */}
      {["completed", "closed"].includes(event.status) && (
        <div style={{ marginTop: 30, borderTop: "2px solid #e5e7eb", paddingTop: 20 }}>
          <h3 style={{ marginBottom: 16 }}>Event Feedback</h3>

          {/* Submit feedback form — only if registered and not yet submitted */}
          {myRegistration && !feedbackSubmitted && (
            <div style={{ background: "#f9fafb", borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <h4 style={{ marginTop: 0, fontSize: 15 }}>Leave Your Feedback (Anonymous)</h4>

              {/* Star Rating */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, display: "block", marginBottom: 6 }}>Rating</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span
                      key={star}
                      onClick={() => setFeedbackRating(star)}
                      style={{
                        fontSize: 28, cursor: "pointer",
                        color: star <= feedbackRating ? "#f59e0b" : "#d1d5db",
                      }}
                    >
                      ★
                    </span>
                  ))}
                  {feedbackRating > 0 && (
                    <span style={{ fontSize: 13, color: "#666", marginLeft: 8, alignSelf: "center" }}>
                      {feedbackRating}/5
                    </span>
                  )}
                </div>
              </div>

              {/* Comment */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, display: "block", marginBottom: 4 }}>Comment (optional)</label>
                <textarea
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Share your experience..."
                  rows={3}
                  style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 6, fontSize: 13 }}
                />
              </div>

              <button
                onClick={submitFeedback}
                style={{
                  padding: "8px 20px", background: "#4f46e5", color: "#fff",
                  border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14,
                }}
              >
                Submit Feedback
              </button>

              {feedbackMsg && (
                <p style={{ marginTop: 8, fontSize: 13, color: feedbackMsg.includes("Thank") ? "green" : "red" }}>
                  {feedbackMsg}
                </p>
              )}
            </div>
          )}

          {/* Already submitted message */}
          {myRegistration && feedbackSubmitted && (
            <div style={{
              padding: 12, background: "#f0fdf4", border: "1px solid #bbf7d0",
              borderRadius: 8, marginBottom: 16, color: "#166534", fontSize: 14,
            }}>
              ✓ You have already submitted your feedback for this event.
            </div>
          )}

          {/* Aggregated Stats */}
          {feedbackStats && feedbackStats.total > 0 && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 32, fontWeight: 700, margin: 0, color: "#f59e0b" }}>
                    {feedbackStats.avgRating}
                  </p>
                  <div style={{ color: "#f59e0b", fontSize: 18 }}>
                    {"★".repeat(Math.round(feedbackStats.avgRating))}
                    {"☆".repeat(5 - Math.round(feedbackStats.avgRating))}
                  </div>
                  <p style={{ fontSize: 12, color: "#888", margin: "4px 0 0" }}>
                    {feedbackStats.total} review{feedbackStats.total !== 1 ? "s" : ""}
                  </p>
                </div>
                <div style={{ flex: 1 }}>
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = feedbackStats.distribution[star] || 0;
                    const pct = feedbackStats.total > 0 ? (count / feedbackStats.total) * 100 : 0;
                    return (
                      <div key={star} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 12, width: 20, textAlign: "right" }}>{star}★</span>
                        <div style={{ flex: 1, height: 8, background: "#f3f4f6", borderRadius: 4 }}>
                          <div style={{ width: `${pct}%`, height: "100%", background: "#f59e0b", borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 11, color: "#888", width: 20 }}>{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Rating Filter */}
          {feedbackStats && feedbackStats.total > 0 && (
            <div style={{ marginBottom: 12, display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "#666" }}>Filter:</span>
              {["all", 5, 4, 3, 2, 1].map((val) => (
                <button
                  key={val}
                  onClick={() => setFeedbackFilterRating(val)}
                  style={{
                    padding: "4px 10px", border: "1px solid #ccc", borderRadius: 12,
                    background: feedbackFilterRating == val ? "#4f46e5" : "#fff",
                    color: feedbackFilterRating == val ? "#fff" : "#333",
                    cursor: "pointer", fontSize: 12,
                  }}
                >
                  {val === "all" ? "All" : `${val}★`}
                </button>
              ))}
            </div>
          )}

          {/* Feedback List */}
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
                {fb.comment && <p style={{ margin: "4px 0 0", fontSize: 13, color: "#444" }}>{fb.comment}</p>}
              </div>
            ))
          ) : (
            feedbackStats && feedbackStats.total === 0 && (
              <p style={{ color: "#888", textAlign: "center", padding: 16 }}>No feedback yet.</p>
            )
          )}
        </div>
      )}
    </div>
  );
}
