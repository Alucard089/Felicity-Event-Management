# Part 7 – Task 9: Participant Features & Navigation

## Overview

This part implements the full **participant-facing experience** of the Felicity event platform. It covers eight subtasks across navigation, event discovery, registration workflows, profile management, and club/organizer browsing. All changes span both the React frontend and the Express/MongoDB backend.

---

## Architecture Notes

- All participant pages share a sticky **Navbar** injected via a `ParticipantLayout` wrapper component in `App.jsx`.
- All participant routes are protected: users must be logged in (`token` in `localStorage`) and have completed onboarding (`user.onboarded === true`).
- The auth header used throughout is `{ "x-auth-token": token }`.
- A new `Registration` Mongoose model and `/api/registrations` route module were created to handle the ticketing system.

---

## 9.1 — Navigation Menu

### Files Modified
- `frontend/src/App.jsx` — added `ParticipantLayout` wrapper and new routes
- `frontend/src/components/Navbar.jsx` — **new file**

### What Was Done
A persistent, sticky top navigation bar was built and injected into every participant page using a layout wrapper pattern, removing the need for each page component to manage its own nav or logout button.

### `Navbar.jsx` — Key Details

```jsx
// Uses react-router-dom's <NavLink> which automatically applies isActive
// The style function receives { isActive } and switches between two style objects

const activeLinkStyle = { ...linkStyle, background: "#4f46e5", color: "#fff" };

<NavLink to="/dashboard" style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}>
  Dashboard
</NavLink>
```

- **Four nav links**: Dashboard, Browse Events, Clubs / Organizers, Profile — each highlights with indigo background when their route is active.
- **Right side**: shows the logged-in user's `firstName` (or `name` for organizers) and a red **Logout** button that clears `localStorage` and redirects to `/login`.
- The bar is `position: sticky; top: 0; zIndex: 100` so it stays visible while scrolling.

### `ParticipantLayout` in `App.jsx`

```jsx
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
```

Every participant route wraps its page component in `<ParticipantLayout>`:

```jsx
<Route
  path="/dashboard"
  element={
    isOnboarded
      ? <ParticipantLayout><Dashboard /></ParticipantLayout>
      : isParticipant ? <Navigate to="/onboarding" /> : <Navigate to="/login" />
  }
/>
```

This cleanly centralises the chrome (navbar + width constraint) without any page knowing about layout.

**New routes added**: `/browse`, `/events/:id`, `/clubs`, `/clubs/:id`

---

## 9.2 — My Events Dashboard

### Files Affected
- `backend/models/Registration.js` — **new file** (Mongoose model)
- `backend/routes/registrations.js` — **new file** (route module)
- `backend/server.js` — mounts `/api/registrations`
- `frontend/src/pages/Dashboard.jsx` — **fully rewritten**

### `Registration` Model

```js
const registrationSchema = new mongoose.Schema({
  event:       { type: ObjectId, ref: "Event",  required: true },
  participant: { type: ObjectId, ref: "User",   required: true },
  ticketId:    { type: String, unique: true, required: true },
  status:      { type: String, enum: ["confirmed","cancelled","rejected"], default: "confirmed" },
  customFieldResponses: { type: Object, default: {} }, // { "Field Label": value }
  selectedVariant:      { type: ObjectId },            // merchandise only
  quantity:             { type: Number, default: 1 },  // merchandise only
  teamName:             { type: String, default: "" },
  createdAt:            { type: Date, default: Date.now },
});
// Compound unique index prevents accidental double-registrations at DB level:
registrationSchema.index({ event: 1, participant: 1 });
```

### `Dashboard.jsx` — Tab System

The dashboard fetches all registrations for the logged-in user via `GET /api/registrations` and categorises them into **5 tabs**:

| Tab | Filter Logic |
|-----|-------------|
| **Upcoming** | `status === "confirmed"` AND `startDate > now` |
| **Normal** | `eventType === "normal"` AND `status === "confirmed"` |
| **Merchandise** | `eventType === "merchandise"` AND `status === "confirmed"` |
| **Completed** | `status === "confirmed"` AND `endDate < now` |
| **Cancelled** | `status === "cancelled"` OR `status === "rejected"` |

The Upcoming tab also shows a live count badge.

```jsx
// Tab filter logic
const filtered = registrations.filter((reg) => {
  const start = new Date(reg.event.startDate);
  const end   = reg.event.endDate ? new Date(reg.event.endDate) : start;
  switch (activeTab) {
    case "Upcoming":   return reg.status === "confirmed" && start > now;
    case "Completed":  return reg.status === "confirmed" && end < now;
    case "Cancelled":  return reg.status === "cancelled" || reg.status === "rejected";
    // ...
  }
});
```

Each **registration card** shows:
- Clickable event name (navigates to `/events/:id`)
- Coloured event-type badge (blue = normal, amber = merchandise)
- Red/dark-red status badges for cancelled/rejected
- Organizer name, start & end date
- Team name and quantity (if applicable)
- Clickable `ticketId` (navigates to `/events/:id?ticket=TKT-...` to open the ticket modal)
- Cancelled cards have a red-tinted background (`#fef2f2`)

---

## 9.3 — Browse Events Page

### Files Affected
- `backend/routes/events.js` — enhanced `GET /` (search/filter) and added `GET /trending`
- `frontend/src/pages/BrowseEvents.jsx` — **new file**

### Backend Enhancements (`events.js`)

**`GET /api/events`** now accepts query parameters:

```js
// Search by event name OR organizer name
if (search) {
  const orgs = await User.find({ role: "organizer", name: { $regex: search, $options: "i" } });
  query.$or = [
    { name: { $regex: search, $options: "i" } },
    { organizer: { $in: orgs.map(o => o._id) } },
  ];
}
if (eventType && eventType !== "all") query.eventType = eventType;
if (eligibility && eligibility !== "all") query.eligibility = eligibility;
if (startAfter)  query.startDate = { ...query.startDate, $gte: new Date(startAfter) };
if (startBefore) query.startDate = { ...query.startDate, $lte: new Date(startBefore) };
if (followedClubs === "true") {
  query.organizer = { $in: user.followingClubs };
}
```

Each event in the response gets a `registrationCount` field (live count from the `Registration` collection).

**`GET /api/events/trending`** — top 5 events by registration activity in the last 24 hours:

```js
const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
const counts = await Registration.aggregate([
  { $match: { createdAt: { $gte: since }, status: "confirmed" } },
  { $group: { _id: "$event", count: { $sum: 1 } } },
  { $sort: { count: -1 } },
  { $limit: 5 },
]);
```

> **Route ordering**: `/trending` must be declared **before** `/:id` in the router file to prevent Express treating "trending" as a dynamic `:id` parameter.

### `BrowseEvents.jsx` — UI Structure

1. **Trending strip** — horizontal scrollable row of up to 5 cards, each showing event name, organizer, and registration count in the last 24h. Only shown when there are trending results.
2. **Search bar** — real-time, queries backend on every change using a `useEffect` that depends on all filter state.
3. **Filters row** — Type dropdown (All / Normal / Merchandise), Eligibility dropdown (All / Open to All / IIIT Only), "Followed Clubs" checkbox.
4. **Date range** — "From" and "To" date inputs that map to `startAfter` / `startBefore` query params.
5. **Clear Filters** button — only visible when any filter is active; resets all state to defaults.
6. **Results list** — event cards with name, type badge, eligibility badge, deadline-passed badge, truncated description, organizer, date, fee, tag chips, and registration count.

Cards have `opacity: 0.6` when the event has already started, and show a hover shadow on mouse-enter.

---

## 9.4 — Event Details Page

### Files Affected
- `frontend/src/pages/EventDetails.jsx` — **new file**

### Data Fetching

```jsx
useEffect(() => {
  fetchEvent();            // GET /api/events/:id
  fetchMyRegistration();   // GET /api/registrations — find the one matching this event
}, [id]);

// On mount, also check for ?ticket=TKT-... in URL (from Dashboard card click)
useEffect(() => {
  const ticketId = searchParams.get("ticket");
  if (ticketId) fetchTicket(ticketId);
}, [searchParams]);
```

### Blocking Logic

Before rendering the registration form, five booleans are computed client-side:

```jsx
const deadlinePassed  = event.registrationDeadline && new Date(event.registrationDeadline) < now;
const eventStarted    = new Date(event.startDate) < now;
const limitReached    = event.registrationLimit > 0 && regCount >= event.registrationLimit;
const ineligible      = event.eligibility === "iiit_only" && !user.isIIIT;
const alreadyRegistered = !!myRegistration;
const allOutOfStock   = event.eventType === "merchandise" && event.variants.every(v => v.stock <= 0);

const canRegister = !deadlinePassed && !eventStarted && !limitReached
                 && !ineligible && !alreadyRegistered && !allOutOfStock;
```

Each blocking condition renders a distinct red banner message when true, and the registration form is only shown when `canRegister === true`.

### Event Info Section

Displays in a 2-column grid:
- Start date, End date, Registration deadline, Fee (₹ or "Free"), Eligibility, Registration limit (as `current / max`)
- Tags as indigo chip badges
- Organizer name as a link to `/clubs/:id`

### Merchandise Variants Grid

For merchandise events, all variants are shown in a card grid:
- Out-of-stock variants are highlighted red + `opacity: 0.6`
- The `label` field is shown if set, otherwise falls back to `"${size} ${color}"`

---

## 9.5 — Event Registration Workflows

### Files Affected
- `backend/routes/registrations.js` — **new file**
- `frontend/src/pages/EventDetails.jsx` — registration form + ticket modal

### `POST /api/registrations/:eventId` — Full Validation Chain

The backend validates every condition in order before saving:

1. **Role check** — only participants can register
2. **Event exists** — 404 if not found
3. **Eligibility** — 403 if `iiit_only` and `!user.isIIIT`
4. **Registration deadline** — 400 if `registrationDeadline < now`
5. **Event started** — 400 if `startDate < now`
6. **Duplicate check** — queries for any non-cancelled registration with same event + participant
7. **Registration limit** (normal events) — counts confirmed registrations against `event.registrationLimit`
8. **Variant exists & stock check** (merchandise) — finds variant by `event.variants.id(selectedVariant)` using Mongoose subdocument method, checks `variant.stock >= qty`
9. **Purchase limit** (merchandise) — aggregates total quantity purchased by this user for this event (handles multiple purchases of different variants), checks against `event.purchaseLimit`
10. **Stock decrement** — `variant.stock -= qty; await event.save()`

### Ticket ID Generation

```js
function generateTicketId() {
  return "TKT-" + crypto.randomBytes(6).toString("hex").toUpperCase();
}
// Example: TKT-A3F92E1C4B27
```

Uses Node's built-in `crypto` module (no extra dependency). The `ticketId` field has `unique: true` in the schema to prevent collisions at the database level as a safety net.

### Cancel Registration (`PUT /api/registrations/:id/cancel`)

- Verifies the registration belongs to the requesting user
- Sets `status = "cancelled"`
- **Stock restoration**: if it was a merchandise registration, finds the variant by `event.variants.id(reg.selectedVariant)` and restores the quantity: `variant.stock += reg.quantity`

### Ticket Modal (Frontend)

When registration succeeds (or when the user clicks their ticket ID), a full-screen modal opens:

```jsx
<QRCodeSVG
  value={JSON.stringify({
    ticketId: ticket.ticketId,
    event: ticket.event?.name,
    participant: `${firstName} ${lastName}`,
    email: ticket.participant?.email,
  })}
  size={180}
  level="M"   // Medium error correction
/>
```

The QR payload is a JSON string containing `ticketId`, event name, participant name, and email — sufficient for a scanner to verify attendance. Below the QR code, all ticket details are shown in a readable list including ticket ID, event, type, participant, college, team name, quantity, status, and registration timestamp.

---

## 9.6 — Profile Page

### Files Affected
- `backend/routes/auth.js` — added two new `PUT` endpoints
- `frontend/src/pages/Profile.jsx` — **fully rewritten**

### Backend: `PUT /api/auth/profile`

Updates editable profile fields for a participant. Only the four fields listed below can be changed — `email` and `isIIIT` are intentionally excluded (non-editable):

```js
router.put("/profile", auth, async (req, res) => {
  const { firstName, lastName, contactNumber, college } = req.body;
  if (firstName !== undefined) user.firstName = firstName;
  if (lastName  !== undefined) user.lastName  = lastName;
  // Also keep the denormalised `name` field in sync:
  if (firstName !== undefined || lastName !== undefined) {
    user.name = `${user.firstName} ${user.lastName}`;
  }
  if (contactNumber !== undefined) user.contactNumber = contactNumber;
  if (college       !== undefined) user.college       = college;
  await user.save();
  // Returns full user object (password stripped) as `res.data.user`
});
```

After a successful save, the frontend updates `localStorage.user` with the merged result so the navbar and other UI reflect the new name immediately.

### Backend: `PUT /api/auth/change-password`

```js
router.put("/change-password", auth, async (req, res) => {
  // Guards: both fields required, newPassword min 6 chars
  const isMatch = await bcrypt.compare(currentPassword, user.password);
  if (!isMatch) return res.status(400).json({ msg: "Current password is incorrect" });
  user.password = await bcrypt.hash(newPassword, salt);
  await user.save();
});
```

The current password must be provided and verified before the new hash is stored — protecting against session hijacking.

### `Profile.jsx` — Three Sections

**Section 1: Account Info (Non-Editable)**
```jsx
<p><strong>Email:</strong> {profile.email}</p>
<p><strong>Participant Type:</strong> {profile.isIIIT ? "IIIT Student" : "Non-IIIT"}</p>
```
Displayed in a grey card with no input fields — users cannot change email or IIIT status.

**Section 2: Personal Information (Editable)**
Controlled inputs for `firstName`, `lastName` (side-by-side), `contactNumber`, and `college`. On mount, values are populated by calling `GET /api/auth/me` to always show the live server state. "Save Profile" calls `PUT /api/auth/profile` and updates `localStorage`.

**Section 3: Interests & Followed Clubs**
Retained from the old profile page — tag buttons for interests and club toggles grouped by category, saved via `PUT /api/preferences`.

**Section 4: Security Settings — Change Password**
Three password fields (current, new, confirm). Client-side check ensures new === confirm before sending to backend. Correct error messages shown inline for both mismatch and wrong current password.

---

## 9.7 — Clubs / Organizers Listing

### Files Affected
- `backend/routes/preferences.js` — added `GET /organizers` and `POST /follow/:id`
- `frontend/src/pages/ClubsList.jsx` — **fully implemented** (was placeholder)

### Backend: `GET /api/preferences/organizers`

Returns all organizers plus the current user's `followingClubs` array in one round trip:

```js
router.get("/organizers", auth, async (req, res) => {
  const organizers = await User.find({ role: "organizer" })
    .select("name category description contactEmail _id");
  const me = await User.findById(req.user.id).select("followingClubs");
  res.json({ organizers, following: me.followingClubs || [] });
});
```

The frontend maps `following` IDs to strings for fast `includes()` comparisons.

### Backend: `POST /api/preferences/follow/:id`

Toggles follow/unfollow atomically:

```js
router.post("/follow/:id", auth, async (req, res) => {
  const idx = user.followingClubs.findIndex(id => id.toString() === orgId);
  if (idx === -1) user.followingClubs.push(orgId);   // Follow
  else            user.followingClubs.splice(idx, 1); // Unfollow
  await user.save();
  res.json({ followingClubs: user.followingClubs });
});
```

The response array is used to immediately update local state, so the button label flips without a page reload.

### `ClubsList.jsx` — UI

- **Category filter** dropdown — derived from unique `category` values across all organizers.
- **Grid layout** — `repeat(auto-fill, minmax(300px, 1fr))` responsive card grid.
- Each card shows: name (clickable → detail page), category badge, truncated description (120 chars).
- **Follow/Unfollow button** — red border + red text when following, indigo solid when not following.
- **View Details button** — navigates to `/clubs/:id`.

---

## 9.8 — Organizer Detail Page

### Files Affected
- `backend/routes/preferences.js` — added `GET /organizer/:id`
- `frontend/src/pages/ClubDetail.jsx` — **fully implemented** (was placeholder)

### Backend: `GET /api/preferences/organizer/:id`

Single organizer detail with their event split into upcoming and past:

```js
router.get("/organizer/:id", auth, async (req, res) => {
  const org     = await User.findById(req.params.id).select("name category description contactEmail _id");
  const now     = new Date();
  const upcoming = await Event.find({ organizer: org._id, startDate: { $gte: now } })
    .sort({ startDate: 1 })
    .select("title eventType startDate endDate registrationDeadline tags");
  const past    = await Event.find({ organizer: org._id, startDate: { $lt: now } })
    .sort({ startDate: -1 })
    .select("title eventType startDate endDate tags");
  const me       = await User.findById(req.user.id).select("followingClubs");
  const isFollowing = me.followingClubs.some(id => id.toString() === org._id.toString());
  res.json({ organizer: org, upcoming, past, isFollowing });
});
```

Upcoming events are sorted ascending (soonest first); past events descending (most recent first).

### `ClubDetail.jsx` — UI

**Header area:**
- Organizer name (large), category badge
- **Follow/Unfollow** button in the top-right — same toggle logic as in ClubsList but on the detail page

**Info area:**
- Full description and contact email displayed

**Event tabs:**
- Two tabs: `Upcoming (N)` and `Past (N)` with live counts shown in the tab label
- Active tab highlighted with indigo border + background tint

**Event list cards:**
```jsx
<div
  onClick={() => navigate(`/events/${evt._id}`)}
  onMouseEnter={e => e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,.08)"}
  onMouseLeave={e => e.currentTarget.style.boxShadow = "none"}
>
  {/* event name + type badge + date range + tags */}
</div>
```

Clicking any event card navigates to the full `EventDetails` page for that event.

---

## New Files Summary

| File | Type | Purpose |
|------|------|---------|
| `backend/models/Registration.js` | Model | Ticket/registration data with unique ticketId |
| `backend/routes/registrations.js` | Routes | Full registration CRUD + validation |
| `frontend/src/components/Navbar.jsx` | Component | Sticky nav bar for all participant pages |
| `frontend/src/pages/BrowseEvents.jsx` | Page | Search + filter + trending event discovery |
| `frontend/src/pages/EventDetails.jsx` | Page | Full event detail, blocking logic, registration form, QR ticket modal |
| `frontend/src/pages/ClubsList.jsx` | Page | Organizer grid with follow/unfollow |
| `frontend/src/pages/ClubDetail.jsx` | Page | Single organizer info + upcoming/past event tabs |

## Modified Files Summary

| File | What Changed |
|------|-------------|
| `backend/server.js` | Mounts `/api/registrations` route |
| `backend/routes/events.js` | Added search/filter query params to `GET /`, added `GET /trending` |
| `backend/routes/auth.js` | Added `PUT /profile`, `PUT /change-password` |
| `backend/routes/preferences.js` | Added `GET /organizers`, `POST /follow/:id`, `GET /organizer/:id` |
| `frontend/src/App.jsx` | Added `ParticipantLayout`, new routes `/browse` `/events/:id` `/clubs` `/clubs/:id` |
| `frontend/src/pages/Dashboard.jsx` | Full rewrite — 5-tab registration dashboard |
| `frontend/src/pages/Profile.jsx` | Full rewrite — editable fields, non-editable display, password change |

---

## Dependencies Added

| Package | Where | Why |
|---------|-------|-----|
| `qrcode.react` | frontend | Renders QR codes in the ticket modal via `<QRCodeSVG>` |
