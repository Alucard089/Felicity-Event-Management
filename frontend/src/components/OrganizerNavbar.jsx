import { NavLink, useNavigate } from "react-router-dom";

const linkStyle = {
  textDecoration: "none",
  padding: "8px 16px",
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 500,
  color: "#374151",
  transition: "background 0.2s",
};

const activeLinkStyle = {
  ...linkStyle,
  background: "#2563eb",
  color: "#fff",
};

export default function OrganizerNavbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <nav style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "12px 24px",
      background: "#fff",
      borderBottom: "1px solid #e5e7eb",
      position: "sticky",
      top: 0,
      zIndex: 100,
    }}>
      <div style={{ fontWeight: 700, fontSize: 18, color: "#2563eb" }}>
        Felicity — Organizer
      </div>

      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <NavLink to="/organizer" end style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
          Dashboard
        </NavLink>
        <NavLink to="/organizer/create-event" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
          Create Event
        </NavLink>
        <NavLink to="/organizer/ongoing" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
          Ongoing Events
        </NavLink>
        <NavLink to="/organizer/profile" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
          Profile
        </NavLink>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, color: "#6b7280" }}>
          {user.name || user.email}
        </span>
        <button
          onClick={handleLogout}
          style={{
            padding: "6px 16px",
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Logout
        </button>
      </div>
    </nav>
  );
}
