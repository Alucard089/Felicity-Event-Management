# Feature 5: Hackathon Team Registration (Tier A — 8 Marks)

## What it does
Organizers can create "hackathon" type events with configurable team sizes. Attendees form teams by creating or joining with a 6-character code. The team leader locks the team when ready, which auto-registers all members.

## How it works

### 1. Event Creation
- Added `"hackathon"` to the `eventType` enum in the Event model
- Added `maxTeamSize` (default 4) and `minTeamSize` (default 2) fields
- CreateEvent page shows a "Hackathon" radio button and team size config inputs

### 2. Team Model (`backend/models/Team.js`)
Fields:
- `event` — reference to the Event
- `name` — team name (unique per event)
- `leader` — the user who created the team
- `members` — array of user references
- `joinCode` — 6-character uppercase hex code (auto-generated, unique)
- `isLocked` — once locked, no one can join/leave and all members are registered
- `createdAt` — timestamp

### 3. Backend Routes (`backend/routes/teams.js`)

| Method | Endpoint | What it does |
|--------|----------|-------------|
| POST | `/:eventId` | Create a new team (user becomes leader) |
| POST | `/join` | Join a team by entering the join code |
| GET | `/my/:eventId` | Get current user's team for this event (or null) |
| PUT | `/:teamId/lock` | Leader locks the team — auto-registers all members |
| PUT | `/:teamId/leave` | Non-leader leaves the team (before lock only) |
| DELETE | `/:teamId` | Leader deletes the team (before lock only) |
| GET | `/event/:eventId` | Organizer gets all teams for the event |

### 4. Team Registration Flow
1. User opens a hackathon event page
2. They either **create** a team (enters a name, gets a join code) or **join** one (enters a code)
3. Team card shows: name, join code, member list, leader badge
4. Leader clicks "Lock & Register" when the team has enough members
5. Backend validates min team size, creates a `Registration` for each member with status `"confirmed"`
6. Team shows as locked, all members see "Team Registered!"

### 5. Frontend Pages

**EventDetails.jsx** (attendee view):
- If event is hackathon and user has no team: shows "Create Team" and "Join Team" forms side by side
- If user is in a team: shows team card with members, join code, and action buttons
  - Leader: "Lock & Register" button (disabled if below min size) + "Delete Team" button
  - Non-leader: "Leave Team" button
- If team is locked: shows green "Team locked & all members registered!" message

**OrganizerEventDetail.jsx** (organizer view):
- For hackathon events, shows a "Teams" section with all teams displayed as cards
- Each card shows: team name, locked/open status badge, join code, member list with leader marked

## Files changed
- `backend/models/Event.js` — added "hackathon" to enum, added maxTeamSize/minTeamSize
- `backend/models/Team.js` — new file, Team schema
- `backend/routes/teams.js` — new file, all 7 endpoints
- `backend/server.js` — registered `/api/teams` route
- `frontend/src/config.js` — added API_TEAMS export
- `frontend/src/pages/CreateEvent.jsx` — hackathon radio, team size inputs
- `frontend/src/pages/EventDetails.jsx` — team create/join/leave/lock/delete UI
- `frontend/src/pages/OrganizerEventDetail.jsx` — teams overview section

## Viva Q&A

**Q: How is the join code generated?**
A: Using `crypto.randomBytes(3).toString("hex").toUpperCase()` — produces a 6-character uppercase hex string. It's stored with a unique index so there are no duplicates.

**Q: What happens when the leader locks a team?**
A: The backend checks the team has at least `minTeamSize` members, sets `isLocked = true`, then creates a `Registration` document for each member with `status: "confirmed"` and the team name. After locking, no one can join or leave.

**Q: Can someone be in multiple teams for the same event?**
A: No. When creating or joining a team, the backend checks if the user is already a member of any team for that event and rejects the request if so.

**Q: Why is the registration form hidden for hackathon events?**
A: Hackathon events use team-based registration. Instead of individual sign-up, the leader's "Lock" action registers everyone at once. The normal form would be redundant.

**Q: What if a leader leaves?**
A: The leader cannot leave — they can only delete the entire team. Non-leaders can leave freely before the team is locked.
