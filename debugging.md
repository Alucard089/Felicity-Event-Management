# Debugging Guide — DASS A1 Project

## Quick Start (do this every time)

Open **two separate PowerShell terminals** and run one command in each:

**Terminal 1 — Backend:**
```powershell
cd "c:\Users\lelle\OneDrive\Desktop\DASS A1\backend"
node server.js
```
You should see: `MongoDB connected` and `Server running on port 5000`

**Terminal 2 — Frontend:**
```powershell
cd "c:\Users\lelle\OneDrive\Desktop\DASS A1\frontend"
npm run dev
```
You should see: `VITE v7.3.1 ready` and `Local: http://localhost:5173/`

Then open **http://localhost:5173** in your browser.

---

## Problem: "localhost refused to connect"

This means one or both servers are not running.

### Step 1 — Kill all existing Node processes
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
```
Wait 1–2 seconds, then start the servers fresh (see Quick Start above).

### Step 2 — Check if port is already in use
```powershell
netstat -ano | findstr :5000
netstat -ano | findstr :5173
```
If you see a PID listed, kill it:
```powershell
taskkill /PID <pid_number> /F
```

### Step 3 — Verify servers are responding
```powershell
node -e "const http=require('http'); http.get('http://localhost:5000/api/events',r=>{console.log('Backend:',r.statusCode)}).on('error',e=>console.log('Backend DOWN:',e.message)); http.get('http://localhost:5173',r=>{console.log('Frontend:',r.statusCode)}).on('error',e=>console.log('Frontend DOWN:',e.message));"
```
Expected: `Backend: 401` and `Frontend: 200`
- Backend shows 401 = running correctly (auth required, not a bug)
- Frontend shows 200 = running correctly

---

## Problem: EADDRINUSE (port already in use)

The server is already running (or a zombie process is holding the port).

```powershell
# Kill everything and restart
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1
# Then run backend and frontend again (Quick Start above)
```

---

## Problem: Backend crashes on startup

Run this to see the exact error:
```powershell
cd "c:\Users\lelle\OneDrive\Desktop\DASS A1\backend"
node server.js 2>&1
```

Common causes:
- **MongoDB not connected** — check your internet connection. The DB is on MongoDB Atlas (cloud).
- **Missing .env file** — make sure `backend/.env` exists with `MONGO_URI`, `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS`, `CLIENT_URL`
- **Missing package** — run `npm install` in the backend folder

---

## Problem: Frontend crashes or shows blank page

Check the browser console (F12 → Console tab) for red errors.

To rebuild and check for compile errors:
```powershell
cd "c:\Users\lelle\OneDrive\Desktop\DASS A1\frontend"
npx vite build
```
A clean build means no code errors. If it fails, the output will show which file has the problem.

To reinstall dependencies:
```powershell
cd "c:\Users\lelle\OneDrive\Desktop\DASS A1\frontend"
npm install
```

---

## Full Clean Restart (nuclear option)

Run this single block to kill everything and restart both servers:

```powershell
# Kill all node processes
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# Start backend in background
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd "c:\Users\lelle\OneDrive\Desktop\DASS A1\backend"; node server.js'

# Start frontend in background
Start-Process powershell -ArgumentList '-NoExit', '-Command', 'cd "c:\Users\lelle\OneDrive\Desktop\DASS A1\frontend"; npm run dev'
```
This opens two new PowerShell windows — one for each server.

---

## Environment Variables (backend/.env)

The backend needs this file to work. If missing, create it:
```
MONGO_URI=<your MongoDB Atlas connection string>
JWT_SECRET=<any random secret string>
EMAIL_USER=ashoaib863@gmail.com
EMAIL_PASS=ivre vbfm nnbu pkwq
CLIENT_URL=http://localhost:5173
PORT=5000
```

---

## URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:5000/api |
| Test backend | http://localhost:5000/api/events |

---

## Seeding the Database

If the database is empty, run the seed script once:
```powershell
cd "c:\Users\lelle\OneDrive\Desktop\DASS A1\backend"
node seed.js
```
This creates test users and events.
