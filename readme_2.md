# Part 2 — Organizer Authentication & Admin Account Provisioning

## Overview

Implemented two key requirements:
1. **Organizers cannot self-register** — accounts are provisioned by the Admin only.
2. **Admin is seeded via backend** — no UI registration; admin has exclusive privileges to create/remove organizers.

---

## Changes Made

### 1. `backend/seed.js` — Admin Seeder Script

Run once with `node seed.js` to create the initial admin account.

- Connects to MongoDB
- Checks if an admin already exists (prevents duplicates)
- Creates an admin user with:
  - Email: `admin@felicity.iiit.ac.in`
  - Password: `admin123`
  - Role: `admin`
- Exits after creation

**Usage:**
```bash
cd backend
node seed.js
```

---

### 2. `backend/routes/auth.js` — Registration Restriction

Added a check at the top of the `/register` endpoint:
```js
if (role && role !== "participant") {
  return res.status(403).json({ msg: "Only participants can register..." });
}
```
This prevents anyone from registering as an organizer or admin through the public API. Only participants can self-register.

---

### 3. `backend/routes/admin.js` — Admin Routes (NEW)

All routes require JWT auth (`x-auth-token` header) + admin role check.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/admin/create-organizer` | Create a new organizer account. Accepts `{ name, email, password }`. Hashes password, saves with role `"organizer"`. |
| `GET` | `/api/admin/organizers` | List all organizer accounts (password excluded). |
| `DELETE` | `/api/admin/organizer/:id` | Remove an organizer by ID. Verifies the user is actually an organizer before deleting. |

**`adminOnly` middleware:**
```js
function adminOnly(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ msg: "Admin access only" });
  }
  next();
}
```
Runs after JWT auth — ensures only admins can access these routes.

---

### 4. `backend/server.js` — Route Mounting

Added one line to mount admin routes:
```js
const adminRoutes = require("./routes/admin");
app.use("/api/admin", adminRoutes);
```

---

### 5. `frontend/src/pages/Register.jsx` — Simplified

- **Removed** the role dropdown (Participant/Organizer/Admin selector)
- Registration page now only creates participant accounts
- IIIT checkbox and email validation remain unchanged

---

### 6. `frontend/src/pages/AdminDashboard.jsx` — Admin Panel (NEW)

Accessible at `/admin` route. Redirects non-admin users away.

**Features:**
- **Create Organizer form** — name, email, password fields. Calls `POST /api/admin/create-organizer`.
- **Organizer list** — fetches and displays all organizers with name & email.
- **Remove button** — deletes an organizer (with confirmation prompt). Calls `DELETE /api/admin/organizer/:id`.
- **Logout button** — clears localStorage and redirects to login.

---

### 7. `frontend/src/App.jsx` — Updated Routing

Added `/admin` route:
```jsx
<Route
  path="/admin"
  element={token && user.role === "admin" ? <AdminDashboard /> : <Navigate to="/login" />}
/>
```
Admin route is protected — requires both a valid token and admin role.

---

### 8. `frontend/src/pages/Login.jsx` — Role-Based Redirect

After login, users are redirected based on their role:
- `admin` → `/admin`
- All others → `/dashboard`

---

## How to Test

1. **Seed the admin** (if not done already):
   ```bash
   cd backend && node seed.js
   ```

2. **Login as admin:**
   - Email: `admin@felicity.iiit.ac.in`
   - Password: `admin123`
   - You'll be redirected to the Admin Dashboard

3. **Create an organizer** from the admin panel

4. **Try registering as organizer** from `/register` — you'll see it's not possible (no role selector, backend blocks it too)

5. **Login as the organizer** using the credentials you set in the admin panel — they'll land on the regular dashboard

---

## File Structure After Part 2

```
backend/
├── .env
├── server.js              ← mounts auth + admin routes
├── seed.js                ← run once to create admin
├── middleware/
│   └── auth.js            ← JWT verification
├── models/
│   └── User.js            ← User schema
└── routes/
    ├── auth.js            ← register (participants only) + login
    └── admin.js           ← create/list/remove organizers

frontend/src/
├── main.jsx
├── App.jsx                ← routes with admin dashboard
├── index.css
└── pages/
    ├── Register.jsx       ← participant registration only
    ├── Login.jsx          ← role-based redirect
    ├── Dashboard.jsx      ← participant/organizer view
    └── AdminDashboard.jsx ← admin panel for managing organizers
```
