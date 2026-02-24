# Part 6 – Event Types & Attributes

## Overview

This part implements **two event types** (Normal and Merchandise) with full CRUD for organizers, plus a **dynamic form builder** for Normal events and **variant/stock management** for Merchandise events.

---

## Event Types

### Normal Event (Individual)
- Single participant registration
- Examples: workshops, talks, competitions
- Has a **custom registration form builder** — organizers can add fields (text, number, email, select, checkbox, textarea) that participants will fill when registering

### Merchandise Event (Individual)
- Used for selling merchandise (T-shirts, hoodies, kits)
- Individual purchase only
- Has **variant management** — organizers define size/color/label variants with stock quantities
- **Purchase limit** — configurable max items per participant

---

## Event Attributes (stored on every event)

| Attribute | Type | Notes |
|-----------|------|-------|
| `name` | String | Required |
| `description` | String | Optional |
| `eventType` | Enum | `"normal"` or `"merchandise"` |
| `eligibility` | String | `"all"` or `"iiit_only"` |
| `registrationDeadline` | Date | Optional |
| `startDate` | Date | Required |
| `endDate` | Date | Optional |
| `registrationLimit` | Number | 0 = unlimited |
| `registrationFee` | Number | 0 = free |
| `organizer` | ObjectId → User | Auto-set from logged-in organizer |
| `tags` | [String] | Uses same 19 category names as interests |
| `customFields` | [FormField] | Normal events only |
| `variants` | [Variant] | Merchandise events only |
| `purchaseLimit` | Number | Merchandise events only (default 1) |

### FormField schema (for custom registration forms)
```
{ label: String, type: Enum, required: Boolean, options: [String] }
```
Types: `text`, `number`, `email`, `select`, `checkbox`, `textarea`

### Variant schema (for merchandise)
```
{ size: String, color: String, label: String, stock: Number }
```

---

## Files Created / Modified

| File | Change |
|------|--------|
| `backend/models/Event.js` | **New** — Mongoose schema for events with both type sub-schemas |
| `backend/routes/events.js` | **New** — Full CRUD: create, list own, list all, get one, update, delete |
| `backend/server.js` | Mounted `/api/events` routes |
| `frontend/src/pages/CreateEvent.jsx` | **New** — Event creation form with dynamic form builder + variant manager |
| `frontend/src/pages/OrganizerDashboard.jsx` | Rewritten — lists events with details, "+ New Event" button, delete |
| `frontend/src/App.jsx` | Added `/organizer/create-event` route |

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/events` | Organizer | Create event |
| `GET` | `/api/events/my` | Organizer | List own events |
| `GET` | `/api/events` | Any logged-in | List all events |
| `GET` | `/api/events/:id` | Any logged-in | Get single event |
| `PUT` | `/api/events/:id` | Owner organizer | Update event |
| `DELETE` | `/api/events/:id` | Owner organizer | Delete event |

---

## How to Test

1. **Login as admin** (`admin@felicity.iiit.ac.in` / `admin123`) → create an organizer if you haven't
2. **Login as organizer** → you'll see the updated Organizer Dashboard with a "+ New Event" button
3. **Create a Normal event** — add custom form fields (e.g. "Team Name" text field, "T-shirt Size" select with S/M/L/XL)
4. **Create a Merchandise event** — add variants (e.g. Size: XL, Color: Black, Stock: 50) and set a purchase limit
5. Events appear in the dashboard with type badges, dates, tags, and details
6. Delete events with the red delete button

---

## Design Notes

- **Tags use the same 19 categories** as participant interests and organizer categories — this ensures future event feed ordering works with a simple `$in` match
- **Organizer ownership** is enforced on update/delete — only the organizer who created an event can modify it
- **Custom form fields** are stored as an array of field definitions in the event document — when registration is built, these definitions will generate the actual form
