# Part 4 — User Onboarding & Preferences

## Overview

After registration, participants are shown an onboarding screen where they can select areas of interest and clubs/organizers to follow. These preferences are stored in the database and can be edited later from the Profile page.

---

## Changes Made

### 1. `backend/models/User.js` — New Fields

Added three fields to the User schema:

```js
interests: { type: [String], default: [] },
followingClubs: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
onboarded: { type: Boolean, default: false },
```

| Field | Type | Purpose |
|-------|------|---------|
| `interests` | Array of strings | Selected areas of interest (e.g. "Technology", "Music") |
| `followingClubs` | Array of ObjectIds | References to organizer User documents the participant follows |
| `onboarded` | Boolean | `false` until the user saves or skips onboarding |

---

### 2. `backend/routes/preferences.js` — Preferences API (NEW)

All routes require JWT authentication.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/preferences/options` | Returns list of available interest categories + all organizer accounts (for the "follow clubs" picker) |
| `GET` | `/api/preferences` | Returns current user's interests, followingClubs, and onboarded status |
| `PUT` | `/api/preferences` | Saves `{ interests, followingClubs }`, sets `onboarded: true`, returns updated user |

**Available interest categories** (hardcoded list):
Technology, Music, Dance, Art, Sports, Literature, Photography, Gaming, Dramatics, Robotics

**Clubs list** is dynamic — fetched from all users with `role: "organizer"`.

---

### 3. `backend/server.js` — Route Mounting

Added:
```js
const preferencesRoutes = require("./routes/preferences");
app.use("/api/preferences", preferencesRoutes);
```

---

### 4. `backend/routes/auth.js` — Updated Responses

Both `/register` and `/login` now include `onboarded` in the user response object:
```js
user: { id, name, email, role, isIIIT, onboarded }
```
This lets the frontend decide whether to show onboarding or dashboard.

---

### 5. `frontend/src/pages/Onboarding.jsx` — Onboarding Page (NEW)

Shown to participants after registration (or login if not yet onboarded).

**Features:**
- Fetches available interests and clubs from `/api/preferences/options`
- **Interests** displayed as toggle pills — click to select/deselect (multiple selection)
- **Clubs** displayed as toggle pills — click to follow/unfollow
- **"Save Preferences"** button — calls `PUT /api/preferences`, updates localStorage, navigates to dashboard
- **"Skip for Now"** button — saves empty preferences, marks `onboarded: true`, navigates to dashboard

---

### 6. `frontend/src/pages/Profile.jsx` — Profile Page (NEW)

Accessible from the participant dashboard via a "Profile" button.

**Features:**
- Shows user info (name, email, role, IIIT status)
- Loads current preferences from the API and pre-selects them
- Same interest/club toggle UI as onboarding
- **"Save Preferences"** button updates the database
- **"Back"** button returns to dashboard
- **Logout** button

---

### 7. `frontend/src/pages/Dashboard.jsx` — Updated

Added a header bar with:
- **"Profile"** button — navigates to `/profile`
- **"Logout"** button

---

### 8. `frontend/src/App.jsx` — Updated Routing

New routes added:

| Route | Access | Behavior |
|-------|--------|----------|
| `/onboarding` | Participant, not yet onboarded | Shows Onboarding page |
| `/profile` | Participant | Shows Profile page |
| `/dashboard` | Participant, onboarded | If not onboarded, redirects to `/onboarding` |

---

### 9. `frontend/src/pages/Register.jsx` — Updated Redirect

After successful registration, navigates to `/onboarding` instead of `/dashboard`.

---

### 10. `frontend/src/pages/Login.jsx` — Updated Redirect

For participants: checks `onboarded` flag:
- If `false` → redirects to `/onboarding`
- If `true` → redirects to `/dashboard`

---

## User Flow

```
Register → Onboarding → [Save / Skip] → Dashboard
                                              ↓
                                        Profile (edit)
```

Returning participants who already onboarded go straight to Dashboard on login.

---

## How to Test

1. **Register a new participant** — you'll be taken to the onboarding screen
2. **Select some interests** and/or **follow clubs** (if any organizers exist)
3. Click **Save Preferences** or **Skip for Now**
4. On the Dashboard, click **Profile** to edit preferences anytime
5. **Log out and log back in** — if you already onboarded, you go straight to Dashboard

---

## File Structure After Part 4

```
backend/
├── routes/
│   ├── auth.js            ← updated responses with onboarded
│   ├── admin.js
│   └── preferences.js     ← NEW: get/save preferences + options
├── models/
│   └── User.js            ← added interests, followingClubs, onboarded

frontend/src/
├── App.jsx                ← added onboarding + profile routes
└── pages/
    ├── Register.jsx       ← redirects to /onboarding
    ├── Login.jsx          ← checks onboarded flag
    ├── Onboarding.jsx     ← NEW: interest + club selection
    ├── Profile.jsx        ← NEW: edit preferences
    ├── Dashboard.jsx      ← added Profile button
    ├── OrganizerDashboard.jsx
    └── AdminDashboard.jsx
```
