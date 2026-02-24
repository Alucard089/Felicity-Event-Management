# readme_9.md — Section 11: Admin Features & Navigation [6 Marks]

## Overview
This readme documents the implementation of **Section 11** — Admin Features & Navigation, covering subtasks 11.1 (Navigation Menu, 1 mark) and 11.2 (Club/Organizer Management, 5 marks).

---

## 11.1 — Navigation Menu [1 Mark]

### What was done
- Created `frontend/src/components/AdminNavbar.jsx` — a sticky top navbar for all admin pages.
- Created `AdminLayout` wrapper in `App.jsx` (same pattern as ParticipantLayout and OrganizerLayout).
- Added 3 admin routes to `App.jsx`.

### Navbar items
| Link | Route | Component |
|------|-------|-----------|
| Dashboard | `/admin` | AdminDashboard |
| Manage Clubs/Organizers | `/admin/manage` | ManageOrganizers |
| Password Reset Requests | `/admin/reset-requests` | PasswordResetRequests |
| Logout | (clears localStorage, redirects to `/login`) | — |

### Design
- Red theme (#dc2626) to visually distinguish from organizer (blue) and participant (green) views.
- NavLink active state: bold white text with semi-transparent background.
- Shows admin's email address.
- Sticky positioning with z-index.

### Routes added in App.jsx
```
/admin                → AdminDashboard (summary stats)
/admin/manage         → ManageOrganizers (create, disable, delete)
/admin/reset-requests → PasswordResetRequests (fulfill/dismiss)
```

---

## 11.2 — Club/Organizer Management [5 Marks]

### Add New Club/Organizer

#### How it works
1. Admin fills in: Name (required), Email (required), Category, Description, Contact Email.
2. **No password field** — the system auto-generates a secure 12-character password using `crypto.randomBytes()`.
3. On creation, the API returns both the organizer data and the `credentials` object containing `{ email, password }`.
4. Frontend displays the credentials in a yellow highlight box with a "Copy to Clipboard" button.
5. Admin copies and shares credentials with the club/organizer.
6. The new account can immediately log in.

#### Password generation algorithm
```javascript
function generatePassword(length = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
  let pass = "";
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    pass += chars[bytes[i] % chars.length];
  }
  return pass;
}
```

#### Backend route
- **POST /api/admin/create-organizer** — accepts `{ name, email, category, description, contactEmail }`, auto-generates password, returns `{ msg, credentials: { email, password }, organizer }`.

### Remove Club/Organizer

#### Two options provided

**1. Disable (archive)**
- Toggles the `active` field on the User document.
- Disabled accounts **cannot log in** — the login route checks `user.active === false` and returns a 403 with message "Your account has been disabled. Contact the administrator."
- Disabled organizers appear grayed out with a red "DISABLED" badge in the list.
- Can be re-enabled at any time with the same "Enable" button.

**2. Permanently Delete**
- Confirmation dialog warns: "PERMANENTLY delete? This cannot be undone. Consider disabling instead."
- Removes the User document from MongoDB entirely.

#### Backend routes
| Route | Method | Description |
|-------|--------|-------------|
| `PUT /api/admin/organizer/:id/toggle` | PUT | Toggle `active` field (enable/disable) |
| `DELETE /api/admin/organizer/:id` | DELETE | Permanently delete user document |

### Password Reset Requests

#### Flow
1. **Organizer side**: On their Profile page (`/organizer/profile`), there's a "Request Password Reset" button at the bottom. Clicking it calls `POST /api/admin/request-reset`, which sets `passwordResetRequested = true` and `passwordResetRequestedAt = now` on the user document.
2. **Admin side**: The "Password Reset Requests" page (`/admin/reset-requests`) lists all organizers with `passwordResetRequested === true`. For each request, admin sees:
   - Organizer name, category, email
   - When the request was submitted
   - Two action buttons: "Reset Password" and "Dismiss"
3. **Reset**: `POST /api/admin/reset-password/:id` generates a new 12-char password, hashes it, saves it, clears the reset request flags, and returns the new credentials in the response. Admin sees the credentials in a yellow box and can copy them.
4. **Dismiss**: `POST /api/admin/dismiss-reset/:id` clears the reset request flags without changing the password.

#### Backend routes
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `POST /api/admin/request-reset` | POST | Organizer | Organizer submits password reset request |
| `GET /api/admin/reset-requests` | GET | Admin | List all pending reset requests |
| `POST /api/admin/reset-password/:id` | POST | Admin | Generate new password, clear request |
| `POST /api/admin/dismiss-reset/:id` | POST | Admin | Dismiss request without resetting |

### Admin Dashboard

The dashboard page (`/admin`) shows a 4-stat summary grid:
- **Total Organizers** — count of all organizer accounts
- **Active** — organizers with `active !== false`
- **Disabled** — organizers with `active === false`
- **Reset Requests** — count of pending password reset requests

---

## Model Changes

### User model (`backend/models/User.js`)
Added fields:
```javascript
active: { type: Boolean, default: true },
passwordResetRequested: { type: Boolean, default: false },
passwordResetRequestedAt: { type: Date },
```

### Login route (`backend/routes/auth.js`)
Added disabled account check before password comparison:
```javascript
if (user.active === false) {
  return res.status(403).json({ msg: "Your account has been disabled. Contact the administrator." });
}
```

---

## File Summary

### New files created
| File | Purpose |
|------|---------|
| `frontend/src/components/AdminNavbar.jsx` | Admin navigation bar (red theme) |
| `frontend/src/pages/ManageOrganizers.jsx` | Create, disable/enable, delete organizers |
| `frontend/src/pages/PasswordResetRequests.jsx` | View and fulfill password reset requests |

### Modified files
| File | Changes |
|------|---------|
| `frontend/src/App.jsx` | Added AdminLayout wrapper, AdminNavbar import, ManageOrganizers import, PasswordResetRequests import, 3 admin routes |
| `frontend/src/pages/AdminDashboard.jsx` | Rewritten as summary stats page (moved management to ManageOrganizers) |
| `frontend/src/pages/OrganizerProfile.jsx` | Added "Request Password Reset" button at bottom |
| `backend/routes/admin.js` | Full rewrite: auto-generated passwords, toggle active, password reset request system (6 routes total) |
| `backend/routes/auth.js` | Added `active === false` check in login route |
| `backend/models/User.js` | Added `active`, `passwordResetRequested`, `passwordResetRequestedAt` fields |

### Route inventory (admin.js — 7 routes total)
```
POST   /create-organizer         → Create organizer with auto-generated password
GET    /organizers                → List all organizers (including disabled)
PUT    /organizer/:id/toggle      → Toggle active/disabled state
DELETE /organizer/:id             → Permanently delete organizer
POST   /request-reset             → Organizer submits password reset request
GET    /reset-requests            → List pending reset requests (admin)
POST   /reset-password/:id        → Admin resets password (generates new)
POST   /dismiss-reset/:id         → Admin dismisses reset request
```

---

## Edge Cases Handled

1. **Disabled account login block**: Login route returns 403 "Your account has been disabled" before even checking the password.
2. **Auto-generated password security**: Uses `crypto.randomBytes` (cryptographically secure) rather than `Math.random`.
3. **Credential visibility**: Credentials are shown only once after creation/reset — they are never stored in plaintext and cannot be retrieved again.
4. **Delete confirmation**: Extra warning recommends disabling instead of deleting.
5. **Self-request only**: Password reset request route checks `req.user.id` and requires `role === "organizer"`.
6. **Dismiss without action**: Admin can dismiss spurious reset requests without generating a new password.
7. **Duplicate email prevention**: Create organizer checks for existing email before creating.
8. **Clipboard API**: Copy-to-clipboard button for easy credential sharing.
