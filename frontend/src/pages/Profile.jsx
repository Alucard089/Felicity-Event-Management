import { useState, useEffect } from "react";
import axios from "axios";
import { API_PREFERENCES, API_AUTH as _API_AUTH } from "../config";

const API_PREF = API_PREFERENCES;
const API_AUTH = _API_AUTH;

const INTEREST_CLUB_MAP = {
  "Technology":           "0x1337, DSC, OSDG, Programming Club, Theory Group, ISAQC, Astronautics",
  "Robotics & Electronics": "Electronics & Robotics Club",
  "Sports":               "ASEC, Skateboarding Club",
  "Dramatics":            "Cyclorama",
  "Design":               "Decore",
  "Comedy & Humour":      "Frivolous Humour Club",
  "Literature":           "Literary Club",
  "Photography":          "Pentaprism",
  "Fashion":              "Rouge",
  "Art":                  "The Art Society",
  "Chess":                "The Chess Club",
  "Dance":                "The Dance Crew",
  "Debate":               "The Debate Society",
  "Gaming":               "The Gaming Club",
  "Language & Culture":   "The Language Club",
  "Music":                "The Music Club",
  "Quiz":                 "The TV Room Quiz Club",
  "Career & Motivation":  "LeanIn Chapter IIIT-H",
  "Community & Inclusion":"Students Queer Club",
};

const TAG_STYLE = (selected) => ({
  padding: "6px 14px",
  borderRadius: 20,
  border: "1px solid #ccc",
  background: selected ? "#4f46e5" : "#fff",
  color: selected ? "#fff" : "#333",
  cursor: "pointer",
  fontSize: 14,
});

const inputStyle = {
  width: "100%", padding: 8, border: "1px solid #ccc",
  borderRadius: 4, boxSizing: "border-box", fontSize: 14,
};

export default function Profile() {
  const token = localStorage.getItem("token");
  const headers = { "x-auth-token": token };

  // Profile fields
  const [profile, setProfile] = useState({
    firstName: "", lastName: "", contactNumber: "", college: "",
    email: "", isIIIT: false,
  });
  const [profileMsg, setProfileMsg] = useState("");
  const [profileErr, setProfileErr] = useState("");

  // Preferences
  const [interestOptions, setInterestOptions] = useState([]);
  const [clubOptions, setClubOptions] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState([]);
  const [prefMsg, setPrefMsg] = useState("");

  // Password change
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");

  useEffect(() => {
    // Load profile from server
    axios.get(`${API_AUTH}/me`, { headers }).then((res) => {
      const u = res.data;
      setProfile({
        firstName: u.firstName || "",
        lastName: u.lastName || "",
        contactNumber: u.contactNumber || "",
        college: u.college || "",
        email: u.email || "",
        isIIIT: u.isIIIT || false,
      });
    });

    // Load preferences
    Promise.all([
      axios.get(`${API_PREF}/options`, { headers }),
      axios.get(API_PREF, { headers }),
    ]).then(([optRes, prefRes]) => {
      setInterestOptions(optRes.data.interests);
      setClubOptions(optRes.data.clubs);
      setSelectedInterests(prefRes.data.interests || []);
      setSelectedClubs(prefRes.data.followingClubs || []);
    });
  }, []);

  // Profile save
  const handleProfileSave = async () => {
    setProfileMsg(""); setProfileErr("");
    try {
      const res = await axios.put(`${API_AUTH}/profile`, {
        firstName: profile.firstName,
        lastName: profile.lastName,
        contactNumber: profile.contactNumber,
        college: profile.college,
      }, { headers });
      // Update localStorage
      const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
      const merged = { ...currentUser, ...res.data.user };
      localStorage.setItem("user", JSON.stringify(merged));
      setProfileMsg("Profile updated!");
    } catch (err) {
      setProfileErr(err.response?.data?.msg || "Failed to update profile");
    }
  };

  // Preferences save
  const toggleInterest = (item) => {
    setSelectedInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const toggleClub = (id) => {
    setSelectedClubs((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handlePrefSave = async () => {
    setPrefMsg("");
    try {
      const res = await axios.put(
        API_PREF,
        { interests: selectedInterests, followingClubs: selectedClubs },
        { headers }
      );
      localStorage.setItem("user", JSON.stringify(res.data.user));
      setPrefMsg("Preferences saved!");
    } catch (err) {
      console.error(err);
    }
  };

  // Password change
  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwMsg(""); setPwErr("");
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPwErr("New passwords do not match");
      return;
    }
    try {
      const res = await axios.put(`${API_AUTH}/change-password`, {
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      }, { headers });
      setPwMsg(res.data.msg);
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setPwErr(err.response?.data?.msg || "Failed to change password");
    }
  };

  return (
    <div>
      <h2>Profile</h2>

      {/* ─── Non-Editable Fields ─── */}
      <div style={{ background: "#f9fafb", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, fontSize: 16 }}>Account Info (Non-Editable)</h3>
        <p><strong>Email:</strong> {profile.email}</p>
        <p><strong>Participant Type:</strong> {profile.isIIIT ? "IIIT Student" : "Non-IIIT"}</p>
      </div>

      {/* ─── Editable Fields ─── */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, fontSize: 16 }}>Personal Information</h3>
        {profileMsg && <p style={{ color: "green" }}>{profileMsg}</p>}
        {profileErr && <p style={{ color: "red" }}>{profileErr}</p>}

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>First Name</label>
            <input
              value={profile.firstName}
              onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              style={inputStyle}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Last Name</label>
            <input
              value={profile.lastName}
              onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              style={inputStyle}
            />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Contact Number</label>
          <input
            value={profile.contactNumber}
            onChange={(e) => setProfile({ ...profile, contactNumber: e.target.value })}
            placeholder="e.g. +91 9876543210"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>College / Organization Name</label>
          <input
            value={profile.college}
            onChange={(e) => setProfile({ ...profile, college: e.target.value })}
            style={inputStyle}
          />
        </div>

        <button
          onClick={handleProfileSave}
          style={{ padding: "8px 24px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
        >
          Save Profile
        </button>
      </div>

      {/* ─── Interests & Clubs ─── */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16, marginBottom: 20 }}>
        <h3 style={{ marginTop: 0, fontSize: 16 }}>Interests & Followed Clubs</h3>
        {prefMsg && <p style={{ color: "green" }}>{prefMsg}</p>}

        <h4>Areas of Interest</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
          {interestOptions.map((item) => (
            <button
              key={item}
              onClick={() => toggleInterest(item)}
              title={INTEREST_CLUB_MAP[item] || ""}
              style={TAG_STYLE(selectedInterests.includes(item))}
            >
              {item}
            </button>
          ))}
        </div>
        {selectedInterests.length > 0 && (
          <p style={{ fontSize: 12, color: "#4f46e5", marginBottom: 16 }}>
            Related clubs: {selectedInterests.map((i) => INTEREST_CLUB_MAP[i]).filter(Boolean).join(" · ")}
          </p>
        )}

        {clubOptions.length > 0 && (
          <>
            <h4 style={{ marginTop: 20 }}>Clubs to Follow</h4>
            {(() => {
              const grouped = {};
              clubOptions.forEach((club) => {
                const cat = club.category || "Other";
                if (!grouped[cat]) grouped[cat] = [];
                grouped[cat].push(club);
              });
              return Object.entries(grouped).map(([cat, list]) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "#888", textTransform: "uppercase", marginBottom: 6 }}>
                    {cat}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {list.map((club) => (
                      <button
                        key={club._id}
                        onClick={() => toggleClub(club._id)}
                        style={TAG_STYLE(selectedClubs.includes(club._id))}
                      >
                        {club.name}
                      </button>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </>
        )}

        <button
          onClick={handlePrefSave}
          style={{ padding: "8px 24px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", marginTop: 8 }}
        >
          Save Preferences
        </button>
      </div>

      {/* ─── Security Settings ─── */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 16 }}>
        <h3 style={{ marginTop: 0, fontSize: 16 }}>Security Settings — Change Password</h3>
        {pwMsg && <p style={{ color: "green" }}>{pwMsg}</p>}
        {pwErr && <p style={{ color: "red" }}>{pwErr}</p>}

        <form onSubmit={handlePasswordChange}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Current Password</label>
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
              required
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>New Password (min 6 characters)</label>
            <input
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              required
              minLength={6}
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: "#666", display: "block", marginBottom: 4 }}>Confirm New Password</label>
            <input
              type="password"
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              required
              style={inputStyle}
            />
          </div>
          <button
            type="submit"
            style={{ padding: "8px 24px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer" }}
          >
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}
