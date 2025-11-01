# Quick Start Guide

## ✅ Setup Complete!

Everything is configured. Follow these steps to run your app:

## Step 1: Start the Backend Server

Open a terminal and run:

```bash
cd server
npm run dev
```

You should see:
```
Server running on port 3000
VAPID Public Key: BJrjPPowqV6-sVY9vec0...
```

**Keep this terminal open** - the backend needs to keep running.

## Step 2: Start the Frontend (Development)

Open a **new terminal** and run:

```bash
npm run dev
```

The app will be available at `http://localhost:8080`

## Step 3: Test on Your iPhone

### Option A: Local Network Testing

1. Make sure your iPhone is on the same Wi-Fi network
2. Find your Mac's IP address:
   - System Settings → Network → Wi-Fi → Details
   - Look for IP Address (e.g., `192.168.1.123`)
3. On your iPhone Safari, go to: `http://YOUR_IP:8080`
   - Example: `http://192.168.1.123:8080`
4. Add to Home Screen (Share button → Add to Home Screen)
5. Open the app from home screen
6. Go to Settings → Enable Notifications

### Option B: Production Testing (Recommended)

1. **Deploy Backend to Vercel:**
   ```bash
   cd server
   vercel
   ```
   - Follow prompts (or use `vercel --prod` if already set up)
   - Add environment variables in Vercel dashboard:
     - `VAPID_PUBLIC_KEY` = `BJrjPPowqV6-sVY9vec0hmIHKYHt1BTbIV2gv1WJVNQQg5BsKcOua_3zK1SVWVULLJl646sgwnl7OCNJC-y3Chk`
     - `VAPID_PRIVATE_KEY` = `xXfvEOhMvKjYZoCx0uzhTpalOpS1iU94akLh_SglCoQ`

2. **Update Frontend .env:**
   ```bash
   # In root directory, update .env:
   VITE_API_URL=https://your-backend-name.vercel.app
   ```

3. **Rebuild and Redeploy Frontend:**
   ```bash
   npm run build
   # Deploy dist/ folder to Vercel
   ```

4. **Test on iPhone:**
   - Go to `meal-notify.vercel.app` (or your frontend URL)
   - Add to Home Screen
   - Enable Notifications

## Step 4: Enable Notifications

1. Open the PWA from your home screen
2. Go to Settings page
3. Tap **"Enable Notifications"**
4. Tap **"Allow"** when prompted
5. Tap **"Test Notification"** to verify it works
6. Tap **"Save Settings"** to schedule notifications

## Step 5: Test Background Notifications

1. Set a notification time 2 minutes from now in Settings
2. Tap "Save Settings"
3. **Close the app completely** (swipe up, remove from recent apps)
4. Wait 2 minutes
5. **Notification should appear on lock screen!** 🎉

## Troubleshooting

### Backend won't start?
- Check port 3000 isn't in use: `lsof -ti:3000`
- Kill existing process: `kill -9 $(lsof -ti:3000)`
- Try different port: Change `PORT=3001` in `server/.env`

### Frontend can't connect to backend?
- Make sure backend is running
- Check `.env` file has correct `VITE_API_URL`
- For production, ensure backend URL is HTTPS

### Notifications not working?
- Make sure PWA is installed to home screen (not just open in Safari)
- Check notification permissions in iPhone Settings > [App Name] > Notifications
- Verify backend is running and accessible
- Try test notification button first

### Can't see backend API?
- Test: `curl http://localhost:3000/api/vapid-key`
- Should return: `{"publicKey":"..."}`

## What's Running Where

- **Backend:** `http://localhost:3000` (or your Vercel URL)
  - Handles push notifications
  - Schedules reminders
  - Stores subscriptions

- **Frontend:** `http://localhost:8080` (or `meal-notify.vercel.app`)
  - Your PWA app
  - Connects to backend for notifications
  - Stores food/meal data locally

## Next Steps After Testing

1. **Deploy Backend to Production** (Vercel/Railway/Render)
2. **Update Frontend .env** with production backend URL
3. **Rebuild and Redeploy Frontend**
4. **Set up daily notifications** (11am, 3pm, 8pm)
5. **Enjoy automated meal reminders!** 🍽️

## Current Configuration

- ✅ Backend ready with VAPID keys
- ✅ Frontend configured to connect to backend
- ✅ Service worker set up for push notifications
- ✅ Notification actions (food buttons) configured
- ✅ Cron scheduler set up (runs every minute)

You're all set! Start with Step 1 above. 🚀

