import { NavLink, useNavigate } from "react-router-dom";

export default function AdminNavbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const linkStyle = ({ isActive }) => ({
    color: "#fff",
    textDecoration: "none",
    padding: "6px 14px",
    borderRadius: 6,
    fontWeight: isActive ? 700 : 400,
    background: isActive ? "rgba(255,255,255,0.15)" : "transparent",
    fontSize: 14,
  });

  return (
    <nav style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "#dc2626", padding: "10px 20px", position: "sticky", top: 0, zIndex: 100,
    }}>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 16, marginRight: 12 }}>Admin</span>
        <NavLink to="/admin" end style={linkStyle}>Dashboard</NavLink>
        <NavLink to="/admin/manage" style={linkStyle}>Manage Clubs/Organizers</NavLink>
        <NavLink to="/admin/reset-requests" style={linkStyle}>Password Reset Requests</NavLink>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ color: "rgba(255,255,255,.8)", fontSize: 13 }}>{user.email}</span>
        <button onClick={logout} style={{
          padding: "5px 14px", background: "rgba(255,255,255,.2)", color: "#fff",
          border: "1px solid rgba(255,255,255,.3)", borderRadius: 6, cursor: "pointer", fontSize: 13,
        }}>Logout</button>
      </div>
    </nav>
  );
}
