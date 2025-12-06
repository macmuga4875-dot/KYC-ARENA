# Deploy KYC Arena to Render.com - Quick Start

All configuration is ready! Here's how to deploy your app to Render.com in 5 minutes.

## Step 1: Go to Render.com
Visit: https://render.com

## Step 2: Connect Your GitHub Account
1. Click **"GitHub Sign In"** or **"New +"** → **"Connect GitHub Account"**
2. Authorize Render to access your GitHub repositories
3. Grant permission to the **KYC-ARENA** repository

## Step 3: Deploy Using Blueprint (Automatic)
1. Click **"New +"** → **"Blueprint"**
2. Select your **KYC-ARENA** repository
3. Render will automatically detect `render.yaml` and show you the services:
   - **kyc-db** (PostgreSQL database)
   - **kyc-arena-api** (Node.js backend + React frontend)
4. Click **"Deploy"**
5. Wait ~5-10 minutes for deployment to complete

## Step 4: Access Your Live App
Once deployment succeeds, you'll see a URL like:
```
https://kyc-arena-api.onrender.com
```

Visit this URL in your browser to access your KYC Arena application!

## Step 5: Test the Deployment
1. **Sign In**: Use admin account
   - Username: `Kai`
   - Password: `#487530Turbo`
2. **Create Account**: Register a test account
3. **Submit**: Create a test submission
4. **Approve**: Test the approval workflow

## Database & Storage
- **Database**: PostgreSQL (automatically created)
- **Free Tier Limits**: 256 MB storage, 1 shared CPU (for development only)
- **For Production**: Upgrade to Render Plus ($12/month+) for better performance

## Continuous Deployment
Every push to `main` branch automatically redeploys:
```bash
git add .
git commit -m "Your changes"
git push origin main
```
Your changes will be live in ~2-5 minutes!

## Check Deployment Status
1. Go to: https://render.com/dashboard
2. Click on **kyc-arena-api** service
3. Check **Logs** for any errors
4. See **Deployments** history

## Troubleshooting

### Build Failed
Check the logs in Render Dashboard → Service → Logs
- Look for TypeScript errors or missing dependencies
- Ensure `npm run build` succeeds locally first

### App Crashes After Deploy
- Check Logs tab for error messages
- Verify DATABASE_URL is connected properly
- Wait 30 seconds for database migrations to complete

### Can't Login
- Ensure database migrations ran (check Logs)
- Try creating a new test account
- Check if server is responding at https://kyc-arena-api.onrender.com/api/auth/stats

## Upgrade to Better Performance
For production use, click on service → **Settings** → **Plan** and upgrade to:
- **Starter** ($7/month) - More resources
- **Standard** ($25/month+) - Full features, auto-scaling

## Need Help?
- **Render Docs**: https://render.com/docs
- **GitHub Issues**: https://github.com/macmuga4875-dot/KYC-ARENA/issues
- **Full Deployment Guide**: See `RENDER_DEPLOYMENT.md`

---

**Your app is ready to deploy!** 🚀

Next Step: Go to https://render.com and start the deployment process!
