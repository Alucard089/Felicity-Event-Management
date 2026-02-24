# Emoji Reactions on Discussion Messages

## What it does
Users can react to any message in the discussion forum with emoji reactions. Click the "+" button next to a message to pick an emoji. Click again to remove your reaction. Reactions update in real-time for all users via Socket.io.

## Available Emojis
👍 ❤️ 😂 🎉 😮

## How it works

### Backend

**Model change** — `DiscussionMessage.js`:
- Added `reactions` field using Mongoose `Map` type: `{ type: Map, of: [String], default: {} }`
- Each key is an emoji string, each value is an array of user IDs who reacted with that emoji

**New endpoint** — `POST /api/discussions/:messageId/react`:
- Body: `{ emoji: "👍" }`
- Toggles the user's reaction — if already reacted with that emoji, removes it; otherwise adds it
- Emits `message_reacted` socket event with `{ messageId, reactions }` so all clients update in real-time

### Frontend

**DiscussionForum.jsx**:
- Added `EMOJIS` array with 5 emoji options
- Added `handleReact(messageId, emoji)` function that calls the backend endpoint
- Each message shows existing reactions as small buttons with emoji + count
- If the current user has reacted, the button is highlighted with a blue border
- A "+" button toggles a small emoji picker popup to add a new reaction
- Socket listener for `message_reacted` updates the reactions in state without page reload

## Files changed
- `backend/models/DiscussionMessage.js` — added reactions Map field
- `backend/routes/discussions.js` — added POST /:messageId/react endpoint
- `frontend/src/components/DiscussionForum.jsx` — added reaction UI, handler, and socket listener

## Viva Q&A

**Q: Why use a Map instead of an array of objects?**
A: A Map with emoji keys and user ID arrays makes it easy to toggle reactions — just check if the user ID exists in the array for that emoji. It also prevents duplicate reactions naturally.

**Q: How do reactions update in real-time?**
A: When a user reacts, the backend saves the reaction and emits a `message_reacted` Socket.io event. All connected clients listen for this event and update the message's reactions in their local state.

**Q: Can a user react with multiple different emojis?**
A: Yes, each emoji is tracked independently. A user can have reactions on multiple emojis for the same message.
