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
  background: "#4f46e5",
  color: "#fff",
};

export default function Navbar() {
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
      <div style={{ fontWeight: 700, fontSize: 18, color: "#4f46e5" }}>
        Felicity
      </div>

      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <NavLink to="/dashboard" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
          Dashboard
        </NavLink>
        <NavLink to="/browse" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
          Browse Events
        </NavLink>
        <NavLink to="/clubs" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
          Clubs / Organizers
        </NavLink>
        <NavLink to="/profile" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
          Profile
        </NavLink>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ fontSize: 13, color: "#6b7280" }}>
          {user.firstName || user.name}
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
