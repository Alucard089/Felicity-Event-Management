# Felicity Event Management System

A full-stack event management platform built for IIIT Hyderabad's technical fest, supporting event creation, registration, merchandise, hackathon teams, discussion forums, and more.

**Live Links:**
- Frontend: *(to be updated after deployment)*
- Backend API: *(to be updated after deployment)*

**GitHub:** https://github.com/Alucard089/Felicity-Event-Management

---

## Tech Stack & Justification

### Backend

| Library | Version | Why |
|---------|---------|-----|
| **Express** | 5.2.1 | Lightweight Node.js web framework — simple routing, middleware support, widely documented |
| **Mongoose** | 9.2.1 | MongoDB ODM — provides schema validation, relationships (refs/populate), and built-in query helpers |
| **jsonwebtoken** | 9.0.3 | JWT-based stateless authentication — no session storage needed, works well with SPA frontends |
| **bcryptjs** | 3.0.3 | Password hashing — secure one-way hashing with salt rounds, pure JS (no native dependencies) |
| **cors** | 2.8.6 | Cross-Origin Resource Sharing — allows frontend (Vercel) to make API requests to backend (Render) |
| **dotenv** | 17.3.1 | Loads environment variables from `.env` — keeps secrets out of source code |
| **nodemailer** | 8.0.1 | Email sending — used for password reset notifications via Gmail SMTP |
| **qrcode** | 1.5.4 | QR code generation — creates unique QR codes embedded in registration tickets |
| **socket.io** | 4.8.3 | Real-time WebSocket library — powers the live discussion forum and emoji reaction updates |

### Frontend

| Library | Version | Why |
|---------|---------|-----|
| **React** | 19.2.0 | Component-based UI library — reusable components, virtual DOM for performance, huge ecosystem |
| **Vite** | 7.3.1 | Build tool — instant HMR during development, fast production builds, native ES module support |
| **react-router-dom** | 7.13.0 | Client-side routing — SPA navigation without page reloads, route guards for protected pages |
| **axios** | 1.13.5 | HTTP client — cleaner API than fetch, automatic JSON parsing, request/response interceptors |
| **socket.io-client** | 4.8.3 | WebSocket client — pairs with backend socket.io for real-time discussion forum |
| **qrcode.react** | 4.2.0 | React QR component — renders QR codes as SVG in the registration ticket modal |

### Database

| Technology | Why |
|------------|-----|
| **MongoDB Atlas** (cloud) | NoSQL document database — flexible schema for events with different types (normal, merchandise, hackathon), free M0 tier for deployment |

### Deployment

| Service | Purpose | Why |
|---------|---------|-----|
| **Vercel** | Frontend hosting | Built for React/Vite, auto-deploys from GitHub, SPA routing support via rewrites |
| **Render** | Backend hosting | Supports Node.js + WebSockets (Socket.io), auto-deploys from GitHub, free tier |
| **MongoDB Atlas** | Database | Cloud-hosted MongoDB, free M0 cluster, accessible from any deployment platform |

---

## Advanced Features Implemented (30 Marks)

### Tier C (2 Marks)
**1. Anonymous Feedback System**
- Attendees submit star ratings (1-5) and text feedback after event completion
- Feedback is anonymous — no user identity stored
- Organizers see aggregate stats and individual feedback
- See [feature1.md](feature1.md)

### Tier B (6 Marks Each)
**2. Organizer Password Reset Workflow**
- Organizers request password reset from their profile
- Request goes to Admin dashboard queue
- Admin approves → new password generated → emailed to organizer via Gmail SMTP
- See [feature2.md](feature2.md)

**3. Real-Time Discussion Forum**
- Per-event discussion with threaded replies
- Real-time message delivery via Socket.io
- Organizer controls: pin messages, mark announcements, delete messages
- Emoji reactions on messages (👍 ❤️ 😂 🎉 😮)
- See [feature3.md](feature3.md) and [emoji_reactions.md](emoji_reactions.md)

### Tier A (8 Marks Each)
**4. Merchandise Payment Approval**
- Events with merchandise type have configurable variants (size, color, stock, price)
- Attendees upload payment proof images (base64)
- Organizer reviews proofs and approves/rejects with remarks
- Stock decrements only on approval
- See [feature4.md](feature4.md)

**5. Hackathon Team Registration**
- Hackathon-type events with configurable team sizes (min/max)
- Team creation with auto-generated 6-character join codes
- Join by code, leave, delete team functionality
- Leader locks team → auto-registers all members
- Organizer dashboard shows all teams with status
- See [feature5.md](feature5.md)

### Design Decisions
- **Why Socket.io for the forum?** Polling would add unnecessary load — WebSockets give true real-time updates with minimal overhead.
- **Why base64 for payment proofs?** Avoids setting up file storage (S3/Cloudinary) — the image is stored directly in MongoDB. Simple for a university project scope.
- **Why 6-char hex join codes?** `crypto.randomBytes(3)` gives 16.7 million possible codes — collision-resistant enough for our scale, and easy to share verbally.
- **Why anonymous feedback?** Storing user references would discourage honest feedback. We only store the rating and text — no way to trace back.

---

## Setup & Installation (Local Development)

### Prerequisites
- Node.js v18+ (tested on v24.13.0)
- MongoDB running locally OR a MongoDB Atlas account
- Git

### 1. Clone the repository
```bash
git clone https://github.com/Alucard089/Felicity-Event-Management.git
cd Felicity-Event-Management
```

### 2. Backend setup
```bash
cd backend
npm install
```

Create a `.env` file (copy from `.env.example`):
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/felicity
JWT_SECRET=felicity_secret_key_2026
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=Felicity Events <your_email@gmail.com>
FRONTEND_URL=http://localhost:5173
```

Seed the database (creates admin + test users):
```bash
node seed.js
```

Start the backend:
```bash
node server.js
```
Server runs on `http://localhost:5000`.

### 3. Frontend setup
```bash
cd frontend
npm install
```

Optionally create `.env` (defaults to localhost:5000 if not set):
```
VITE_API_URL=http://localhost:5000
```

Start the frontend:
```bash
npm run dev
```
App runs on `http://localhost:5173`.

### 4. Default Login Credentials
After running `node seed.js`:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@felicity.com | admin123 |
| Organizer | organizer1@felicity.com | org123 |
| Attendee | attendee1@felicity.com | att123 |

---

## Project Structure

```
├── backend/
│   ├── server.js              # Express app + Socket.io setup
│   ├── seed.js                # Database seeder
│   ├── middleware/
│   │   └── auth.js            # JWT authentication middleware
│   ├── models/
│   │   ├── User.js            # User schema (admin, organizer, attendee)
│   │   ├── Event.js           # Event schema (normal, merchandise, hackathon)
│   │   ├── Registration.js    # Registration/purchase records
│   │   ├── Feedback.js        # Anonymous event feedback
│   │   ├── DiscussionMessage.js  # Forum messages with reactions
│   │   ├── Team.js            # Hackathon teams
│   │   └── PasswordResetRequest.js  # Password reset queue
│   ├── routes/
│   │   ├── auth.js            # Register, login
│   │   ├── admin.js           # Admin management endpoints
│   │   ├── events.js          # CRUD, registration, stats
│   │   ├── registrations.js   # Payment proof upload/approval
│   │   ├── preferences.js     # User event preferences
│   │   ├── feedback.js        # Feedback submission/retrieval
│   │   ├── discussions.js     # Forum messages + emoji reactions
│   │   └── teams.js           # Hackathon team management
│   └── utils/
│       └── mailer.js          # Nodemailer Gmail transport
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Router with role-based routes
│   │   ├── config.js          # API URL configuration
│   │   ├── components/
│   │   │   ├── Navbar.jsx     # Attendee navigation
│   │   │   ├── OrganizerNavbar.jsx
│   │   │   ├── AdminNavbar.jsx
│   │   │   └── DiscussionForum.jsx  # Real-time forum component
│   │   └── pages/
│   │       ├── Login.jsx / Register.jsx
│   │       ├── Dashboard.jsx        # Attendee home
│   │       ├── BrowseEvents.jsx     # Event discovery
│   │       ├── EventDetails.jsx     # Registration + teams + feedback
│   │       ├── Profile.jsx          # User profile + preferences
│   │       ├── CreateEvent.jsx      # Organizer event creation
│   │       ├── OrganizerDashboard.jsx
│   │       ├── OrganizerEventDetail.jsx  # Event management + teams
│   │       ├── AdminDashboard.jsx
│   │       ├── ManageOrganizers.jsx
│   │       └── PasswordResetRequests.jsx
│   └── vercel.json            # SPA routing for Vercel
│
├── deployment.txt             # Deployment URLs (for submission)
├── deployment.md              # Deployment walkthrough
└── README.md                  # This file
```

---

## Deployment

See [deployment.md](deployment.md) for the full step-by-step deployment guide.

**Summary:**
1. Database → MongoDB Atlas (free M0 cluster)
2. Backend → Render (free web service, auto-deploys from GitHub)
3. Frontend → Vercel (auto-deploys from GitHub)

Deployment URLs are in [deployment.txt](deployment.txt).
