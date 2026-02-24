import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

import { API_EVENTS } from "../config";

const API = API_EVENTS;

const CATEGORIES = [
  "Technology", "Robotics & Electronics", "Sports", "Dramatics", "Design",
  "Comedy & Humour", "Literature", "Photography", "Fashion", "Art",
  "Chess", "Dance", "Debate", "Gaming", "Language & Culture",
  "Music", "Quiz", "Career & Motivation", "Community & Inclusion",
];

const FIELD_TYPES = ["text", "number", "email", "select", "checkbox", "textarea"];

export default function CreateEvent() {
  const navigate = useNavigate();
  const { id: editId } = useParams(); // if present, we are editing
  const token = localStorage.getItem("token");
  const headers = { "x-auth-token": token };

  const [form, setForm] = useState({
    name: "", description: "", eventType: "normal",
    eligibility: "all", registrationDeadline: "", startDate: "", endDate: "",
    registrationLimit: "", registrationFee: "", purchaseLimit: "1",
    maxTeamSize: "4", minTeamSize: "2",
  });
  const [tags, setTags] = useState([]);
  const [customFields, setCustomFields] = useState([]);
  const [variants, setVariants] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!editId);

  // Edit-mode state
  const [eventStatus, setEventStatus] = useState("draft");
  const [hasRegistrations, setHasRegistrations] = useState(false);

  // Load event for editing
  useEffect(() => {
    if (!editId) return;
    const load = async () => {
      try {
        const [evRes, statsRes] = await Promise.all([
          axios.get(`${API}/${editId}`, { headers }),
          axios.get(`${API}/${editId}/stats`, { headers }),
        ]);
        const ev = evRes.data;
        const stat = ev.status || "draft";
        setEventStatus(stat);
        setHasRegistrations(statsRes.data.registrations > 0);

        // Cannot edit ongoing/completed/closed — redirect
        if (["ongoing", "completed", "closed"].includes(stat)) {
          navigate(`/organizer/event/${editId}`);
          return;
        }

        // Helper to format date for input
        const fmtDate = (d) => {
          if (!d) return "";
          return new Date(d).toISOString().slice(0, 16);
        };

        setForm({
          name: ev.name || "",
          description: ev.description || "",
          eventType: ev.eventType || "normal",
          eligibility: ev.eligibility || "all",
          registrationDeadline: fmtDate(ev.registrationDeadline),
          startDate: fmtDate(ev.startDate),
          endDate: fmtDate(ev.endDate),
          registrationLimit: ev.registrationLimit ? String(ev.registrationLimit) : "",
          registrationFee: ev.registrationFee ? String(ev.registrationFee) : "",
          purchaseLimit: ev.purchaseLimit ? String(ev.purchaseLimit) : "1",
          maxTeamSize: ev.maxTeamSize ? String(ev.maxTeamSize) : "4",
          minTeamSize: ev.minTeamSize ? String(ev.minTeamSize) : "2",
        });
        setTags(ev.tags || []);
        setCustomFields(ev.customFields || []);
        setVariants(ev.variants || []);
      } catch (err) {
        console.error(err);
        setError("Failed to load event.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [editId]);

  const isEditing = !!editId;
  const isPublished = eventStatus === "published";
  const formLocked = hasRegistrations; // custom fields / variants locked after first registration

  // Which fields are disabled in published mode
  const isFieldDisabled = (fieldName) => {
    if (!isEditing) return false;
    if (isPublished) {
      const editableInPublished = ["description", "registrationDeadline", "registrationLimit"];
      return !editableInPublished.includes(fieldName);
    }
    return false;
  };

  const handleChange = (e) => {
    if (isFieldDisabled(e.target.name)) return;
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const toggleTag = (tag) => {
    if (isFieldDisabled("tags")) return;
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // ---- Custom fields (Normal events) ----
  const addField = () => {
    if (formLocked) return;
    setCustomFields([...customFields, { label: "", type: "text", required: false, options: [] }]);
  };

  const updateField = (idx, key, val) => {
    if (formLocked) return;
    const copy = [...customFields];
    copy[idx] = { ...copy[idx], [key]: val };
    setCustomFields(copy);
  };

  const removeField = (idx) => {
    if (formLocked) return;
    setCustomFields(customFields.filter((_, i) => i !== idx));
  };

  // Field reordering
  const moveField = (idx, dir) => {
    if (formLocked) return;
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= customFields.length) return;
    const copy = [...customFields];
    [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
    setCustomFields(copy);
  };

  // ---- Variants (Merchandise events) ----
  const addVariant = () => {
    if (formLocked) return;
    setVariants([...variants, { size: "", color: "", label: "", stock: 0 }]);
  };

  const updateVariant = (idx, key, val) => {
    if (formLocked) return;
    const copy = [...variants];
    copy[idx] = { ...copy[idx], [key]: val };
    setVariants(copy);
  };

  const removeVariant = (idx) => {
    if (formLocked) return;
    setVariants(variants.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const now = new Date();
    const start = new Date(form.startDate);
    const end = form.endDate ? new Date(form.endDate) : null;
    const deadline = form.registrationDeadline ? new Date(form.registrationDeadline) : null;

    // Only validate date fields that are editable
    if (!isFieldDisabled("startDate")) {
      if (start <= now) {
        setError("Start date must be in the future.");
        return;
      }
    }
    if (!isFieldDisabled("endDate") && end && end <= start) {
      setError("End date must be after the start date.");
      return;
    }
    if (!isFieldDisabled("registrationDeadline") && deadline) {
      if (deadline <= now) {
        setError("Registration deadline must be in the future.");
        return;
      }
      if (deadline >= start) {
        setError("Registration deadline must be before the start date.");
        return;
      }
    }

    try {
      const payload = {
        ...form,
        registrationLimit: Number(form.registrationLimit) || 0,
        registrationFee: Number(form.registrationFee) || 0,
        purchaseLimit: Number(form.purchaseLimit) || 1,
        maxTeamSize: Number(form.maxTeamSize) || 4,
        minTeamSize: Number(form.minTeamSize) || 2,
        tags,
        customFields: form.eventType === "normal" ? customFields : [],
        variants: form.eventType === "merchandise" ? variants : [],
      };

      if (isEditing) {
        await axios.put(`${API}/${editId}`, payload, { headers });
      } else {
        await axios.post(API, payload, { headers });
      }
      navigate("/organizer");
    } catch (err) {
      setError(err.response?.data?.msg || "Failed to save event");
    }
  };

  const inputStyle = { width: "100%", padding: 8, marginBottom: 8, boxSizing: "border-box" };
  const disabledStyle = { ...inputStyle, background: "#f3f4f6", color: "#999", cursor: "not-allowed" };

  if (loading) return <p style={{ maxWidth: 600, margin: "40px auto" }}>Loading...</p>;

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>{isEditing ? "Edit Event" : "Create Event"}</h2>
        <button onClick={() => navigate(isEditing ? `/organizer/event/${editId}` : "/organizer")} style={{ padding: "6px 16px", background: "#888", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Back
        </button>
      </div>

      {/* Status indicator in edit mode */}
      {isEditing && (
        <p style={{ fontSize: 13, color: "#666", marginTop: -8, marginBottom: 12 }}>
          Status: <strong style={{ textTransform: "capitalize" }}>{eventStatus}</strong>
          {isPublished && " — Only description, deadline, and registration limit can be edited."}
          {formLocked && " ⚠️ Form fields are locked (participants have already registered)."}
        </p>
      )}

      {error && <p style={{ color: "red" }}>{error}</p>}

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <input
          name="name" placeholder="Event Name" value={form.name} onChange={handleChange} required
          disabled={isFieldDisabled("name")}
          style={isFieldDisabled("name") ? disabledStyle : inputStyle}
        />
        <textarea
          name="description" placeholder="Event Description" value={form.description} onChange={handleChange} rows={3}
          style={inputStyle}
        />

        {/* Event Type */}
        <div style={{ marginBottom: 8 }}>
          <label style={{ marginRight: 16, color: isFieldDisabled("eventType") ? "#999" : undefined }}>
            <input type="radio" name="eventType" value="normal" checked={form.eventType === "normal"} onChange={handleChange} disabled={isFieldDisabled("eventType")} />
            {" "}Normal Event
          </label>
          <label style={{ color: isFieldDisabled("eventType") ? "#999" : undefined }}>
            <input type="radio" name="eventType" value="merchandise" checked={form.eventType === "merchandise"} onChange={handleChange} disabled={isFieldDisabled("eventType")} />
            {" "}Merchandise Event
          </label>
          <label style={{ color: isFieldDisabled("eventType") ? "#999" : undefined }}>
            <input type="radio" name="eventType" value="hackathon" checked={form.eventType === "hackathon"} onChange={handleChange} disabled={isFieldDisabled("eventType")} />
            {" "}Hackathon
          </label>
        </div>

        {/* Eligibility */}
        <select
          name="eligibility" value={form.eligibility} onChange={handleChange}
          disabled={isFieldDisabled("eligibility")}
          style={isFieldDisabled("eligibility") ? disabledStyle : inputStyle}
        >
          <option value="all">Open to All</option>
          <option value="iiit_only">IIIT Students Only</option>
        </select>

        {/* Dates */}
        {(() => {
          const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16);
          const startMin = form.startDate ? new Date(new Date(form.startDate).getTime() + 60000).toISOString().slice(0, 16) : nowLocal;
          return (
            <>
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "#666" }}>Start Date *</label>
                  <input
                    type="datetime-local" name="startDate" value={form.startDate} onChange={handleChange}
                    required min={nowLocal}
                    disabled={isFieldDisabled("startDate")}
                    style={isFieldDisabled("startDate") ? { ...disabledStyle, marginBottom: 0 } : { ...inputStyle, marginBottom: 0 }}
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: 12, color: "#666" }}>End Date</label>
                  <input
                    type="datetime-local" name="endDate" value={form.endDate} onChange={handleChange}
                    min={startMin}
                    disabled={isFieldDisabled("endDate")}
                    style={isFieldDisabled("endDate") ? { ...disabledStyle, marginBottom: 0 } : { ...inputStyle, marginBottom: 0 }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: "#666" }}>Registration Deadline (must be before start date)</label>
                <input
                  type="datetime-local" name="registrationDeadline" value={form.registrationDeadline} onChange={handleChange}
                  min={nowLocal} max={form.startDate || undefined}
                  style={inputStyle}
                />
              </div>
            </>
          );
        })()}

        {/* Limits & Fee */}
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            name="registrationLimit" type="number" min="0" placeholder="Registration Limit (0 = unlimited)"
            value={form.registrationLimit} onChange={handleChange}
            style={{ ...inputStyle, flex: 1 }}
          />
          <input
            name="registrationFee" type="number" min="0" placeholder="Fee (₹)"
            value={form.registrationFee} onChange={handleChange}
            disabled={isFieldDisabled("registrationFee")}
            style={isFieldDisabled("registrationFee") ? { ...disabledStyle, flex: 1 } : { ...inputStyle, flex: 1 }}
          />
        </div>

        {/* Tags */}
        <h4 style={{ marginBottom: 6 }}>Event Tags</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {CATEGORIES.map((cat) => (
            <button
              type="button"
              key={cat}
              onClick={() => toggleTag(cat)}
              disabled={isFieldDisabled("tags")}
              style={{
                padding: "4px 12px", borderRadius: 16, border: "1px solid #ccc",
                background: tags.includes(cat) ? "#4f46e5" : "#fff",
                color: tags.includes(cat) ? "#fff" : "#333",
                cursor: isFieldDisabled("tags") ? "not-allowed" : "pointer",
                fontSize: 13,
                opacity: isFieldDisabled("tags") ? 0.5 : 1,
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ---- Normal Event: Custom Form Builder ---- */}
        {form.eventType === "normal" && (
          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <h4 style={{ marginTop: 0 }}>Custom Registration Form</h4>
            {formLocked ? (
              <p style={{ fontSize: 13, color: "#dc2626" }}>
                ⚠️ Form fields are locked — participants have already registered.
              </p>
            ) : (
              <p style={{ fontSize: 13, color: "#888" }}>
                Add custom fields that participants fill when registering. Use arrows to reorder.
              </p>
            )}
            {customFields.map((field, idx) => (
              <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap", opacity: formLocked ? 0.6 : 1 }}>
                {/* Reorder buttons */}
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <button type="button" onClick={() => moveField(idx, -1)} disabled={formLocked || idx === 0}
                    style={{ padding: "1px 6px", fontSize: 10, cursor: formLocked ? "not-allowed" : "pointer", border: "1px solid #ccc", borderRadius: 3, background: "#f9fafb" }}>▲</button>
                  <button type="button" onClick={() => moveField(idx, 1)} disabled={formLocked || idx === customFields.length - 1}
                    style={{ padding: "1px 6px", fontSize: 10, cursor: formLocked ? "not-allowed" : "pointer", border: "1px solid #ccc", borderRadius: 3, background: "#f9fafb" }}>▼</button>
                </div>
                <input
                  placeholder="Field Label"
                  value={field.label}
                  onChange={(e) => updateField(idx, "label", e.target.value)}
                  disabled={formLocked}
                  style={{ flex: 2, padding: 6 }}
                />
                <select
                  value={field.type}
                  onChange={(e) => updateField(idx, "type", e.target.value)}
                  disabled={formLocked}
                  style={{ flex: 1, padding: 6 }}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <label style={{ fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(idx, "required", e.target.checked)}
                    disabled={formLocked}
                  /> Req
                </label>
                {field.type === "select" && (
                  <input
                    placeholder="Options (comma separated)"
                    value={(field.options || []).join(", ")}
                    onChange={(e) => updateField(idx, "options", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
                    disabled={formLocked}
                    style={{ flex: 3, padding: 6 }}
                  />
                )}
                <button type="button" onClick={() => removeField(idx)} disabled={formLocked}
                  style={{ padding: "4px 8px", background: formLocked ? "#ccc" : "#dc2626", color: "#fff", border: "none", borderRadius: 4, cursor: formLocked ? "not-allowed" : "pointer" }}>✕</button>
              </div>
            ))}
            {!formLocked && (
              <button type="button" onClick={addField} style={{ padding: "6px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                + Add Field
              </button>
            )}
          </div>
        )}

        {/* ---- Merchandise Event: Variants ---- */}
        {form.eventType === "merchandise" && (
          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <h4 style={{ marginTop: 0 }}>Merchandise Variants</h4>
            {formLocked ? (
              <p style={{ fontSize: 13, color: "#dc2626" }}>
                ⚠️ Variants are locked — participants have already registered.
              </p>
            ) : (
              <p style={{ fontSize: 13, color: "#888" }}>
                Add size/color variants with stock quantities.
              </p>
            )}
            {variants.map((v, idx) => (
              <div key={idx} style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, opacity: formLocked ? 0.6 : 1 }}>
                <input placeholder="Size" value={v.size} onChange={(e) => updateVariant(idx, "size", e.target.value)} disabled={formLocked} style={{ flex: 1, padding: 6 }} />
                <input placeholder="Color" value={v.color} onChange={(e) => updateVariant(idx, "color", e.target.value)} disabled={formLocked} style={{ flex: 1, padding: 6 }} />
                <input placeholder="Label (e.g. Red-XL)" value={v.label} onChange={(e) => updateVariant(idx, "label", e.target.value)} disabled={formLocked} style={{ flex: 1.5, padding: 6 }} />
                <input type="number" min="0" placeholder="Stock" value={v.stock} onChange={(e) => updateVariant(idx, "stock", Number(e.target.value))} disabled={formLocked} style={{ width: 70, padding: 6 }} />
                <button type="button" onClick={() => removeVariant(idx)} disabled={formLocked}
                  style={{ padding: "4px 8px", background: formLocked ? "#ccc" : "#dc2626", color: "#fff", border: "none", borderRadius: 4, cursor: formLocked ? "not-allowed" : "pointer" }}>✕</button>
              </div>
            ))}
            {!formLocked && (
              <button type="button" onClick={addVariant} style={{ padding: "6px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer" }}>
                + Add Variant
              </button>
            )}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 13 }}>Max items per participant: </label>
              <input type="number" name="purchaseLimit" min="1" value={form.purchaseLimit} onChange={handleChange}
                disabled={isFieldDisabled("purchaseLimit")}
                style={{ width: 60, padding: 4 }} />
            </div>
          </div>
        )}

        {/* ---- Hackathon: Team Size Config ---- */}
        {form.eventType === "hackathon" && (
          <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16, marginBottom: 16 }}>
            <h4 style={{ marginTop: 0 }}>Team Settings</h4>
            <p style={{ fontSize: 13, color: "#888" }}>
              Participants create teams and share a join code. Teams are registered when the leader locks the team.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <div>
                <label style={{ fontSize: 13 }}>Min Team Size</label>
                <input type="number" name="minTeamSize" min="1" value={form.minTeamSize} onChange={handleChange}
                  disabled={isFieldDisabled("minTeamSize")}
                  style={{ display: "block", width: 70, padding: 6, marginTop: 4 }} />
              </div>
              <div>
                <label style={{ fontSize: 13 }}>Max Team Size</label>
                <input type="number" name="maxTeamSize" min="1" value={form.maxTeamSize} onChange={handleChange}
                  disabled={isFieldDisabled("maxTeamSize")}
                  style={{ display: "block", width: 70, padding: 6, marginTop: 4 }} />
              </div>
            </div>
          </div>
        )}

        <button type="submit" style={{ width: "100%", padding: 10, marginTop: 8, background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontSize: 15, cursor: "pointer" }}>
          {isEditing ? "Save Changes" : "Create Event (Draft)"}
        </button>
      </form>
    </div>
  );
}
