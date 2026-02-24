# readme_8.md — Section 10: Organizer Features & Navigation [18 Marks]

## Overview
This readme documents the implementation of **Section 10** — Organizer Features & Navigation, covering subtasks 10.1 through 10.5: navigation menu, organizer dashboard, event detail page, event creation & editing with draft flow, and organizer profile with Discord integration.

---

## 10.1 — Navigation Menu [1 Mark]

### What was done
- Created `frontend/src/components/OrganizerNavbar.jsx` — a sticky top navbar for all organizer pages.
- Created `OrganizerLayout` wrapper in `App.jsx` (same pattern as `ParticipantLayout`), applying the navbar + max-width container to all organizer routes.

### Navbar items
| Link | Route | Component |
|------|-------|-----------|
| Dashboard | `/organizer` | OrganizerDashboard |
| Create Event | `/organizer/create-event` | CreateEvent |
| Ongoing Events | `/organizer/ongoing` | OrganizerOngoing |
| Profile | `/organizer/profile` | OrganizerProfile |
| Logout | (clears localStorage, redirects to `/login`) | — |

### Design
- Blue theme (#2563eb) matching the organizer role.
- NavLink active state: bold white text with underline.
- Displays the organizer's name from localStorage user object.
- Sticky positioning with z-index.

### Routes added in App.jsx
```
/organizer             → OrganizerDashboard
/organizer/create-event → CreateEvent
/organizer/event/:id    → OrganizerEventDetail
/organizer/event/:id/edit → CreateEvent (edit mode, reusing same component)
/organizer/ongoing      → OrganizerOngoing
/organizer/profile      → OrganizerProfile
```

---

## 10.2 — Organizer Dashboard [3 Marks]

### What was done
- Fully rewrote `OrganizerDashboard.jsx` to show a card grid of all events + analytics summary.

### Backend routes added
- **GET /api/events/my** — Returns all events created by the logged-in organizer, sorted by creation date. Each event includes a `registrationCount` computed via aggregation on the Registration collection.
- **GET /api/events/my/analytics** — Aggregate stats across all completed/closed events: `completedEvents`, `totalRegistrations`, `totalRevenue`, `totalMerchSold`.

### Frontend features
- **Analytics summary** (4-stat grid): Completed Events, Total Registrations, Revenue, Merch Sold — only shown when completedEvents > 0.
- **Events card grid**: Responsive `auto-fill, minmax(280px, 1fr)` layout.
- Each card shows:
  - Event name
  - Status badge (color-coded: draft=gray, published=blue, ongoing=green, completed=indigo, closed=red)
  - Event type badge (normal=blue, merchandise=amber)
  - Eligibility badge
  - Start/End dates
  - Fee amount
  - Registration count / limit
  - Truncated tags (max 3 visible + "+N more")
- Cards are clickable → navigate to `/organizer/event/:id`

---

## 10.3 — Event Detail Page (Organizer View) [4 Marks]

### What was done
- Built full `OrganizerEventDetail.jsx` with three sections: Overview, Analytics, Participants.

### Backend routes added (all require auth + isOrganizer + ownership check)
| Route | Method | Description |
|-------|--------|-------------|
| `/api/events/:id/stats` | GET | Per-event analytics: registrations, cancelled, totalRevenue, merchSold, teams |
| `/api/events/:id/participants` | GET | List participants with search (name/email), status filter, team filter. Populates participant details |
| `/api/events/:id/participants/csv` | GET | CSV export with proper escaping, Content-Type/Disposition headers |
| `/api/events/:id/status` | PUT | Status transition with strict rules (see transition map below) |

### Status transition rules
```
draft     → [published]
published → [ongoing, closed]
ongoing   → [completed, closed]
completed → [closed]
closed    → [] (terminal state)
```

### Frontend sections

**1. Header**
- Event name + status badge + event type badge
- Edit button (shown only for draft/published events)
- Back to Dashboard button

**2. Status Actions**
- Shows transition buttons based on current status (e.g. draft shows "Published" button)
- Confirm dialog before status change
- Feedback message after change

**3. Event Overview**
- Description, Start/End dates, Deadline, Fee, Eligibility, Limit
- Tags displayed as pills

**4. Analytics Cards**
- Registrations, Cancelled, Revenue, Items Sold (merch only), Teams (if > 0)
- Clean grid layout with blue accent numbers

**5. Participants Table**
- Columns: Name, Email, Reg Date, Payment, Team, Status, Ticket ID
- Search input (filters by name or email, server-side)
- Status filter dropdown (All / Confirmed / Cancelled)
- Team name filter input
- Export CSV button — downloads via axios blob response

### OrganizerOngoing.jsx
- Separate page linked from navbar
- Fetches all organizer events, filters to `status === "ongoing"`
- Card grid layout, each card clickable to event detail

---

## 10.4 — Event Creation & Editing [4 Marks]

### What was done
- Rewrote `CreateEvent.jsx` to support **dual mode**: Create (new) and Edit (existing).
- Updated backend `PUT /api/events/:id` with status-based field restrictions.
- Added form field reordering (up/down arrows).
- Added form locking after first registration.

### How edit mode works
- Route `/organizer/event/:id/edit` uses `useParams()` to detect edit mode.
- On mount, fetches event data + stats to determine:
  - `eventStatus` — the current status (draft/published)
  - `hasRegistrations` — whether anyone has registered (from stats endpoint)
- If status is ongoing/completed/closed, user is redirected back to the detail page.
- Date values are formatted for `datetime-local` input compatibility.

### Status-based editing rules

| Status | Editable Fields | Locked Fields |
|--------|----------------|---------------|
| Draft | ALL fields | None |
| Published | description, registrationDeadline, registrationLimit | name, eventType, eligibility, dates, fee, tags |
| Ongoing/Completed/Closed | None (redirect to detail page) | Everything |

### Form field locking
- When `hasRegistrations` is true, custom fields and variants are fully locked (disabled inputs, no add/remove).
- Backend also checks: if `customFields` or `variants` are in the request body, it counts confirmed registrations and rejects if > 0.
- Warning banner shown: "Form fields are locked — participants have already registered."

### Field reordering
- Each custom field row has ▲ and ▼ buttons.
- `moveField(idx, direction)` swaps adjacent array elements.
- First field disables ▲, last field disables ▼.
- Disabled when form is locked.

### Backend changes (`PUT /api/events/:id`)
```javascript
// Status-based allowed fields
if (status === "draft") {
  allowed = ["name", "description", "eventType", "eligibility",
    "registrationDeadline", "startDate", "endDate",
    "registrationLimit", "registrationFee", "tags",
    "customFields", "variants", "purchaseLimit"];
} else if (status === "published") {
  allowed = ["description", "registrationDeadline", "registrationLimit"];
}
// ongoing/completed/closed → 400 error
```

### Create mode
- Button text: "Create Event (Draft)"
- Events are created with `status: "draft"` by default (set in Event model schema).
- After creation, navigates to `/organizer`.

### Edit mode
- Button text: "Save Changes"
- Back button goes to event detail page instead of dashboard.
- Status indicator shown below title with editing restrictions explanation.

---

## 10.5 — Organizer Profile Page [4 Marks]

### What was done
- Built full `OrganizerProfile.jsx` with editable profile fields and Discord integration.
- Added backend routes for profile get/update.

### Backend routes added
| Route | Method | Description |
|-------|--------|-------------|
| `/api/events/my/profile` | GET | Returns organizer's profile (email, name, category, description, contactEmail, contactNumber, discordWebhookUrl) |
| `/api/events/my/profile` | PUT | Updates editable profile fields. Email (login) is excluded from updates |

### Profile fields

| Field | Editable | Notes |
|-------|----------|-------|
| Login Email | No | Shown disabled with gray background |
| Organization Name | Yes | Required field |
| Category | Yes | Dropdown from CATEGORIES list |
| Description | Yes | Textarea |
| Contact Email | Yes | Public-facing email (separate from login) |
| Contact Number | Yes | Phone number |
| Discord Webhook URL | Yes | Special section with Discord branding |

### Discord Integration
- Styled section with Discord color (#5865f2) border.
- Explanation text: "When you publish a new event, it will automatically be posted to your Discord channel."
- Input for webhook URL (from Discord channel settings → Integrations → Webhooks).

### How Discord auto-post works
- When `PUT /api/events/:id/status` changes status to `"published"`:
  1. Loads the organizer from DB
  2. Checks if `discordWebhookUrl` is set
  3. Sends a Discord embed via native `fetch()`:
     - Title: event name with 🎉 emoji
     - Description: event description
     - Fields: Type, Eligibility, Start date, Fee
     - Footer: "Published by [organizer name]"
     - Timestamp
  4. Fire-and-forget (errors logged, don't block the response)

### localStorage sync
- When the organizer name changes, the stored user object in localStorage is updated so the navbar reflects the new name immediately.

---

## File Summary

### New files created
| File | Purpose |
|------|---------|
| `frontend/src/components/OrganizerNavbar.jsx` | Organizer navigation bar |
| `frontend/src/pages/OrganizerEventDetail.jsx` | Event detail page with analytics + participants |
| `frontend/src/pages/OrganizerOngoing.jsx` | Filtered view of ongoing events |
| `frontend/src/pages/OrganizerProfile.jsx` | Organizer profile editor |

### Modified files
| File | Changes |
|------|---------|
| `frontend/src/App.jsx` | Added OrganizerLayout, 6 organizer routes, imports |
| `frontend/src/pages/CreateEvent.jsx` | Full rewrite: edit mode, status-based restrictions, field reordering, form locking |
| `frontend/src/pages/OrganizerDashboard.jsx` | Full rewrite: card grid, analytics summary |
| `backend/routes/events.js` | Added 8 new routes (profile, analytics, stats, participants, csv, status, profile update) + status-based PUT restrictions + Discord webhook |
| `backend/models/Event.js` | Added `status` field (enum: draft/published/ongoing/completed/closed, default: draft) |
| `backend/models/User.js` | Added `contactNumber` and `discordWebhookUrl` fields for organizers |

### Route inventory (events.js — 14 routes total)
```
POST   /                        → Create event
GET    /my/profile               → Get organizer profile
PUT    /my/profile               → Update organizer profile
GET    /my                       → List organizer's events
GET    /my/analytics             → Aggregate organizer stats
GET    /                         → List/search/filter events (participants)
GET    /trending                 → Trending events
GET    /:id/stats                → Per-event analytics
GET    /:id/participants         → List event participants
GET    /:id/participants/csv     → Export participants CSV
PUT    /:id/status               → Change event status (with rules + Discord)
GET    /:id                      → Get single event
PUT    /:id                      → Update event (status-based restrictions)
DELETE /:id                      → Delete event
```

---

## Edge Cases Handled

1. **Route ordering**: All static paths (`/my`, `/my/profile`, `/my/analytics`, `/trending`) are defined before parameterized (`/:id/*`) routes to prevent Express matching conflicts.
2. **Status transitions**: Strict allowed-transitions map prevents invalid state changes (e.g. can't go from draft→ongoing directly, must publish first).
3. **Form locking**: Custom fields and variants can't be modified after first registration, enforced both frontend (disabled inputs) and backend (registration count check).
4. **Published edit restrictions**: When event is published, only description/deadline/limit can be edited — enforced both frontend (disabled inputs) and backend (allowed fields list).
5. **Non-editable events**: Ongoing/completed/closed events redirect from edit page to detail page.
6. **CSV escaping**: Values wrapped in double quotes with `""` escaping for embedded quotes.
7. **Discord webhook failures**: Fire-and-forget with error logging, never blocks the status change response.
8. **Date formatting**: Event dates converted to `datetime-local` format for form pre-population in edit mode.
9. **Ownership checks**: Every organizer-specific route verifies `event.organizer === req.user.id`.
10. **Empty states**: "No ongoing events", "No participants found" messages displayed gracefully.
