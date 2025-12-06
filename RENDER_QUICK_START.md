# 🚀 Render Deployment - Quick Reference Card

## 5-Step Deployment Process

```
STEP 1: Go to https://render.com
        └─ Sign up with GitHub → Authorize → Done

STEP 2: Click "New +" → "Blueprint"
        └─ Select "KYC-ARENA" repository

STEP 3: Review services (auto-detected from render.yaml)
        ├─ kyc-db (PostgreSQL)
        └─ kyc-arena-api (Node.js + React)

STEP 4: Click "Deploy"
        └─ Wait 5-10 minutes...

STEP 5: Visit your live app!
        └─ URL: https://kyc-arena-api.onrender.com
```

---

## Quick Reference Commands

```bash
# If you need to redeploy after GitHub changes:
git add .
git commit -m "Your changes"
git push origin main
# → Render automatically redeploys! (2-5 minutes)

# To test locally before deploying:
npm install
npm run build
npm run check
NODE_ENV=production npm start
# → Visit http://localhost:3000
```

---

## Key URLs

| What | URL |
|------|-----|
| **Your App** | https://kyc-arena-api.onrender.com |
| **Dashboard** | https://render.com/dashboard |
| **Repository** | https://github.com/macmuga4875-dot/KYC-ARENA |
| **Full Guide** | See RENDER_SETUP_GUIDE.md in repo |

---

## Login Credentials

```
Username: Kai
Password: #487530Turbo
```

---

## Services Deployed

### kyc-db (PostgreSQL)
- 256 MB free storage
- Automatic backups (paid plans only)
- Connection string auto-set

### kyc-arena-api (Web Service)
- Node.js 20 runtime
- React frontend + Express backend
- Auto-deploys on GitHub push
- Free tier spins down after 15 min inactivity

---

## Environment Variables (Auto-Set)

```
NODE_ENV = production
PORT = 3000
DATABASE_URL = auto-set from kyc-db
API_BASE = /api
VITE_API_BASE = /api
```

No action needed — all handled by `render.yaml`!

---

## Monitoring & Debugging

```
Render Dashboard → Your Service → Logs
                                 → Deployments
                                 → Environment
                                 → Settings
                                 → Metrics
```

**Check Logs if something fails:**
```
Render Dashboard 
  → kyc-arena-api 
    → Logs (see errors here!)
```

---

## Common Issues & Fixes

| Issue | Fix |
|-------|-----|
| **App is slow** | Normal (free tier). Upgrade to Render Plus. |
| **"Connection refused"** | Database still initializing. Wait 30 sec. |
| **Build failed** | Check Logs tab. Run `npm run build` locally. |
| **500 error** | Restart service in Settings. Check DB connection. |
| **Deployment takes too long** | Building takes 3-5 min. Be patient! |

---

## Free Tier vs Paid Plans

### Free Tier ($0)
- Shared CPU (0.5 vCPU)
- 512 MB RAM
- Spins down after 15 min inactivity
- First request = ~30 second cold start
- PostgreSQL: 256 MB storage

### Render Plus ($12/month)
- ✅ Always-on (no spin-down)
- ✅ Better performance
- ✅ More storage
- ✅ Custom domains
- ✅ Priority support

**Upgrade anytime**: Settings → Plan

---

## After Deployment Succeeds

### ✅ You Have:
- Live web app: https://kyc-arena-api.onrender.com
- Live database (PostgreSQL)
- Automatic HTTPS/SSL
- Continuous deployment on GitHub push
- 24/7 availability (free tier will spin down)

### 🔧 You Can:
- Edit environment variables (restart required)
- View logs in real-time
- Check metrics (CPU, RAM, network)
- Redeploy manually
- Upgrade plan for better performance
- Add custom domain
- View deployment history
- Rollback to previous version

### 📊 You Should Monitor:
- Logs for errors
- Metrics tab for resource usage
- Deployments tab for history

---

## Continuous Deployment Flow

```
Local Changes
     ↓
git add . && git commit && git push
     ↓
GitHub receives code
     ↓
GitHub notifies Render
     ↓
Render pulls latest code
     ↓
Build: npm install && npm run build && npm run db:push
     ↓
Start: npm start
     ↓
✅ New version LIVE (2-5 minutes)
```

---

## Files in Your Repository

| File | Purpose |
|------|---------|
| `render.yaml` | Infrastructure as code (Render reads this) |
| `.env.production` | Production environment variables |
| `RENDER_SETUP_GUIDE.md` | **← Full step-by-step guide** |
| `RENDER_DEPLOYMENT.md` | Detailed deployment documentation |
| `DEPLOY_NOW.md` | Quick-start guide |
| `RENDER_READY.md` | Deployment summary |

---

## Deployment Status

```
✅ Code: Committed to GitHub (main branch)
✅ Configuration: render.yaml ready
✅ Database: PostgreSQL configured
✅ Build: npm run build succeeds
✅ TypeScript: tsc check passes
✅ Environment: .env.production ready
✅ Ready for deployment: YES!
```

---

## Next Action

👉 **Go to https://render.com and click "New +" → "Blueprint"**

Your app will be live in ~10 minutes! 🎉

---

## Support

- **Render Docs**: https://render.com/docs
- **GitHub Repo**: https://github.com/macmuga4875-dot/KYC-ARENA
- **This Guide**: RENDER_SETUP_GUIDE.md in your repo
- **Dashboard**: https://render.com/dashboard

---

**Everything is ready. Time to deploy!** 🚀
