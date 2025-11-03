# Backend Deployment Guide

## ✅ Fixed for Vercel!

The server is now configured for Vercel serverless functions.

## Deploy to Vercel

### Option 1: Via Vercel Dashboard (Recommended)

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New..." → "Project"
3. Import your Git repository
4. **Important Settings:**
   - **Root Directory**: `server`
   - **Framework Preset**: Other
   - **Build Command**: Leave empty
   - **Output Directory**: Leave empty
   - **Install Command**: `npm install`
5. **Add Environment Variables:**
   - `VAPID_PUBLIC_KEY` = `BJrjPPowqV6-sVY9vec0hmIHKYHt1BTbIV2gv1WJVNQQg5BsKcOua_3zK1SVWVULLJl646sgwnl7OCNJC-y3Chk`
   - `VAPID_PRIVATE_KEY` = `xXfvEOhMvKjYZoCx0uzhTpalOpS1iU94akLh_SglCoQ`
   - Select all environments (Production, Preview, Development)
6. Click "Deploy"

### Option 2: Via CLI

```bash
cd server
npx vercel
```

Then set environment variables in Vercel dashboard.

## After Deployment

1. **Get your backend URL** (e.g., `meal-notify-backend.vercel.app`)

2. **Update frontend `.env`:**
   ```bash
   VITE_API_URL=https://meal-notify-backend.vercel.app
   ```

3. **Rebuild and redeploy frontend:**
   ```bash
   npm run build
   # Deploy dist/ to Vercel
   ```

## Test the API

After deployment, test:
- `https://your-backend.vercel.app/api/vapid-key` - Should return public key
- `https://your-backend.vercel.app/api/cron` - Cron endpoint (called by Vercel)

## How It Works

- **Local Development**: Uses `node-cron` to check every minute
- **Production (Vercel)**: Vercel Cron Jobs calls `/api/cron` every minute
- **API Routes**: All routes under `/api/*` work as serverless functions

## Notes

- The root URL (`/`) will show 404 - that's normal, only `/api/*` routes work
- Cron jobs are automatically configured in `vercel.json`
- In-memory storage means subscriptions are lost on server restart (fine for personal use)

