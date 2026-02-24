# Part 1 — Authentication & Security: Registration & Login

## Overview

Implemented user registration and login for the Felicity Event Management System using the MERN stack. Supports three user roles (Participant, Organizer, Admin) with IIIT email domain validation for IIIT students.

---

## Backend

### `backend/server.js`
Entry point for the Express server.
- Loads environment variables from `.env`
- Sets up CORS and JSON body parsing middleware
- Mounts auth routes at `/api/auth`
- Connects to MongoDB and starts the server on port 5000

### `backend/.env`
Stores configuration:
- `PORT` — server port (5000)
- `MONGO_URI` — MongoDB connection string (local)
- `JWT_SECRET` — secret key for signing JSON Web Tokens

### `backend/models/User.js`
Mongoose schema for users. Fields:
| Field | Type | Details |
|-------|------|---------|
| `name` | String | Required |
| `email` | String | Required, unique |
| `password` | String | Required, stored as bcrypt hash |
| `role` | String | `"participant"`, `"organizer"`, or `"admin"` |
| `isIIIT` | Boolean | `true` if the user is an IIIT student |
| `createdAt` | Date | Auto-set to current time |

### `backend/routes/auth.js`
Two endpoints:

#### `POST /api/auth/register`
- Accepts `{ name, email, password, role, isIIIT }` in request body
- Validates all fields are present
- Checks for duplicate email
- **IIIT validation**: if `isIIIT` is true, email must end with `@iiit.ac.in` or `@students.iiit.ac.in`
- **Non-IIIT validation**: participants with non-IIIT flag cannot use an IIIT email
- Hashes password with bcrypt (10 salt rounds)
- Saves user to MongoDB
- Returns JWT token + user object (id, name, email, role, isIIIT)

#### `POST /api/auth/login`
- Accepts `{ email, password }`
- Finds user by email
- Compares password against bcrypt hash
- Returns JWT token + user object on success
- Returns generic "Invalid credentials" on failure (no email/password hints for security)

### `backend/middleware/auth.js`
JWT authentication middleware (for use in future protected routes):
- Reads token from `x-auth-token` header
- Verifies token using JWT_SECRET
- Attaches decoded user info (`id`, `role`) to `req.user`
- Returns 401 if token is missing or invalid

---

## Frontend

### `frontend/src/main.jsx`
App entry point. Wraps `<App />` in `BrowserRouter` for client-side routing.

### `frontend/src/App.jsx`
Route definitions:
| Path | Component | Access |
|------|-----------|--------|
| `/register` | Register | Public |
| `/login` | Login | Public |
| `/dashboard` | Dashboard | Protected (redirects to `/login` if no token) |
| `*` | — | Redirects to `/login` |

### `frontend/src/pages/Register.jsx`
Registration form with:
- Name, email, password inputs
- Role dropdown (Participant / Organizer / Admin)
- "I am an IIIT student" checkbox (shown only for participants)
- Hint text reminding IIIT students to use their `@iiit.ac.in` email
- On submit: calls `POST /api/auth/register`, stores token + user in localStorage, navigates to dashboard
- Displays server error messages (e.g., domain validation failure)

### `frontend/src/pages/Login.jsx`
Login form with:
- Email and password inputs
- On submit: calls `POST /api/auth/login`, stores token + user in localStorage, navigates to dashboard
- Shows error on invalid credentials
- Link to registration page

### `frontend/src/pages/Dashboard.jsx`
Simple dashboard showing:
- User's name, email, role
- Whether they're an IIIT student (for participants)
- Logout button (clears localStorage, redirects to login)

### `frontend/src/index.css`
Minimal global styles — clean light theme with basic input/button styling.

---

## How to Run

```bash
# 1. Start MongoDB locally (make sure it's running)

# 2. Start backend
cd backend
npm start

# 3. Start frontend (in a new terminal)
cd frontend
npm run dev
```

Backend runs on `http://localhost:5000`, frontend on `http://localhost:5173`.

---

## Dependencies

### Backend
| Package | Purpose |
|---------|---------|
| express | Web framework |
| mongoose | MongoDB ODM |
| bcryptjs | Password hashing |
| jsonwebtoken | JWT creation & verification |
| dotenv | Environment variable loading |
| cors | Cross-origin request handling |

### Frontend
| Package | Purpose |
|---------|---------|
| react | UI library |
| react-router-dom | Client-side routing |
| axios | HTTP requests to backend API |
