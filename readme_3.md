# Part 3 — Security Requirements & Session Management

## Overview

These requirements were largely already implemented in Parts 1–2. This part audits and fills the remaining gaps:
- Token validity verification on every page load
- Role-based access control on all frontend routes
- Separate dashboards per role

---

## What Was Already Done (Parts 1–2)

| Requirement | Status | Where |
|-------------|--------|-------|
| Passwords hashed with bcrypt | ✅ | `backend/routes/auth.js` — `bcrypt.genSalt(10)` + `bcrypt.hash()` on register |
| JWT-based authentication | ✅ | `backend/middleware/auth.js` — verifies `x-auth-token` header |
| JWT used on protected routes | ✅ | Admin routes use `auth` + `adminOnly` middleware |
| Sessions persist across browser restarts | ✅ | Token + user stored in `localStorage` (survives restarts) |
| Logout clears all tokens | ✅ | All dashboard pages call `localStorage.removeItem("token")` and `localStorage.removeItem("user")` |
| Login redirects to respective dashboard | ✅ | admin → `/admin`, organizer → `/organizer`, participant → `/dashboard` |

---

## New Changes

### 1. `backend/routes/auth.js` — Added `GET /api/auth/me`

```js
router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user.id).select("-password");
  if (!user) return res.status(404).json({ msg: "User not found" });
  res.json(user);
});
```

**Purpose:** Allows the frontend to verify that a stored JWT is still valid. If the token is expired or tampered with, the middleware returns 401 and the frontend clears the session.

---

### 2. `frontend/src/App.jsx` — Token Verification + Role-Based Routes

**Token check on every route change:**
```js
useEffect(() => {
  if (!token) { setChecked(true); return; }
  axios.get(`${API}/me`, { headers: { "x-auth-token": token } })
    .then(() => setChecked(true))
    .catch(() => {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setChecked(true);
      navigate("/login");
    });
}, [location.pathname]);
```

- On every navigation, calls `/api/auth/me` to verify the token
- If token is invalid/expired → clears localStorage, redirects to login
- Shows nothing until verification completes (prevents flash of protected content)

**Role-based route protection:**

| Route | Allowed Role | Component |
|-------|-------------|-----------|
| `/register` | Public | Register |
| `/login` | Public | Login |
| `/dashboard` | `participant` only | Dashboard |
| `/organizer` | `organizer` only | OrganizerDashboard |
| `/admin` | `admin` only | AdminDashboard |
| `*` | — | Redirects to `/login` |

Each protected route checks both `token` existence AND the correct `user.role`. Wrong role = redirect to login.

---

### 3. `frontend/src/pages/OrganizerDashboard.jsx` — New Page

Separate dashboard for organizer accounts:
- Shows organizer's name, email, role
- Logout button
- Will be expanded in future parts with event management features

---

### 4. `frontend/src/pages/Login.jsx` — Updated Redirect Logic

```js
const role = res.data.user.role;
if (role === "admin") navigate("/admin");
else if (role === "organizer") navigate("/organizer");
else navigate("/dashboard");
```

Three-way redirect based on role after successful login.

---

## Security Summary

| Layer | Mechanism |
|-------|-----------|
| Password storage | bcrypt with 10 salt rounds, no plaintext |
| API authentication | JWT in `x-auth-token` header, verified by middleware |
| API authorization | `adminOnly` middleware checks `req.user.role` |
| Frontend route protection | Token verified via `/api/auth/me` on every navigation |
| Frontend role-based access | Each route checks `user.role` before rendering |
| Session persistence | `localStorage` (survives browser restart) |
| Session cleanup | Logout removes both `token` and `user` from localStorage |
| Token expiry | JWT expires after 7 days |
