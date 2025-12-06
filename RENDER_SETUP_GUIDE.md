# Deploy KYC Arena to Render.com - Complete Step-by-Step Guide

## Prerequisites
- GitHub account (already have: macmuga4875-dot)
- Render account (free at https://render.com)
- Your code pushed to GitHub (✅ DONE)

---

## **STEP 1: Create Render Account & Connect GitHub**

### 1.1 Sign Up for Render
1. Go to https://render.com
2. Click **"Get Started Free"**
3. Choose **"Sign Up with GitHub"**
4. Click **"Authorize render-oss"** (allow access to your GitHub account)
5. You'll be logged in to Render Dashboard

### 1.2 Verify GitHub Connection
- You should see a notification: "GitHub successfully connected"
- Render can now see your repositories

---

## **STEP 2: Deploy Using Blueprint (Automatic)**

### 2.1 Create Blueprint Deployment
1. In Render Dashboard, click **"New +"** button (top right)
2. Select **"Blueprint"**
3. You'll see a list of your GitHub repositories
4. Find and click **"KYC-ARENA"** (or search for it)

### 2.2 Render Detects Configuration
- Render automatically finds `render.yaml` in your repo
- You'll see a preview showing:
  ```
  Services detected:
  ✓ kyc-db (PostgreSQL)
  ✓ kyc-arena-api (Web Service)
  ```

### 2.3 Set Environment Variables (if needed)
Before clicking Deploy, you can set custom values for:
- **DB_PASSWORD** — PostgreSQL password (auto-generated, can change)
- **SESSION_SECRET** — Session encryption key (optional)

Leave defaults for now, you can change later.

### 2.4 Click "Deploy"
1. Click the **"Deploy"** button
2. Render starts the deployment process
3. You'll see a progress page showing:
   - Building web service
   - Creating database
   - Running migrations

---

## **STEP 3: Wait for Deployment (5-10 minutes)**

### Monitor Progress:
1. You'll see a **Deployment Log** screen
2. Watch for messages like:
   ```
   Creating database...
   Installing dependencies...
   Building application...
   Starting server...
   ```

### What Each Step Does:
- **Creating database** → PostgreSQL is being set up
- **Installing dependencies** → `npm install` running
- **Building application** → `npm run build` compiling React + backend
- **Database migrations** → `npm run db:push` applying schema
- **Starting server** → `npm start` launching the app

### Status Indicators:
- 🟢 **Green** = Success
- 🟡 **Yellow** = In Progress
- 🔴 **Red** = Failed

---

## **STEP 4: Access Your Live App**

Once deployment succeeds (shows green checkmark):

### 4.1 Get Your App URL
You'll see something like:
```
https://kyc-arena-api.onrender.com
```

This URL appears in multiple places:
- Top of the service page
- Environment → **RENDER_EXTERNAL_URL**
- Deployment page

### 4.2 Visit Your App
1. Open the URL in your browser
2. You should see the KYC Arena login page
3. The app is LIVE! 🎉

---

## **STEP 5: Test the Deployment**

### 5.1 Login with Admin Account
1. **Username**: `Kai`
2. **Password**: `#487530Turbo`
3. Click **Sign In**

### 5.2 Test Features
- ✅ View dashboard
- ✅ Create a test submission
- ✅ Approve submissions
- ✅ Check user stats

### 5.3 If Something Fails
Check the **Logs** tab in Render:
1. Render Dashboard → Your Service (kyc-arena-api)
2. Click **"Logs"** tab
3. Look for error messages
4. See troubleshooting section below

---

## **STEP 6: View Deployment Details**

### 6.1 Access Dashboard
1. Go to https://render.com/dashboard
2. Click **"kyc-arena-api"** service

### 6.2 Important Sections
| Section | Purpose |
|---------|---------|
| **Logs** | See what the server is doing |
| **Deployments** | History of deployments |
| **Environment** | Environment variables |
| **Settings** | Service configuration |
| **Metrics** | CPU, Memory, Network usage |

### 6.3 Monitor Service
- **Status** should show: ✅ **Live**
- **Region**: Oregon (free tier)
- **Plan**: Free ($0/month)

---

## **STEP 7: Setup Continuous Deployment**

Deployment is **already configured** to auto-deploy on GitHub push!

### How It Works:
1. You make changes locally
2. Run: `git push origin main`
3. GitHub notifies Render
4. Render automatically builds and deploys
5. New version is live in ~2-5 minutes

### To Manual Redeploy:
1. Render Dashboard → Your Service
2. Click **"Manual Deploy"**
3. Select commit to deploy
4. Click **"Deploy"**

---

## **IMPORTANT: Free Tier Notes**

### Limitations:
- ⏱️ **Spins down after 15 minutes of inactivity**
  - First request after spin-down takes ~30 seconds to start
  - This is normal for free tier
  
- 💾 **PostgreSQL: 256 MB storage**
  - Enough for testing and development
  - Adequate for ~10,000 test records

- 🔧 **Shared CPU**
  - Works fine for testing
  - May be slow under heavy load

### For Production (Recommended):
Upgrade to **Render Plus** ($12/month):
- ✅ Always-on (no spin-down)
- ✅ Better performance
- ✅ More storage
- ✅ Priority support

Click **Settings** → **Plan** to upgrade anytime.

---

## **TROUBLESHOOTING**

### Issue: Deployment Failed
**Solution**:
1. Check **Logs** tab for errors
2. Common causes:
   - Missing environment variables
   - Database connection failed
   - Build command error

Run locally to test:
```bash
npm run build
npm run check
```

### Issue: "Cannot connect to database"
**Solution**:
1. Wait 30 seconds for DB to fully initialize
2. Check if DATABASE_URL is set in Environment
3. Restart the service: Settings → **Restart Service**

### Issue: App is super slow
**Solution**:
- This is normal for free tier (first request takes 30 seconds)
- Upgrade to Render Plus for always-on performance

### Issue: "500 Internal Server Error"
**Solution**:
1. Check Logs for error details
2. Common fixes:
   - Restart service
   - Check database migrations ran
   - Verify environment variables

---

## **USEFUL LINKS IN RENDER DASHBOARD**

After deployment:

| Link | Purpose |
|------|---------|
| **Logs** | See real-time server output |
| **Deployments** | View deployment history |
| **Health Checks** | Monitor app uptime |
| **Metrics** | CPU, memory, network usage |
| **Environment** | Edit variables without redeploy |
| **Settings** | Change region, plan, auto-deploy |

---

## **ENVIRONMENT VARIABLES EXPLAINED**

These are automatically set by Render:

| Variable | Auto-Set | Value |
|----------|----------|-------|
| `NODE_ENV` | ✅ Yes | `production` |
| `PORT` | ✅ Yes | `3000` |
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `API_BASE` | ✅ Yes | `/api` |
| `VITE_API_BASE` | ✅ Yes | `/api` |
| `SESSION_SECRET` | ✅ Yes | Auto-generated |

No need to manually set these — they're handled by `render.yaml`!

---

## **CUSTOM DOMAIN (Optional)**

Want your own domain instead of `onrender.com`?

1. **Get a domain**:
   - Buy from GoDaddy, Namecheap, Google Domains, etc.
   - Cost: ~$10-15/year

2. **Connect to Render**:
   - Render Dashboard → Settings → **Custom Domain**
   - Enter your domain
   - Follow DNS instructions
   - Wait 24 hours for DNS to propagate

3. **Result**:
   - Instead of: `https://kyc-arena-api.onrender.com`
   - You get: `https://kyc-arena.com` (your domain)

---

## **ROLLBACK (Go Back to Previous Version)**

If something breaks:

1. Render Dashboard → **Deployments** tab
2. Find the working deployment
3. Click **"..."** menu
4. Select **"Redeploy"**
5. Service reverts to previous version in ~2 minutes

Or revert in GitHub:
```bash
git revert <commit-hash>
git push origin main
# Render auto-deploys the previous version
```

---

## **SUMMARY**

✅ **What Happens After You Click Deploy:**
1. Render clones your GitHub repo
2. Creates PostgreSQL database
3. Installs npm dependencies
4. Builds React frontend + TypeScript backend
5. Runs database migrations
6. Starts Node.js server
7. Your app is LIVE at the provided URL

✅ **Your App URL**: `https://kyc-arena-api.onrender.com`

✅ **Admin Login**: Kai / #487530Turbo

✅ **Any GitHub push to main** = Automatic redeploy

---

## **NEXT STEPS**

1. ✅ Go to https://render.com
2. ✅ Sign in with GitHub
3. ✅ Click "New +" → "Blueprint"
4. ✅ Select KYC-ARENA repository
5. ✅ Click "Deploy"
6. ✅ Wait 5-10 minutes
7. ✅ Visit your live app URL
8. ✅ Login and test!

**That's it! Your app will be live in production!** 🚀

---

**Questions?**
- Check Logs tab for error details
- See RENDER_DEPLOYMENT.md for more options
- Visit https://render.com/docs for Render documentation
