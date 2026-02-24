# Feature 2: Organizer Password Reset Workflow (Tier B — 6 Marks)

## What This Feature Does

A complete **password reset request workflow** between organizers and admins:

1. **Organizer** submits a password reset request with a **reason** (e.g., "forgot password")
2. **Admin** sees all requests with details — club name, date, reason
3. **Admin** can **approve** (auto-generates new password) or **reject** (with comment)
4. All requests are tracked with status: **Pending → Approved / Rejected**
5. Full **password reset history** is preserved (every request stays in the database)
6. Organizer can see the **status of their latest request** on their profile page

---

## Files Created / Modified

### New Files

| File | Purpose |
|------|---------|
| `backend/models/PasswordResetRequest.js` | Mongoose schema for password reset requests with status tracking |

### Modified Files

| File | What Changed |
|------|-------------|
| `backend/routes/admin.js` | Rewrote entire password reset section — new endpoints for approve/reject with comments |
| `frontend/src/pages/PasswordResetRequests.jsx` | Complete rewrite — status tabs, comment modal, history view |
| `frontend/src/pages/OrganizerProfile.jsx` | Added reason textarea + request status display |
| `frontend/src/pages/AdminDashboard.jsx` | Updated to count only pending requests |

---

## Backend — The PasswordResetRequest Model

```js
const passwordResetRequestSchema = new mongoose.Schema({
  organizer: { type: ObjectId, ref: "User", required: true },
  reason: { type: String, required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  adminComment: { type: String, default: "" },
  generatedPassword: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
});
```

**Why a separate model instead of fields on User?**
The previous implementation stored `passwordResetRequested` as a boolean on the User model. This only tracked "yes/no" — no history, no reason, no admin comments. A dedicated model allows:
- Multiple requests over time (history)
- Each request has its own status, reason, admin comment
- Query by status (pending/approved/rejected)
- Track resolution timestamps

---

## API Routes

| Method | Endpoint | Who | What It Does |
|--------|----------|-----|-------------|
| `POST` | `/api/admin/request-reset` | Organizer | Submit request with `reason` field |
| `GET` | `/api/admin/reset-requests?status=pending` | Admin | List requests filtered by status |
| `POST` | `/api/admin/approve-reset/:id` | Admin | Approve request, auto-generate password, save admin comment |
| `POST` | `/api/admin/reject-reset/:id` | Admin | Reject request with admin comment |
| `GET` | `/api/admin/my-reset-status` | Organizer | Check latest request status |

### POST /request-reset (Organizer)

**What happens:**
1. Validates user is an organizer
2. Requires a non-empty `reason` field
3. Checks for existing pending request (prevents duplicates)
4. Creates a new `PasswordResetRequest` document with status "pending"

```js
// Key validation: prevent duplicate pending requests
const existing = await PasswordResetRequest.findOne({
  organizer: req.user.id,
  status: "pending",
});
if (existing) {
  return res.status(400).json({ msg: "You already have a pending password reset request" });
}
```

### POST /approve-reset/:id (Admin)

**What happens:**
1. Finds the request by ID, populates organizer info
2. Checks request is still "pending" (can't re-approve)
3. Generates 12-char secure password using `crypto.randomBytes`
4. Hashes it and updates the organizer's password in the User model
5. Updates request: status → "approved", saves admin comment and generated password
6. Returns credentials to admin for sharing

```js
const newPassword = generatePassword(12);
const salt = await bcrypt.genSalt(10);
const hashed = await bcrypt.hash(newPassword, salt);
await User.findByIdAndUpdate(request.organizer._id, { password: hashed });
```

### POST /reject-reset/:id (Admin)

**What happens:**
1. Validates request exists and is pending
2. Sets status to "rejected", saves admin comment
3. Sets resolvedAt timestamp

### GET /my-reset-status (Organizer)

Returns the organizer's most recent request with:
- `status` (pending/approved/rejected)
- `reason`, `adminComment`, `createdAt`, `resolvedAt`

If no request exists, returns `{ hasRequest: false }`.

---

## Frontend — Admin View (PasswordResetRequests.jsx)

### Status Filter Tabs

Four pill buttons at the top: **Pending**, **Approved**, **Rejected**, **All**. Clicking one refetches the list filtered by that status. Default view is "Pending".

### Request Cards

Each card shows:
- **Club name** + category badge + email
- **Reason** in a gray box
- **Status badge** (yellow=pending, green=approved, red=rejected)
- **Timestamps** (requested date, resolved date)
- **Admin comment** (if resolved) in a purple box
- **Generated password** (if approved) in a yellow monospace box
- **Approve / Reject buttons** (only for pending requests)

### Comment Modal

When admin clicks Approve or Reject, a modal pops up:
- Textbox for admin's comment
- For approve: "A new password will be auto-generated..."
- For reject: "Optionally add a reason"
- Cancel or Submit button

After submitting, the list refreshes and credentials are shown (for approvals).

---

## Frontend — Organizer View (OrganizerProfile.jsx)

### What Changed

The password reset section at the bottom of the organizer profile now has:

1. **Request status display**: If the organizer has submitted a request, it shows:
   - Status (Pending/Approved/Rejected) with color coding
   - Submission date and resolution date
   - Admin comment (if any)

2. **Reason textarea**: The organizer must provide a reason before requesting
   - Placeholder: "Why do you need a password reset? e.g., Forgot password, compromised account..."

3. **Smart form visibility**: 
   - If there's a pending request → form is hidden, "pending review" message shown
   - If no request or last request was resolved → form is shown

```js
{(!resetStatus || resetStatus.status !== "pending") && (
  // Show the request form
)}
```

---

## Edge Cases Handled

| Edge Case | How It's Handled |
|-----------|-----------------|
| Empty reason | 400 error "Please provide a reason" — validated both client and server side |
| Duplicate pending request | Server checks for existing pending request, returns error if found |
| Re-approving resolved request | Server checks `status !== "pending"`, returns "already resolved" |
| Admin comment empty | Allowed (optional for approved, recommended for rejected) |
| Password stored securely | Generated password is bcrypt-hashed before saving to User model |
| Request history preserved | Requests are never deleted — all past requests visible via "All" filter |

---

## How to Test

1. **Log in as organizer** → go to Profile
2. Scroll down to Password Reset section
3. Enter a reason and click "Request Password Reset"
4. Notice status changes to "Pending" and form disappears

5. **Log in as admin** → go to Password Reset Requests
6. See the pending request with club name, reason, date
7. Click "Approve" → add an optional comment → confirm
8. New credentials appear in a yellow box — copy them

9. Click the "Approved" tab to see it in the history
10. Try requesting again as organizer → submit with different reason
11. This time click "Reject" from admin → add a rejection reason
12. Click "Rejected" tab → see it in history with admin comment

13. **Log in as organizer again** → profile shows latest request status with admin comment

---

## Viva Q&A Prep

**Q: Why use a separate model instead of storing on the User model?**
A: A separate `PasswordResetRequest` model gives us full history tracking. Each request has its own status, reason, admin comment, and timestamps. With User model fields, we could only track one request at a time and lost all history when it was resolved.

**Q: How is the password generated?**
A: Using `crypto.randomBytes(12)` which generates cryptographically secure random bytes. Each byte maps to a character from a mixed set of uppercase, lowercase, digits, and special characters. The generated password is shown to the admin once, then the bcrypt hash is saved.

**Q: Can an organizer have multiple requests?**
A: Only one pending request at a time (server checks for existing pending). But after a request is resolved (approved/rejected), the organizer can submit a new one. All past requests stay in the database as history.

**Q: What does the admin comment do?**
A: It's a free-text field the admin fills when approving or rejecting. For rejections, it explains why (e.g., "Please verify your identity first"). For approvals, it can contain notes. The organizer sees this comment on their profile page.

**Q: How does the status filter work?**
A: The admin page sends `?status=pending` (or approved/rejected/all) as a query parameter. The backend filters by status field in MongoDB. The "All" option returns everything — this is the history view.
