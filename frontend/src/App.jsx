import { useEffect, useState } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import OrganizerDashboard from "./pages/OrganizerDashboard";
import CreateEvent from "./pages/CreateEvent";
import AdminDashboard from "./pages/AdminDashboard";
import Onboarding from "./pages/Onboarding";
import Profile from "./pages/Profile";
import BrowseEvents from "./pages/BrowseEvents";
import EventDetails from "./pages/EventDetails";
import ClubsList from "./pages/ClubsList";
import ClubDetail from "./pages/ClubDetail";
import Navbar from "./components/Navbar";
import OrganizerNavbar from "./components/OrganizerNavbar";
import OrganizerEventDetail from "./pages/OrganizerEventDetail";
import OrganizerOngoing from "./pages/OrganizerOngoing";
import OrganizerProfile from "./pages/OrganizerProfile";
import AdminNavbar from "./components/AdminNavbar";
import ManageOrganizers from "./pages/ManageOrganizers";
import PasswordResetRequests from "./pages/PasswordResetRequests";
import { API_AUTH } from "./config";

const API = API_AUTH;

/* Wrapper that shows Navbar on participant pages */
function ParticipantLayout({ children }) {
  return (
    <>
      <Navbar />
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px" }}>
        {children}
      </div>
    </>
  );
}

/* Wrapper that shows OrganizerNavbar on organizer pages */
function OrganizerLayout({ children }) {
  return (
    <>
      <OrganizerNavbar />
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px" }}>
        {children}
      </div>
    </>
  );
}

/* Wrapper that shows AdminNavbar on admin pages */
function AdminLayout({ children }) {
  return (
    <>
      <AdminNavbar />
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px 16px" }}>
        {children}
      </div>
    </>
  );
}

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const [checked, setChecked] = useState(false);

  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Verify token is still valid on app load / route change
  useEffect(() => {
    if (!token) {
      setChecked(true);
      return;
    }
    axios
      .get(`${API}/me`, { headers: { "x-auth-token": token } })
      .then(() => setChecked(true))
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setChecked(true);
        navigate("/login");
      });
  }, [location.pathname]);

  if (!checked) return null;

  const isParticipant = token && user.role === "participant";
  const isOnboarded = isParticipant && user.onboarded;

  return (
    <Routes>
      {/* Public */}
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />

      {/* Participant — onboarding (no navbar) */}
      <Route
        path="/onboarding"
        element={
          isParticipant && !user.onboarded ? <Onboarding /> : <Navigate to="/dashboard" />
        }
      />

      {/* Participant — with navbar */}
      <Route
        path="/dashboard"
        element={
          isOnboarded
            ? <ParticipantLayout><Dashboard /></ParticipantLayout>
            : isParticipant ? <Navigate to="/onboarding" /> : <Navigate to="/login" />
        }
      />
      <Route
        path="/browse"
        element={
          isOnboarded
            ? <ParticipantLayout><BrowseEvents /></ParticipantLayout>
            : <Navigate to="/login" />
        }
      />
      <Route
        path="/events/:id"
        element={
          isOnboarded
            ? <ParticipantLayout><EventDetails /></ParticipantLayout>
            : <Navigate to="/login" />
        }
      />
      <Route
        path="/clubs"
        element={
          isOnboarded
            ? <ParticipantLayout><ClubsList /></ParticipantLayout>
            : <Navigate to="/login" />
        }
      />
      <Route
        path="/clubs/:id"
        element={
          isOnboarded
            ? <ParticipantLayout><ClubDetail /></ParticipantLayout>
            : <Navigate to="/login" />
        }
      />
      <Route
        path="/profile"
        element={
          isParticipant
            ? <ParticipantLayout><Profile /></ParticipantLayout>
            : <Navigate to="/login" />
        }
      />

      {/* Organizer */}
      <Route
        path="/organizer"
        element={
          token && user.role === "organizer"
            ? <OrganizerLayout><OrganizerDashboard /></OrganizerLayout>
            : <Navigate to="/login" />
        }
      />
      <Route
        path="/organizer/create-event"
        element={
          token && user.role === "organizer"
            ? <OrganizerLayout><CreateEvent /></OrganizerLayout>
            : <Navigate to="/login" />
        }
      />
      <Route
        path="/organizer/event/:id"
        element={
          token && user.role === "organizer"
            ? <OrganizerLayout><OrganizerEventDetail /></OrganizerLayout>
            : <Navigate to="/login" />
        }
      />
      <Route
        path="/organizer/event/:id/edit"
        element={
          token && user.role === "organizer"
            ? <OrganizerLayout><CreateEvent /></OrganizerLayout>
            : <Navigate to="/login" />
        }
      />
      <Route
        path="/organizer/ongoing"
        element={
          token && user.role === "organizer"
            ? <OrganizerLayout><OrganizerOngoing /></OrganizerLayout>
            : <Navigate to="/login" />
        }
      />
      <Route
        path="/organizer/profile"
        element={
          token && user.role === "organizer"
            ? <OrganizerLayout><OrganizerProfile /></OrganizerLayout>
            : <Navigate to="/login" />
        }
      />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          token && user.role === "admin" ? <AdminLayout><AdminDashboard /></AdminLayout> : <Navigate to="/login" />
        }
      />
      <Route
        path="/admin/manage"
        element={
          token && user.role === "admin" ? <AdminLayout><ManageOrganizers /></AdminLayout> : <Navigate to="/login" />
        }
      />
      <Route
        path="/admin/reset-requests"
        element={
          token && user.role === "admin" ? <AdminLayout><PasswordResetRequests /></AdminLayout> : <Navigate to="/login" />
        }
      />

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}

export default App;
