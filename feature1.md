# Feature 1: Anonymous Feedback System (Tier C — 2 Marks)

## What This Feature Does

Participants can leave **anonymous feedback** (star rating + text comment) on events they attended, once the event is marked **completed** or **closed**. Organizers see **aggregated ratings**, a **star distribution chart**, and can **filter reviews by rating**. Feedback is anonymous — the organizer never sees who left which review.

---

## Files Created / Modified

### New Files

| File | Purpose |
|------|---------|
| `backend/models/Feedback.js` | Mongoose schema for feedback entries |
| `backend/routes/feedback.js` | API routes for submitting and fetching feedback |

### Modified Files

| File | What Changed |
|------|-------------|
| `backend/server.js` | Added `require("./routes/feedback")` and mounted at `/api/feedback` |
| `frontend/src/config.js` | Added `API_FEEDBACK` export |
| `frontend/src/pages/EventDetails.jsx` | Added feedback form + feedback list at the bottom for completed events |
| `frontend/src/pages/OrganizerEventDetail.jsx` | Added feedback stats + review list section for completed events |

---

## Backend — How It Works

### Feedback Model (`backend/models/Feedback.js`)

```js
const feedbackSchema = new mongoose.Schema({
  event: { type: ObjectId, ref: "Event", required: true },
  participant: { type: ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

// One feedback per participant per event
feedbackSchema.index({ event: 1, participant: 1 }, { unique: true });
```

**Why store participant?** We store it to enforce "one review per person" via a unique compound index, but we **never return it** in GET responses — that's how anonymity works.

### API Routes (`backend/routes/feedback.js`)

| Method | Endpoint | Who Can Use | What It Does |
|--------|----------|-------------|-------------|
| `POST` | `/api/feedback/:eventId` | Authenticated participant | Submit star rating (1-5) + optional comment |
| `GET` | `/api/feedback/:eventId` | Any authenticated user | Get all feedback (anonymous) + aggregated stats |
| `GET` | `/api/feedback/:eventId/my` | Authenticated participant | Check if user already submitted feedback |

#### POST — Submit Feedback

Validations (in order):
1. Rating must be 1-5 (rejects anything else)
2. Event must exist
3. Event status must be "completed" or "closed" (can't review ongoing events)
4. User must have a confirmed registration for this event
5. User hasn't already submitted feedback (unique index also prevents duplicates)

```js
// Key part — only completed events can receive feedback
if (!["completed", "closed"].includes(event.status)) {
  return res.status(400).json({ msg: "Feedback can only be submitted for completed events" });
}
```

#### GET — Fetch Feedback

Returns two things:
1. **feedbacks** — array of `{ rating, comment, createdAt }` (no participant info!)
2. **stats** — `{ total, avgRating, distribution: { 1: count, 2: count, ... } }`

Supports `?filterRating=5` query param to filter displayed reviews. Stats are always computed from ALL feedback regardless of filter.

#### GET /my — Check Existing

Returns `{ submitted: true/false, feedback: { rating, comment } | null }`. Used to hide the form if user already reviewed.

---

## Frontend — Participant View (`EventDetails.jsx`)

The feedback section appears **only when event status is "completed" or "closed"**.

### State Variables Added

```js
const [feedbackRating, setFeedbackRating] = useState(0);      // User's selected stars
const [feedbackComment, setFeedbackComment] = useState("");    // User's comment text
const [feedbackSubmitted, setFeedbackSubmitted] = useState(false); // Already submitted?
const [feedbackMsg, setFeedbackMsg] = useState("");            // Success/error message
const [feedbackList, setFeedbackList] = useState([]);          // All reviews for display
const [feedbackStats, setFeedbackStats] = useState(null);      // Aggregated stats
const [feedbackFilterRating, setFeedbackFilterRating] = useState("all"); // Filter value
```

### What The User Sees

1. **If registered and haven't given feedback yet**: A form with:
   - 5 clickable star icons (gold when selected, gray when not)
   - A text area for optional comment
   - Submit button

2. **If already submitted**: Green "✓ You have already submitted your feedback" message

3. **For everyone**: Aggregated stats bar chart + scrollable list of anonymous reviews

### Star Rating UI

```jsx
{[1, 2, 3, 4, 5].map((star) => (
  <span
    key={star}
    onClick={() => setFeedbackRating(star)}
    style={{
      fontSize: 28, cursor: "pointer",
      color: star <= feedbackRating ? "#f59e0b" : "#d1d5db",
    }}
  >
    ★
  </span>
))}
```

Simple: clicking star 3 sets rating to 3 and highlights stars 1-3 in gold.

### Filter Buttons

Six pill buttons: All, 5★, 4★, 3★, 2★, 1★. Clicking one sets `feedbackFilterRating` which triggers a useEffect to refetch reviews with `?filterRating=X`.

---

## Frontend — Organizer View (`OrganizerEventDetail.jsx`)

Same feedback display as participant view but without the submit form. Organizers see:

1. **Big average rating** number with filled/empty stars
2. **Distribution bar chart** (5★ → 1★ with proportional bars)
3. **Filter pills** to view only specific star ratings
4. **Review list** with quoted comments in italic

This section only renders when `event.status` is "completed" or "closed".

---

## Edge Cases Handled

| Edge Case | How It's Handled |
|-----------|-----------------|
| Double submission | Unique compound index on (event, participant) prevents it at DB level; also checked before insert |
| Not registered | 403 error "You must be registered for this event" |
| Event not completed | 400 error "Feedback can only be submitted for completed events" |
| No rating selected | Client-side check + server-side validation (must be 1-5) |
| Rating out of range | `min: 1, max: 5` in schema + explicit check in route |
| Empty comment | Allowed — comment is optional (defaults to "") |
| Anonymity | GET responses never include participant field — only rating, comment, date |

---

## How to Test

1. Create an event as organizer, publish it
2. Register as a participant
3. Set event status to "completed" (as organizer)
4. Go to event details as participant — you'll see the feedback section
5. Click stars, type a comment, submit
6. Refresh — form is gone, replaced with "already submitted" message
7. Log in as organizer — go to event detail — see the feedback with stats

---

## Viva Q&A Prep

**Q: How is the feedback anonymous?**
A: We store the participant ID only to prevent duplicate submissions (using a unique compound index). When we return feedback via GET, we only `.select("rating comment createdAt")` — the participant field is never sent to the frontend.

**Q: Why use a compound index?**
A: `feedbackSchema.index({ event: 1, participant: 1 }, { unique: true })` ensures at the database level that one user can only submit one review per event. Even if the application check fails, the DB will reject the duplicate.

**Q: Why only allow feedback on completed events?**
A: It doesn't make sense to review an event that hasn't happened yet. The status check `["completed", "closed"].includes(event.status)` ensures timing is correct.

**Q: How does the star distribution work?**
A: On the backend, we loop through ALL feedback for the event and count how many gave 1★, 2★, etc. into a `distribution` object. The frontend renders this as proportional horizontal bars using percentage widths.

**Q: What if someone tries to submit feedback via API directly (bypassing the UI)?**
A: All validations happen server-side: auth check, registration check, event status check, duplicate check. The API is secure independent of the UI.
