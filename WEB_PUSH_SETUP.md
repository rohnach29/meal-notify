# Web Push Backend Setup Guide

This guide will help you set up the Web Push backend for reliable background notifications on iOS.

## Features

✅ **Real Background Notifications** - Works even when app is closed  
✅ **Lock Screen Notifications** - Appears on iPhone lock screen  
✅ **Action Buttons** - Tap foods directly from notifications  
✅ **Scheduled Reminders** - Automatic notifications at 11am, 3pm, 8pm  

## Backend Setup

### Step 1: Install Backend Dependencies

```bash
cd server
npm install
```

### Step 2: Generate VAPID Keys

VAPID keys are required for Web Push:

```bash
npm run generate-keys
```

This will output:
- Public Key
- Private Key

### Step 3: Configure Environment Variables

Create a `.env` file in the `server` directory:

```bash
VAPID_PUBLIC_KEY=your_public_key_here
VAPID_PRIVATE_KEY=your_private_key_here
PORT=3000
```

### Step 4: Run the Backend Locally

```bash
npm run dev
```

The server will run on `http://localhost:3000`

## Frontend Setup

### Step 1: Configure API URL

Create a `.env` file in the root directory:

```bash
VITE_API_URL=http://localhost:3000
```

For production, update this to your backend URL:
```bash
VITE_API_URL=https://your-backend.vercel.app
```

### Step 2: Rebuild Frontend

```bash
npm run build
```

## Deployment Options

### Option 1: Deploy Backend to Vercel

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Set Environment Variables in Vercel:**
   - Go to your Vercel project settings
   - Add environment variables:
     - `VAPID_PUBLIC_KEY`
     - `VAPID_PRIVATE_KEY`

3. **Deploy:**
   ```bash
   cd server
   vercel
   ```

4. **Update Frontend `.env`:**
   ```bash
   VITE_API_URL=https://your-backend.vercel.app
   ```

### Option 2: Deploy to Other Platforms

The backend can be deployed to:
- **Railway** - Easy Node.js deployment
- **Render** - Free tier available
- **Fly.io** - Good for small projects
- **Heroku** - Traditional option
- **DigitalOcean App Platform** - Simple deployment

Make sure to:
1. Set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` environment variables
2. Update frontend `VITE_API_URL` to point to your backend

## Testing

1. **Start Backend:**
   ```bash
   cd server
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   npm run dev
   ```

3. **Test on iPhone:**
   - Open the app
   - Go to Settings
   - Tap "Enable Notifications"
   - Tap "Test Notification"
   - You should receive a notification!

4. **Test Scheduled Notifications:**
   - Set a notification time 2 minutes from now
   - Close the app completely
   - Wait 2 minutes
   - Notification should appear even with app closed!

## How It Works

1. **User Subscribes:** Frontend subscribes to push notifications using VAPID keys
2. **Subscription Sent:** Subscription sent to backend server
3. **Backend Stores:** Backend stores subscription and notification schedule
4. **Cron Job:** External cron service calls `/api/cron` every minute
5. **Check Time:** When scheduled time matches exactly (timeDiff === 0), backend sends push notification
6. **iOS Receives:** iOS receives notification via APNs (automatically handled)
7. **User Sees:** Notification appears on lock screen with action buttons

## Troubleshooting

### Notifications Not Working

1. **Check Backend is Running:**
   - Visit `http://localhost:3000/api/vapid-key`
   - Should return JSON with public key

2. **Check Subscription:**
   - Open browser console
   - Check for subscription errors
   - Verify `VITE_API_URL` is correct

3. **Check Environment Variables:**
   - Backend: VAPID keys set correctly
   - Frontend: API URL points to backend

4. **iOS Specific:**
   - PWA must be installed to home screen
   - Notifications permission must be granted
   - App should be closed to test background notifications

### Backend Connection Errors

If you see "Failed to subscribe" errors:

1. Check backend is accessible:
   ```bash
   curl http://localhost:3000/api/vapid-key
   ```

2. Check CORS settings (backend should allow your frontend URL)

3. For production, ensure backend URL is HTTPS

## Production Checklist

- [ ] Backend deployed with HTTPS
- [ ] VAPID keys set as environment variables
- [ ] Frontend `VITE_API_URL` points to backend
- [ ] Frontend rebuilt with correct API URL
- [ ] Test notifications work
- [ ] Scheduled notifications work when app is closed

## Security Notes

- VAPID keys should be kept secret (private key)
- Never commit `.env` files to git
- Use environment variables in production
- HTTPS is required for Web Push

Enjoy reliable background notifications! 🎉

