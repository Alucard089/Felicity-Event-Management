# Deployment Guide — Felicity Event Management

This guide walks you through deploying the full MERN stack project to the cloud (free tiers).

**Architecture:**
- **Frontend** → Vercel (free, auto-deploys from GitHub)
- **Backend** → Render (free, auto-deploys from GitHub)
- **Database** → MongoDB Atlas (free M0 cluster)

**GitHub Repo:** https://github.com/Alucard089/Felicity-Event-Management

---

## Step 1: MongoDB Atlas (Database)

1. Go to [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) and create a free account
2. Click **"Build a Database"** → choose **M0 Free** tier → pick any region
3. Set up a **Database User**:
   - Username: `felicity`
   - Password: choose something (e.g., `Felicity2026!`) — **remember this**
4. In **Network Access** → click **"Add IP Address"** → choose **"Allow Access from Anywhere"** (`0.0.0.0/0`)
   - This is required because Render's IP changes — Atlas needs to accept connections from any IP
5. Go to **Database** → click **"Connect"** → choose **"Drivers"** → copy the connection string
   - Your Atlas cluster is: `felicity.46ztonu.mongodb.net`
   - Your full URI: `mongodb+srv://shoaib:YOUR_DB_PASSWORD@felicity.46ztonu.mongodb.net/felicity?retryWrites=true&w=majority&appName=Felicity`
   - Replace `YOUR_DB_PASSWORD` with the password you set for the `shoaib` database user
6. **Save this URI** — you'll need it for the backend deployment

---

## Step 2: Deploy Backend on Render

1. Go to [render.com](https://render.com) and sign up with your **GitHub account**
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repo: `Alucard089/Felicity-Event-Management`
4. Configure the service:

| Setting | Value |
|---------|-------|
| **Name** | `felicity-backend` |
| **Root Directory** | `backend` |
| **Environment** | `Node` |
| **Build Command** | `npm install` |
| **Start Command** | `npm start` |
| **Instance Type** | Free |

5. Click **"Advanced"** → **"Add Environment Variable"** and add ALL of these:

| Key | Value |
|-----|-------|
| `PORT` | `5000` |
| `MONGO_URI` | `mongodb+srv://shoaib:YOUR_DB_PASSWORD@felicity.46ztonu.mongodb.net/felicity?retryWrites=true&w=majority&appName=Felicity` |
| `JWT_SECRET` | `felicity_secret_key_2026` |
| `EMAIL_USER` | `ashoaib863@gmail.com` |
| `EMAIL_PASS` | `ivre vbfm nnbu pkwq` |
| `EMAIL_FROM` | `Felicity Events <ashoaib863@gmail.com>` |
| `FRONTEND_URL` | *(leave blank for now, fill after Step 3)* |

6. Click **"Create Web Service"**
7. Wait for the build to finish (2-3 minutes). You'll get a URL like:
   `https://felicity-backend-xxxx.onrender.com`
8. **Copy this URL** — you'll need it for the frontend

### Test the backend
Open a browser and go to: `https://felicity-backend-xxxx.onrender.com/api/events`
- If you see `[]` or a JSON response → backend is working
- If you see `{"msg":"No token..."}` → also working (auth required)

### Seed admin account
After the backend is deployed, open the Render dashboard → your service → **Shell** tab. Run:
```bash
node seed.js
```
This creates the default admin and test users.

---

## Step 3: Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up with your **GitHub account**
2. Click **"Add New..."** → **"Project"**
3. Import your repo: `Alucard089/Felicity-Event-Management`
4. Configure:

| Setting | Value |
|---------|-------|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

5. Click **"Environment Variables"** and add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://felicity-backend-xxxx.onrender.com` *(your actual Render URL)* |

6. Click **"Deploy"**
7. Wait for the build (1-2 minutes). You'll get a URL like:
   `https://felicity-event-management.vercel.app`

### Update CORS on backend
Go back to **Render** → your backend service → **Environment** tab. Set:
- `FRONTEND_URL` = `https://felicity-event-management.vercel.app` *(your actual Vercel URL)*

This allows the frontend to make API requests to the backend.

---

## Step 4: Verify Everything Works

1. Open your Vercel URL in a browser
2. Register a new account
3. Log in
4. Browse events, create one, etc.
5. If something is broken, check:
   - Render logs (Dashboard → your service → Logs)
   - Vercel logs (Dashboard → your project → Deployments → latest → Logs)
   - Browser console (F12 → Console) for frontend errors

---

## Common Deployment Issues

### "Network Error" or "Failed to fetch"
- The frontend can't reach the backend
- Check `VITE_API_URL` on Vercel — must be the full Render URL (with https://)
- Check `FRONTEND_URL` on Render — must be the full Vercel URL (with https://)
- After changing env vars on Vercel, you need to **Redeploy** (Deployments tab → three dots → Redeploy)

### Backend returns 500 errors
- Check Render logs for the exact error
- Usually it's a missing environment variable (MONGO_URI most common)
- Make sure `MONGO_URI` has the correct password and database name

### "MongoServerError: bad auth"
- Your MongoDB Atlas password is wrong in MONGO_URI
- Go to Atlas → Database Access → Edit user → Change password
- Update MONGO_URI in Render environment variables

### Render service goes to sleep
- Free tier services spin down after 15 minutes of inactivity
- First request after sleep takes 30-50 seconds — this is normal
- The service wakes up automatically

### Socket.io / Discussion Forum not working
- WebSocket connections work on Render free tier
- Make sure `FRONTEND_URL` is set correctly on Render for CORS
- Check browser console for WebSocket connection errors

---

## Viva Q&A

**Q: Where is the frontend deployed?**
A: Vercel — a static hosting platform that auto-builds from GitHub. It serves the React build output (HTML/JS/CSS).

**Q: Where is the backend deployed?**
A: Render — a managed Node.js hosting platform. It runs our Express server and Socket.io.

**Q: Where is the database?**
A: MongoDB Atlas — a cloud-hosted MongoDB service. The backend connects via the MONGO_URI environment variable.

**Q: Why Vercel for frontend?**
A: Vercel is built for frontend frameworks like React/Vite. It handles SPA routing via vercel.json rewrites, auto-deploys from GitHub, and has a generous free tier.

**Q: Why Render for backend?**
A: Render supports Node.js web services with WebSocket (needed for Socket.io discussion forum). It has a free tier and auto-deploys from GitHub.

**Q: How do frontend and backend connect in production?**
A: The frontend uses the `VITE_API_URL` environment variable (set at build time) to know the backend URL. The backend uses `FRONTEND_URL` to whitelist CORS origins.

**Q: What if Render's free tier sleeps?**
A: The first request after inactivity takes ~30-50 seconds while the server wakes up. Subsequent requests are fast. This is acceptable for a university project.

**Q: How are environment variables handled?**
A: They are set directly in the Vercel/Render dashboards — never committed to Git. The `.env` file is in `.gitignore`.
