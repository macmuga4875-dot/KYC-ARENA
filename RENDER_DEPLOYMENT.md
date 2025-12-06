# Deployment on Render.com

This project is configured for deployment on Render.com using Infrastructure as Code via `render.yaml`.

## Quick Start

### 1. Connect GitHub to Render
1. Go to https://render.com and sign in with GitHub
2. Create a new **Blueprint** from your GitHub repository
3. Render will automatically detect the `render.yaml` file

### 2. Deploy
1. Click **Create** to deploy
2. Render will automatically:
   - Create a PostgreSQL database (`kyc-db`)
   - Build and deploy the backend API and frontend (`kyc-arena-api`)
   - Run database migrations (`npm run db:push`)

### 3. Set Environment Variables (if needed)
In Render Dashboard → Your Service → Environment:
- `DB_PASSWORD` — PostgreSQL password (auto-generated, can be customized)
- `SESSION_SECRET` — Session encryption secret (auto-set to default, change for security)
- `NODE_ENV` — Already set to `production`
- `PORT` — Already set to `3000`

### 4. Access Your App
Once deployment succeeds, your app will be available at:
```
https://kyc-arena-api.onrender.com
```

The backend API is at:
```
https://kyc-arena-api.onrender.com/api
```

## Services Deployed

### Backend & Frontend Server (`kyc-arena-api`)
- **Runtime:** Node.js 20
- **Plan:** Free tier (limited resources)
- **Region:** Oregon
- **Start Command:** `npm start` (runs compiled Express server)
- **Build Command:** 
  - `npm install` — Install dependencies
  - `npm run build` — Build React frontend + compile TypeScript backend
  - `npm run db:push` — Apply database migrations (Drizzle)

### Database (`kyc-db`)
- **Type:** PostgreSQL 15
- **Plan:** Free tier
- **Region:** Oregon
- **Auto-backups:** Available in paid plans

## Continuous Deployment

Every push to `main` branch on GitHub will automatically trigger a new deployment:

1. Render detects the push
2. Runs build command: `npm install && npm run build && npm run db:push`
3. Runs start command: `npm start`
4. New version is live in ~2-5 minutes

To disable auto-deploy:
- Render Dashboard → Service Settings → **Auto-Deploy** → toggle off

## Troubleshooting

### Build Fails
Check build logs: Render Dashboard → Service → Logs

Common issues:
- **Node version mismatch:** Ensure `node-version: 20` in CI
- **Missing environment variables:** Check Environment tab
- **Database connection:** Verify `DATABASE_URL` is set correctly

### App Crashes After Deploy
- Check logs: Render Dashboard → Logs
- Verify PORT is set to 3000 in Environment
- Ensure database migrations ran (`npm run db:push`)

### Slow Performance
- Free tier has limited resources; upgrade to paid plan for better performance
- Use **Render Plus** or **Standard** for production apps

## Manual Deployments

To redeploy without code changes:
1. Render Dashboard → Your Service
2. Click **Manual Deploy** → **Deploy Latest Commit**

## Upgrading to Paid Plans

For production use, upgrade to:
- **Render Plus ($12/month):** More resources, custom domains, auto-scaling
- **Standard ($25/month+):** Full features, SLA, dedicated resources

See: https://render.com/pricing

## Environment Variables Reference

| Variable | Value | Purpose |
|----------|-------|---------|
| `NODE_ENV` | `production` | Disables Vite dev server, uses static build |
| `PORT` | `3000` | Server port (Render's standard) |
| `DATABASE_URL` | Auto-set | PostgreSQL connection string |
| `API_BASE` | `/api` | Frontend API endpoint path |
| `VITE_API_BASE` | `/api` | Build-time API base |
| `SESSION_SECRET` | Auto-set | Session encryption (change for security) |

## Local Testing Before Deployment

Before pushing to GitHub, test locally:

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Test production build locally
NODE_ENV=production npm start
```

Visit http://localhost:3000 and verify everything works.

## Rolling Back

To revert to a previous deployment:
1. Render Dashboard → Service → Deployments
2. Find the deployment you want to revert to
3. Click the **...** menu → **Redeploy**

Or simply revert the commit in GitHub:
```bash
git revert <commit-hash>
git push origin main
```

Render will automatically re-deploy with the previous code.

## Support

- **Render Docs:** https://render.com/docs
- **Project GitHub:** https://github.com/macmuga4875-dot/KYC-ARENA
