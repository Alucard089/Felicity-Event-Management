# Part 5 – User Data Models

## Overview

This part updates the data models for **participants** and **organizers** to capture all required profile information as specified in the assignment. The `User` model is restructured with role-specific fields, and all related frontend forms and dashboard pages are updated accordingly.

---

## What Changed

### 1. User Model (`backend/models/User.js`)

The schema is now organized into three sections:

**Common fields** (all roles):
- `email` – unique, required
- `password` – hashed, required
- `role` – `"participant"`, `"organizer"`, or `"admin"`

**Participant fields:**
- `firstName` – participant's first name
- `lastName` – participant's last name
- `isIIIT` – auto-detected from email domain (`@students.iiit.ac.in` or `@research.iiit.ac.in`)
- `college` – college or organization name
- `contactNumber` – phone number
- `interests` – array of selected interest areas
- `followingClubs` – array of organizer ObjectIds the participant follows
- `onboarded` – whether onboarding is complete

**Organizer fields:**
- `name` – organizer / club name
- `category` – e.g. "Technical", "Cultural"
- `description` – short description of the organizer
- `contactEmail` – public contact email for the organizer

---

### 2. Registration Backend (`backend/routes/auth.js`)

**Register endpoint (`POST /register`):**
- Now accepts `firstName`, `lastName`, `college`, `contactNumber` instead of a single `name` field.
- `isIIIT` is auto-detected from the email domain (no longer sent by the client).
- A computed `name` field (`firstName + " " + lastName`) is stored for backward compatibility.
- Response returns all new fields to the client.

**Login endpoint (`POST /login`):**
- Response now includes `firstName`, `lastName`, `college`, `contactNumber`, `category`, `description`, `contactEmail` so the client has the full user object.

---

### 3. Registration Form (`frontend/src/pages/Register.jsx`)

The form now collects:
- **First Name** and **Last Name** (two separate inputs)
- **Email** (with auto-detection message for IIIT emails)
- **Password**
- **College / Organization Name**
- **Contact Number**

The IIIT checkbox is gone — the system auto-detects from the email domain and shows a blue info message when an IIIT email is entered.

---

### 4. Admin Create-Organizer (`backend/routes/admin.js` + `frontend/src/pages/AdminDashboard.jsx`)

**Backend:**
- `POST /create-organizer` now accepts `category`, `description`, `contactEmail` in addition to `name`, `email`, `password`.
- These are stored in the new User document.

**Frontend (AdminDashboard.jsx):**
- The create-organizer form now has fields for:
  - Club / Organizer Name (required)
  - Email (required)
  - Password (required)
  - Category (optional)
  - Description (optional, textarea)
  - Contact Email (optional)
- The organizer list shows the new fields: category tag next to the name, contact email, and description.

---

### 5. Dashboard Pages

**Dashboard.jsx (Participant):**
- Shows `firstName lastName` instead of `name`.
- Displays college and contact number if present.
- Always shows IIIT Student status.

**OrganizerDashboard.jsx:**
- Shows organizer name, email, role.
- Displays category, description, and contact email if present.

**Profile.jsx (Participant):**
- Shows `firstName lastName` instead of `name`.
- Displays college, contact number, and IIIT status.
- Preferences section unchanged.

---

## Files Modified

| File | Change |
|------|--------|
| `backend/models/User.js` | Restructured schema with participant/organizer fields |
| `backend/routes/auth.js` | Register accepts new fields; Login returns all fields |
| `backend/routes/admin.js` | Create-organizer accepts category/description/contactEmail |
| `frontend/src/pages/Register.jsx` | Form collects firstName, lastName, college, contactNumber |
| `frontend/src/pages/AdminDashboard.jsx` | Form + list updated with organizer fields |
| `frontend/src/pages/Dashboard.jsx` | Shows firstName/lastName, college, contactNumber |
| `frontend/src/pages/OrganizerDashboard.jsx` | Shows category, description, contactEmail |
| `frontend/src/pages/Profile.jsx` | Shows firstName/lastName, college, contactNumber |

---

## How to Test

1. **New participant registration:** Go to `/register`, fill in all fields. The IIIT status auto-detects from email. After login, the dashboard shows firstName/lastName, college, contact.

2. **Create organizer (admin):** Log in as admin (`admin@felicity.iiit.ac.in` / `admin123`). Create an organizer with category, description, and contact email. The organizer list shows these details.

3. **Organizer login:** Log in as the new organizer. The organizer dashboard shows category, description, and contact email.

4. **Existing users:** Old users without the new fields will see blank values for the new fields — no errors.
