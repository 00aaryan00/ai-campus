# SkillArion AI Campus — Full Deployment Guide
> Stack: React (Vercel) + Node.js API (Render) + BullMQ Worker (Render) + MongoDB Atlas + Upstash Redis + PlanetScale MySQL

---

## 🗺️ Overview: What Goes Where

| Part | Platform | Why |
|---|---|---|
| React Frontend | Vercel | Perfect for static Vite builds |
| Node.js API Server | Render (Web Service) | Persistent server, not serverless |
| BullMQ Analytics Worker | Render (Background Worker) | Needs always-on persistent process |
| MongoDB | MongoDB Atlas | Managed cloud database |
| Redis | Upstash | Managed Redis, free tier available |
| MySQL Analytics | PlanetScale or Railway | Managed MySQL, free tier available |

---

## ✅ Phase 1: Set Up External Services First

### 1A — MongoDB Atlas
1. Go to https://cloud.mongodb.com and create a free account.
2. Create a new **Cluster** (Free M0 tier is fine for early stage).
3. Under **Database Access**, create a new database user with a username and password.
4. Under **Network Access**, click **"Add IP Address"** → select **"Allow Access from Anywhere"** (0.0.0.0/0).
5. Go to **Clusters** → click **"Connect"** → **"Connect your application"**.
6. Copy the connection string. It will look like:
   ```
   mongodb+srv://youruser:yourpassword@cluster0.abc.mongodb.net/?retryWrites=true&w=majority
   ```
7. Replace `<dbname>` with `ai-campus` in the URI. **Save this string — you will need it.**

---

### 1B — Upstash Redis
1. Go to https://console.upstash.com and create a free account.
2. Click **"Create Database"** → choose **Redis** → select a region close to you.
3. After creation, go to the database → copy the **"REDIS_URL"** value. It looks like:
   ```
   rediss://default:yourpassword@us1-abc.upstash.io:6379
   ```
4. **Save this string.**

---

### 1C — PlanetScale MySQL (for Analytics)
1. Go to https://planetscale.com and create a free account.
2. Click **"Create a Database"** → name it `ai_campus_analytics`.
3. Once created, click **"Connect"** → select **"Node.js"** from the dropdown.
4. Copy the connection details:
   ```
   MYSQL_HOST=aws.connect.psdb.cloud
   MYSQL_USER=yourusername
   MYSQL_PASSWORD=yourpassword
   MYSQL_DB=ai_campus_analytics
   ```
5. **Save these values.**

---

## ✅ Phase 2: Deploy Backend to Render

### 2A — Prepare Your GitHub Repository
1. Push your entire project to a GitHub repository (public or private).
2. Make sure the `backend/` and `frontend/` folders are both inside the repo.

---

### 2B — Deploy the API Server on Render
1. Go to https://render.com and create a free account.
2. Click **"New +"** → **"Web Service"**.
3. Connect your GitHub account and select your repository.
4. Configure the service:
   - **Name**: `ai-campus-api`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run start`
   - **Instance Type**: Free (or Starter for always-on)
5. Click **"Advanced"** → **"Add Environment Variable"** and add ALL of these:

   ```
   NODE_ENV=production
   PORT=5000
   MONGODB_URI=<your MongoDB Atlas URI from Phase 1A>
   REDIS_URL=<your Upstash Redis URL from Phase 1B>
   JWT_SECRET=<generate a long random string, e.g. 64+ characters>
   FRONTEND_URL=https://your-app.vercel.app
   MYSQL_HOST=<from Phase 1C>
   MYSQL_USER=<from Phase 1C>
   MYSQL_PASSWORD=<from Phase 1C>
   MYSQL_DB=ai_campus_analytics
   SUPER_ADMIN_EMAIL=your@email.com
   SUPER_ADMIN_PASSWORD=your_secure_password
   SUPER_ADMIN_NAME=Your Name
   ```

6. Click **"Create Web Service"**. Render will build and deploy automatically.
7. Once deployed, copy your API URL. It will look like:
   ```
   https://ai-campus-api.onrender.com
   ```
8. **Save this URL.**

---

### 2C — Deploy the Analytics Worker on Render
The BullMQ worker is a separate always-running process. You need a second Render service for it.

1. Click **"New +"** → **"Background Worker"**.
2. Select the same GitHub repository.
3. Configure:
   - **Name**: `ai-campus-worker`
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run worker`
4. Add the **same environment variables** as the API server above (copy them all).
5. Click **"Create Background Worker"**.

---

### 2D — Seed the Super Admin (One-Time Setup)
Once your API server is live and connected to MongoDB:

1. In Render, go to your **ai-campus-api** service.
2. Click the **"Shell"** tab in the left sidebar.
3. In the terminal that opens, type:
   ```bash
   npm run seed:superadmin
   ```
4. You should see: `[seed-super-admin] created: your@email.com`
5. You can now log in with those credentials on the live site.

---

## ✅ Phase 3: Deploy Frontend to Vercel

### 3A — Import Project to Vercel
1. Go to https://vercel.com and create a free account (log in with GitHub).
2. Click **"Add New Project"** → select your GitHub repository.
3. Configure the project:
   - **Framework Preset**: Vite (Vercel auto-detects this)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Click **"Environment Variables"** and add:
   ```
   VITE_API_URL=https://ai-campus-api.onrender.com
   ```
   *(This is the Render API URL you saved in Phase 2B)*
5. Click **"Deploy"**.
6. After deployment, Vercel gives you a URL like:
   ```
   https://ai-campus-abc123.vercel.app
   ```

---

### 3B — Connect Frontend URL to Backend CORS
Now that you have your Vercel URL, update the backend environment variable:

1. Go to Render → **ai-campus-api** → **Environment**.
2. Update the `FRONTEND_URL` variable:
   ```
   FRONTEND_URL=https://ai-campus-abc123.vercel.app
   ```
3. Click **"Save Changes"** — Render will automatically redeploy.

---

### 3C — (Optional) Set Up a Custom Domain on Vercel
1. Go to your Vercel project → **Settings** → **Domains**.
2. Add your custom domain (e.g., `app.skillariondevelopment.in`).
3. Vercel will show you DNS records to add at your domain registrar.
4. After DNS propagates, update `FRONTEND_URL` on Render to your custom domain.

---

## ✅ Phase 4: Post-Deployment Verification

After all services are live, verify the following:

- [ ] Frontend loads at your Vercel URL.
- [ ] Login page works and returns a JWT token.
- [ ] Student, Teacher, HOD, and Principal dashboards load with real data.
- [ ] Creating a test and submitting it works end-to-end.
- [ ] Check Render logs for the Worker service — it should show `[analytics-worker] worker ready`.
- [ ] Leave requests are submitted and visible to the HOD.
- [ ] Timetable upload and display works.

---

## 🔁 Auto-Deployments (Ongoing)

Once set up, both Vercel and Render are connected to your GitHub repository. Every time you push code to the `main` branch:
- **Vercel** automatically rebuilds and deploys the frontend.
- **Render** automatically rebuilds and deploys the backend and worker.

You never have to manually deploy again after the initial setup!

---

## 🆘 Common Issues

| Problem | Fix |
|---|---|
| Frontend shows blank page | Check `VITE_API_URL` is set correctly in Vercel env vars |
| Login returns CORS error | Make sure `FRONTEND_URL` on Render matches your exact Vercel domain |
| Worker is not processing jobs | Check `REDIS_URL` is set correctly on both the API server and worker |
| Database connection fails | Check `MONGODB_URI` includes your correct password and `ai-campus` as the DB name |
| File uploads fail | Uploads are stored in-memory on Render free tier — configure ImageKit or S3 for permanent storage |
