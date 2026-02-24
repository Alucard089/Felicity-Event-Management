import { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

import { API_PREFERENCES } from "../config";

const API = API_PREFERENCES;

// Maps each interest to the IIIT-H clubs it corresponds to (for display hint)
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

export default function Onboarding() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");
  const headers = { "x-auth-token": token };

  const [interests, setInterests] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [selectedInterests, setSelectedInterests] = useState([]);
  const [selectedClubs, setSelectedClubs] = useState([]);

  useEffect(() => {
    axios.get(`${API}/options`, { headers }).then((res) => {
      setInterests(res.data.interests);
      setClubs(res.data.clubs);
    });
  }, []);

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

  const handleSave = async () => {
    try {
      const res = await axios.put(
        API,
        { interests: selectedInterests, followingClubs: selectedClubs },
        { headers }
      );
      // Update localStorage with new user data
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
    }
  };

  const handleSkip = async () => {
    try {
      const res = await axios.put(API, { interests: [], followingClubs: [] }, { headers });
      localStorage.setItem("user", JSON.stringify(res.data.user));
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", padding: 20 }}>
      <h2>Welcome! Set Your Preferences</h2>
      <p style={{ color: "#666", marginBottom: 20 }}>
        Select your interests and clubs to follow. You can change these later from your profile.
      </p>

      {/* Interests */}
      <h3>Areas of Interest</h3>
      <p style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
        Select everything that applies — this shapes which events appear first for you.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
        {interests.map((item) => (
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

      {/* Clubs grouped by category */}
      {clubs.length > 0 && (
        <>
          <h3 style={{ marginTop: 24 }}>Clubs to Follow</h3>
          <p style={{ fontSize: 13, color: "#888", marginBottom: 12 }}>
            Follow clubs to get their events in your feed.
          </p>
          {(() => {
            const grouped = {};
            clubs.forEach((club) => {
              const cat = club.category || "Other";
              if (!grouped[cat]) grouped[cat] = [];
              grouped[cat].push(club);
            });
            return Object.entries(grouped).map(([cat, list]) => (
              <div key={cat} style={{ marginBottom: 16 }}>
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

      <div style={{ display: "flex", gap: 12 }}>
        <button onClick={handleSave} style={{ flex: 1, padding: 10 }}>
          Save Preferences
        </button>
        <button
          onClick={handleSkip}
          style={{ flex: 1, padding: 10, background: "#888" }}
        >
          Skip for Now
        </button>
      </div>
    </div>
  );
}
