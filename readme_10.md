# readme_10.md — Section 12: Deployment [5 Marks]

## Overview
This readme documents the implementation of **Section 12** — Deployment, covering hosting requirements (12.1) and links for evaluation (12.2).

---

## 12.1 — Hosting Requirements

### Frontend: Static Hosting (Vercel/Netlify)

**Preparation done:**
- Created `frontend/src/config.js` — centralized API base URL configuration.
- All 18 files that previously had hardcoded `http://localhost:5000` URLs now import from `config.js`.
- The config reads `import.meta.env.VITE_API_URL` (Vite environment variable), falling back to `http://localhost:5000` for local development.
- Created `frontend/vercel.json` — SPA routing rewrite so all paths serve `index.html` (required for React Router).
- Created `frontend/.env.example` — documents the required environment variable.

**Config file (`frontend/src/config.js`):**
```javascript
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";

export const API_AUTH = `${BASE}/api/auth`;
export const API_ADMIN = `${BASE}/api/admin`;
export const API_EVENTS = `${BASE}/api/events`;
export const API_REGISTRATIONS = `${BASE}/api/registrations`;
export const API_PREFERENCES = `${BASE}/api/preferences`;

export default BASE;
```

**Files updated (18 total):**
- App.jsx, Login.jsx, Register.jsx, AdminDashboard.jsx, ManageOrganizers.jsx, PasswordResetRequests.jsx, BrowseEvents.jsx, CreateEvent.jsx, OrganizerDashboard.jsx, OrganizerEventDetail.jsx, OrganizerOngoing.jsx, OrganizerProfile.jsx, Onboarding.jsx, ClubsList.jsx, ClubDetail.jsx, Dashboard.jsx, EventDetails.jsx, Profile.jsx

**Vercel deployment steps:**
1. Push code to GitHub.
2. Import project in Vercel, set Root Directory to `frontend`.
3. Framework Preset: Vite.
4. Build Command: `npm run build` (auto-detected).
5. Output Directory: `dist` (auto-detected).
6. Set environment variable: `VITE_API_URL = https://your-backend.onrender.com`
7. Deploy.

**Vercel SPA rewrite (`frontend/vercel.json`):**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Backend: Managed Node Hosting (Render/Railway/Fly)

**Preparation done:**
- `backend/package.json` already has `"start": "node server.js"`.
- Updated `backend/server.js` CORS configuration to accept `FRONTEND_URL` environment variable for production cross-origin requests.
- Created `backend/.env.example` — documents all required environment variables.

**CORS configuration (`backend/server.js`):**
```javascript
const allowedOrigins = process.env.FRONTEND_URL
  ? [process.env.FRONTEND_URL, "http://localhost:5173"]
  : ["http://localhost:5173"];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, true);
  },
  credentials: true,
}));
```

**Render deployment steps:**
1. Push code to GitHub.
2. Create a Web Service in Render, point to `backend` directory.
3. Build Command: `npm install`.
4. Start Command: `npm start`.
5. Set environment variables in Render dashboard:
   - `PORT` — Render sets this automatically
   - `MONGO_URI` — MongoDB Atlas connection string
   - `JWT_SECRET` — any secure secret string
   - `EMAIL_USER` — Gmail address for email notifications
   - `EMAIL_PASS` — Gmail App Password
   - `EMAIL_FROM` — display name + email
   - `FRONTEND_URL` — production frontend URL (for CORS)

### Database: MongoDB Atlas

**Requirements:**
- Create a free M0 cluster on [mongodb.com](https://www.mongodb.com/atlas).
- Create a database user with read/write privileges.
- Whitelist `0.0.0.0/0` in Network Access (allows all IPs, required for Render/Railway).
- Copy the connection string and set as `MONGO_URI` in backend environment variables.

**Connection string format:**
```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority
```

---

## 12.2 — Links for Evaluation

**File: `deployment.txt` (root level)**

Contains:
- Frontend URL — to be filled after deploying to Vercel/Netlify
- Backend API URL — to be filled after deploying to Render/Railway
- Database info — MongoDB Atlas via environment variable
- Complete deployment instructions for all three components
- Admin account setup instructions

---

## Environment Variables Summary

### Backend (`.env`)
| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB Atlas connection string | `mongodb+srv://...` |
| `JWT_SECRET` | JWT signing secret | `my_secret_key` |
| `EMAIL_USER` | Gmail address | `user@gmail.com` |
| `EMAIL_PASS` | Gmail App Password | `xxxx xxxx xxxx xxxx` |
| `EMAIL_FROM` | Email display name | `Felicity Events <user@gmail.com>` |
| `FRONTEND_URL` | Production frontend URL (for CORS) | `https://app.vercel.app` |

### Frontend (`.env` / Vercel dashboard)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API base URL | `https://api.onrender.com` |

---

## File Summary

### New files created
| File | Purpose |
|------|---------|
| `frontend/src/config.js` | Centralized API base URL config with env var support |
| `frontend/.env.example` | Documents frontend environment variables |
| `frontend/vercel.json` | SPA routing rewrite for Vercel |
| `backend/.env.example` | Documents backend environment variables |
| `deployment.txt` | Root-level deployment info for evaluation |

### Modified files
| File | Changes |
|------|---------|
| `backend/server.js` | CORS updated to accept `FRONTEND_URL` env var |
| 18 frontend files | Replaced hardcoded `http://localhost:5000` with `config.js` imports |

---

## Verification

- Backend starts: `cd backend && node server.js` → "MongoDB connected, Server running on port 5000"
- Frontend starts: `cd frontend && npm run dev` → Vite ready on localhost:5173
- No hardcoded `http://localhost:5000` anywhere in frontend except the fallback in `config.js`
- Both `.env.example` files document all required variables
- `deployment.txt` at project root contains all deployment info
