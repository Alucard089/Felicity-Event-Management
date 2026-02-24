# Felicity Event Management System — Startup Instructions

Complete guide to set up and run the DASS A1 project locally.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Starting the Application](#starting-the-application)
4. [Admin Account Seeding](#admin-account-seeding)
5. [Accessing the Application](#accessing-the-application)
6. [Troubleshooting & Debug Commands](#troubleshooting--debug-commands)

---

## Prerequisites

Ensure you have the following installed on your system:

### 1. **Node.js & npm**
- Download and install from [nodejs.org](https://nodejs.org/)
- Currently tested with Node.js v18+ and npm v9+
- Verify installation:
  ```powershell
  node --version
  npm --version
  ```

### 2. **MongoDB**
- Download and install from [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
- Or use **MongoDB Atlas** (cloud-hosted) — requires MONGO_URI setup
- Verify MongoDB is running:
  ```powershell
  # Local MongoDB (Windows)
  mongosh  # or mongo for older versions
  ```

### 3. **Git** (Optional, for version control)
- Download from [git-scm.com](https://git-scm.com/)

---

## Initial Setup

### Step 1: Navigate to Project Root
```powershell
cd "c:\Users\lelle\OneDrive\Desktop\DASS A1"
```

### Step 2: Backend Dependencies

```powershell
cd backend
npm install
```

Expected output:
```
added X packages in Y seconds
```

**What gets installed:**
- `express` — Web framework
- `mongoose` — MongoDB ODM
- `bcryptjs` — Password hashing
- `jsonwebtoken` — JWT authentication
- `cors` — Cross-origin resource sharing
- `dotenv` — Environment variable management

### Step 3: Frontend Dependencies

```powershell
cd ..\frontend
npm install
```

Expected output:
```
added X packages in Y seconds
```

**What gets installed:**
- `react` — UI framework
- `react-dom` — React rendering
- `react-router-dom` — Client-side routing
- `axios` — HTTP client
- `vite` — Build tool & dev server

### Step 4: Backend Environment Setup

Create `.env` file in the `backend/` directory:

```powershell
cd ..\backend
```

Create `backend/.env` with:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/felicity
JWT_SECRET=your_secret_key_here_change_in_production
```

**Notes:**
- `MONGO_URI` — Use local MongoDB URL or MongoDB Atlas connection string
- `JWT_SECRET` — Change this to a strong random string in production

---

## Starting the Application

### Option A: Start Both Services Manually (Recommended for Development)

**Terminal 1 — Start Backend:**
```powershell
cd "c:\Users\lelle\OneDrive\Desktop\DASS A1\backend"
npm start
```

Expected output:
```
> backend@1.0.0 start
> node server.js

MongoDB connected
Server running on port 5000
```

**Terminal 2 — Start Frontend:**
```powershell
cd "c:\Users\lelle\OneDrive\Desktop\DASS A1\frontend"
npm run dev
```

Expected output:
```
> frontend@0.0.0 dev
> vite

  VITE v7.3.1  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

---

## Admin Account Seeding

The admin account must be created using the seeding script (not through the UI).

### Step 1: Ensure Backend is Running
Make sure MongoDB is running and the backend server has started successfully.

### Step 2: Run the Seed Script

**Terminal 3 — Seed Admin:**
```powershell
cd "c:\Users\lelle\OneDrive\Desktop\DASS A1\backend"
node seed.js
```

Expected output:
```
Admin user created with email: admin@felicity.iiit.ac.in
```

### Default Admin Credentials
- **Email:** `admin@felicity.iiit.ac.in`
- **Password:** `admin123`

⚠️ **Change the password after first login!**

---

## Accessing the Application

Once both backend and frontend are running:

### Frontend URL
```
http://localhost:5173
```

### Available Routes

| Path | Access | Purpose |
|------|--------|---------|
| `/login` | Public | User login page |
| `/register` | Public | Participant registration (organizers created by admin only) |
| `/dashboard` | Protected | Participant dashboard |
| `/profile` | Protected | User profile & preference management |
| `/admin` | Admin only | Admin panel for managing organizers |
| `/organizer` | Organizer only | Organizer dashboard (events, etc.) |
| `/onboarding` | Participant | Initial setup after registration |

### Quick Test Accounts

**Participant:**
```
Email: participant@example.com
Password: password123
```

Create via registration form at `/register`

**Admin:**
```
Email: admin@felicity.iiit.ac.in
Password: admin123
```

(Created by running `node seed.js`)

---

## Troubleshooting & Debug Commands

### MongoDB Connection Issues

**Issue:** `Server Error: connect ECONNREFUSED 127.0.0.1:27017`

**Solution A: Start Local MongoDB (Windows)**
```powershell
# Check if MongoDB is running
Get-Process mongod -ErrorAction SilentlyContinue

# Start MongoDB (if installed as service)
net start MongoDB

# Or manually start mongod
mongod
```

**Solution B: Use MongoDB Atlas (Cloud)**
1. Create account at [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
2. Create a cluster
3. Get connection string
4. Update `.env`:
   ```
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/felicity?retryWrites=true&w=majority
   ```

**Debug Command:**
```powershell
# Verify MongoDB is running
mongosh
# Should open MongoDB shell, then type: exit
```

---

### Backend Won't Start — CORS/Port Issues

**Issue:** `Error: listen EADDRINUSE :::5000` (port already in use)

**Solution:** Kill the process using port 5000
```powershell
# Find process on port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

**Debug Command:**
```powershell
# Check if port 5000 is available
Test-NetConnection -ComputerName localhost -Port 5000
```

---

### Frontend Won't Start — NPM/Vite Issues

**Issue:** `npm command not found` or `node_modules missing`

**Solution:**
```powershell
cd frontend
rm -Force -Recurse node_modules
npm install
npm run dev
```

---

### PowerShell Execution Policy Error

**Issue:** `running scripts is disabled on this system`

**Solution:**
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
```

---

### JWT/Authentication Not Working

**Issue:** Getting 401 errors or "Invalid token" messages

**Debug Steps:**
1. **Check Token in Browser:**
   ```javascript
   // Open browser console (F12) and run:
   console.log(localStorage.getItem("token"));
   ```

2. **Verify JWT_SECRET:**
   - Ensure `.env` has `JWT_SECRET` set
   - Backend and frontend must match

3. **Clear Storage & Re-login:**
   ```javascript
   // In browser console:
   localStorage.clear();
   ```

4. **Check Backend Logs:**
   - Look for auth middleware errors in terminal where backend is running

---

### API Endpoint Testing

Test endpoints directly with curl or Postman:

**Test Backend Health:**
```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET
```

**Test Registration:**
```powershell
$body = @{
    name = "Test User"
    email = "test@example.com"
    password = "password123"
    role = "participant"
    isIIIT = $false
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/auth/register" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body
```

**Test Login:**
```powershell
$body = @{
    email = "test@example.com"
    password = "password123"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" `
    -Method POST `
    -Headers @{"Content-Type" = "application/json"} `
    -Body $body
```

---

### Database Issues

**Clear All Data (WARNING: Destructive)**
```powershell
mongosh
# In MongoDB shell:
use felicity
db.dropDatabase()
exit
```

**Verify Database Connection:**
```powershell
mongosh
# In MongoDB shell:
use felicity
db.users.countDocuments()
# Should return a number
```

---

### Useful Debug Logs

**Backend Logs to Watch For:**
- `MongoDB connected` — Database is ready
- `Server running on port 5000` — Backend is ready
- `Error: <message>` — Something went wrong

**Frontend Console (F12):**
- Network tab — Check API requests to `http://localhost:5000`
- Console tab — Watch for JS errors
- Storage tab — Verify token is stored in localStorage

---

### Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `ECONNREFUSED` | MongoDB not running | Start MongoDB service |
| `EADDRINUSE :::5000` | Port 5000 in use | Kill process on port 5000 |
| `Cannot find module` | Dependencies not installed | Run `npm install` |
| `CORS error` | Backend not running or wrong port | Check both are running |
| `Invalid credentials` | Wrong email/password | Verify from `/login` or check database |
| `Token invalid/expired` | JWT issue | Clear localStorage and login again |
| `Admin access only` | Not logged in as admin | Login with admin account |

---

## Quick Reference: All Commands

### Setup
```powershell
# Backend setup
cd backend
npm install

# Frontend setup
cd ..\frontend
npm install
```

### Runtime
```powershell
# Terminal 1 - Backend
cd backend && npm start

# Terminal 2 - Frontend
cd frontend && npm run dev

# Terminal 3 - Seed admin
cd backend && node seed.js
```

### Debugging
```powershell
# Check MongoDB
mongosh

# Check ports
netstat -ano | findstr :5000
netstat -ano | findstr :5173

# Kill process on port
taskkill /PID <PID> /F

# Clear and reinstall frontend
cd frontend && rm -Force -Recurse node_modules && npm install
```

---

## Final Checklist

Before starting development:
- [ ] Node.js installed (`node --version` works)
- [ ] MongoDB running locally or Atlas configured
- [ ] `backend/.env` created with PORT, MONGO_URI, JWT_SECRET
- [ ] `npm install` completed in both `backend/` and `frontend/`
- [ ] Admin seeded with `node seed.js`
- [ ] Backend starts: `npm start` shows "MongoDB connected"
- [ ] Frontend starts: `npm run dev` shows "VITE ready"
- [ ] Can access `http://localhost:5173`

---

## Need Help?

- Check backend logs (Terminal 1) for server errors
- Check browser console (F12) for frontend errors
- Check MongoDB connection with `mongosh`
- Clear browser localStorage if auth issues persist
- Use the debug commands above to troubleshoot

Happy coding! 🚀
