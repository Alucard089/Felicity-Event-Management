# Feature 3: Real-Time Discussion Forum (Tier B — 6 Marks)

## What This Feature Does

A **real-time discussion forum** embedded on the Event Details page. Participants can post messages, ask questions, and interact. Organizers can moderate the forum by pinning/deleting messages and posting announcements. Messages appear in real-time using **Socket.io** — no need to refresh the page.

---

## Files Created / Modified

### New Files

| File | Purpose |
|------|---------|
| `backend/models/DiscussionMessage.js` | Mongoose schema for discussion messages |
| `backend/routes/discussions.js` | API routes for CRUD + Socket.io emission |
| `frontend/src/components/DiscussionForum.jsx` | Reusable discussion component |

### Modified Files

| File | What Changed |
|------|-------------|
| `backend/server.js` | Added Socket.io server setup with room-based events |
| `frontend/src/config.js` | Added `API_DISCUSSIONS` export |
| `frontend/src/pages/EventDetails.jsx` | Embedded `<DiscussionForum>` for participants |
| `frontend/src/pages/OrganizerEventDetail.jsx` | Embedded `<DiscussionForum>` for organizers |

### New Dependencies

| Package | Where | Why |
|---------|-------|-----|
| `socket.io` | Backend | WebSocket server for real-time messaging |
| `socket.io-client` | Frontend | WebSocket client to connect from React |

---

## How Socket.io Works (Simple Explanation)

**Normal HTTP (without Socket.io):**
1. Client sends request → Server responds → Connection closes
2. To check for new messages, client must keep polling (asking every few seconds)

**With Socket.io:**
1. Client opens a persistent connection (WebSocket) once
2. Server can push data to the client at any time
3. When someone sends a message, the server immediately broadcasts it to everyone in the room
4. No polling needed — instant updates

**Room concept:**
- Each event has a room: `event_<eventId>`
- When a user opens a discussion, they "join" that room
- When someone sends a message, the server emits it to all sockets in that room
- When user navigates away, they "leave" the room

---

## Backend Setup

### Socket.io in server.js

```js
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);   // Wrap Express in HTTP server

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ["GET", "POST"] },
});

app.set("io", io);   // Make io accessible via req.app.get("io") in routes

io.on("connection", (socket) => {
  socket.on("join_event", (eventId) => socket.join(`event_${eventId}`));
  socket.on("leave_event", (eventId) => socket.leave(`event_${eventId}`));
});

// IMPORTANT: Use server.listen() instead of app.listen()
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
```

**Why `http.createServer(app)`?**
Socket.io needs to attach to a raw HTTP server, not the Express app. Express's `app.listen()` creates a server internally but doesn't expose it. By creating the server manually, we can attach both Express and Socket.io to the same port.

### DiscussionMessage Model

```js
const discussionMessageSchema = new mongoose.Schema({
  event: { type: ObjectId, ref: "Event", required: true },
  author: { type: ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
  parentMessage: { type: ObjectId, ref: "DiscussionMessage", default: null },
  isPinned: { type: Boolean, default: false },
  isAnnouncement: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },    // soft delete for moderation
  createdAt: { type: Date, default: Date.now },
});
```

**Key fields:**
- `parentMessage` — if this is a reply, points to the parent message → enables **threading**
- `isPinned` — organizer can pin important messages to the top
- `isAnnouncement` — organizer can mark messages as official announcements (blue highlight)
- `isDeleted` — soft delete instead of removing from DB (moderation can be audited)

---

## API Routes

| Method | Endpoint | Who | What It Does |
|--------|----------|-----|-------------|
| `GET` | `/api/discussions/:eventId` | Any authenticated user | Get all non-deleted messages |
| `POST` | `/api/discussions/:eventId` | Registered participant or organizer | Post a new message |
| `PUT` | `/api/discussions/:messageId/pin` | Event organizer only | Toggle pin on a message |
| `DELETE` | `/api/discussions/:messageId` | Event organizer only | Soft-delete a message |

### POST — Send Message

Validations:
1. Content must be non-empty
2. Event must exist
3. User must be either the event organizer OR a registered participant
4. Only the organizer can set `isAnnouncement: true`

After saving, emits the message via Socket.io:

```js
const io = req.app.get("io");
if (io) {
  io.to(`event_${req.params.eventId}`).emit("new_message", message);
}
```

### PUT /pin — Toggle Pin

Only the event organizer can pin/unpin. Emits `message_updated` with the new pin state.

### DELETE — Soft Delete

Sets `isDeleted: true` instead of removing the document. The GET endpoint filters these out with `isDeleted: false`. Emits `message_deleted` so other users see it disappear in real-time.

---

## Frontend Component — DiscussionForum.jsx

### Props

```jsx
<DiscussionForum eventId={id} isOrganizer={true/false} />
```

- `eventId`: which event's discussion to load
- `isOrganizer`: controls whether pin/delete/announcement controls are shown

### Socket.io Client Connection

```jsx
useEffect(() => {
  socketRef.current = io(BASE);                           // Connect to server
  socketRef.current.emit("join_event", eventId);          // Join the event room

  socketRef.current.on("new_message", (msg) => {          // Listen for new messages
    setMessages((prev) => [...prev, msg]);
    setNewMsgNotif((n) => n + 1);
  });

  socketRef.current.on("message_deleted", ({ messageId }) => {
    setMessages((prev) => prev.filter((m) => m._id !== messageId));
  });

  socketRef.current.on("message_updated", ({ messageId, isPinned }) => {
    setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, isPinned } : m)));
  });

  return () => {   // Cleanup on unmount
    socketRef.current.emit("leave_event", eventId);
    socketRef.current.disconnect();
  };
}, [eventId]);
```

### Message Threading

Messages with `parentMessage: null` are top-level. Replies reference their parent's ID.

Frontend groups them:
```js
const topLevel = regularMessages.filter((m) => !m.parentMessage);
const replies = {};
regularMessages.filter((m) => m.parentMessage).forEach((m) => {
  const parentId = typeof m.parentMessage === "object" ? m.parentMessage._id : m.parentMessage;
  if (!replies[parentId]) replies[parentId] = [];
  replies[parentId].push(m);
});
```

Replies render indented (24px left margin) under their parent.

### Message UI

Each message shows:
- **Author name** with role badge ("Organizer" in blue for organizer messages)
- **Announcement badge** (blue) for official announcements
- **Pinned badge** (📌 yellow) for pinned messages
- **Timestamp**
- **Content text**
- **Action buttons**: Reply (everyone), Pin/Unpin & Delete (organizer only)

### Pinned Messages

Pinned messages are separated and displayed at the top of the forum in a dedicated section.

### Notification Badge

A real-time counter shows "X new" when messages arrive while the forum is open. Clicking the message area resets the counter to 0.

### Keyboard Shortcut

- **Enter** sends the message
- **Shift+Enter** inserts a new line

---

## Where It Appears

| Page | Who Sees It | Features |
|------|------------|----------|
| EventDetails.jsx | Registered participants | Post, reply, view |
| OrganizerEventDetail.jsx | Event organizer | Post, reply, pin, delete, announce |

**Participants** see the forum once they're registered for the event.
**Organizers** always see the forum for their events with full moderation controls.

---

## Edge Cases Handled

| Edge Case | How It's Handled |
|-----------|-----------------|
| Not registered user tries to post | 403 "You must be registered" — checked server-side |
| Non-organizer tries to pin/delete | 403 "Only the event organizer can..." |
| Empty message | "Message content is required" error |
| User navigates away | Socket disconnects, leaves room (cleanup in useEffect return) |
| Participant tries announcement | `isAnnouncement` flag only set if user is the organizer |
| Deleted messages | Soft-deleted — filtered from GET query, removed from UI via real-time event |
| Auto-scroll | `bottomRef` scrolls to newest message on update |

---

## How to Test

1. **Create and publish an event** as organizer
2. **Register as a participant** for the event
3. Go to the event details — you'll see the Discussion Forum section
4. Type a message and click Send (or press Enter)
5. **Open another browser tab** logged in as the organizer
6. Go to the organizer event detail page — you'll see the same forum
7. Type a message as organizer — it appears instantly on the participant's tab
8. Test **threading**: click "Reply" on a message, type a reply — it appears indented
9. Test **announcements**: as organizer, check "Post as announcement" → message appears in blue
10. Test **pinning**: as organizer, click "Pin" on any message → it moves to the pinned section
11. Test **deleting**: as organizer, click "Delete" → message disappears on all connected tabs

---

## Viva Q&A Prep

**Q: How does Socket.io enable real-time messaging?**
A: Socket.io establishes a persistent WebSocket connection between client and server. When one user sends a message, the server saves it to MongoDB and then emits it to all sockets in that event's "room" via `io.to("event_<id>").emit("new_message", msg)`. All connected clients receive it instantly without polling.

**Q: What are Socket.io rooms?**
A: Rooms are logical groups of connected sockets. When a user opens an event's discussion, they emit `join_event` which adds their socket to `event_<eventId>`. The server can then broadcast only to members of that room — other events' rooms are unaffected.

**Q: How does message threading work?**
A: Each message has a `parentMessage` field. If null, it's a top-level message. If set, it's a reply to that parent. The frontend groups replies under their parents and renders them with an indented left margin.

**Q: Why use soft delete instead of actual deletion?**
A: Soft delete (`isDeleted: true`) preserves the message in the database for auditing. The GET query filters deleted messages with `isDeleted: false`, so users never see them, but admins could review moderation actions if needed.

**Q: Why use `http.createServer(app)` instead of `app.listen()`?**
A: Socket.io needs access to the raw HTTP server to attach its WebSocket handler. Express's `app.listen()` creates and returns a server internally, but we need it explicitly to pass to `new Server(server)` for Socket.io. Both Express routes and WebSocket connections then share the same port.

**Q: What happens if Socket.io connection fails?**
A: The app still works — messages are sent via POST requests (HTTP) and loaded via GET. Socket.io only adds the real-time push. If the socket disconnects, users can refresh to see new messages.
