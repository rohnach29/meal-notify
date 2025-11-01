# PWA Setup Guide for iOS 18.5

This guide will help you set up and use your Calorie Tracker PWA on your iPhone with iOS 18.5.

## Features

✅ **Fully Functional PWA** - Works offline, installable on home screen  
✅ **Scheduled Notifications** - Sends notifications at 11am, 3pm, and 8pm  
✅ **Quick Food Logging** - Tap food items directly from notifications  
✅ **Offline Support** - All data stored locally, works without internet  

## Setup Instructions

### Step 1: Build the App

1. Install dependencies (if not already done):
   ```bash
   npm install
   ```

2. Build the PWA:
   ```bash
   npm run build
   ```

3. Preview the build locally (optional):
   ```bash
   npm run preview
   ```

### Step 2: Deploy or Serve the App

You have two options:

#### Option A: Local Development Server
- Run `npm run dev` to start a development server
- Note: For iOS notifications to work properly, you may need HTTPS

#### Option B: Deploy to a Server
- Upload the `dist` folder to any web hosting service
- Ensure the server uses HTTPS (required for PWAs and notifications)
- Popular options: Vercel, Netlify, GitHub Pages, or any web host

### Step 3: Install on iPhone (iOS 18.5)

1. **Open Safari** on your iPhone (not Chrome or other browsers - Safari is required for PWAs)

2. **Navigate to your app URL** (the deployed URL or your local server URL)

3. **Add to Home Screen:**
   - Tap the **Share button** (square with up arrow) at the bottom
   - Scroll down and tap **"Add to Home Screen"**
   - Customize the name if desired (default: "CalTracker")
   - Tap **"Add"** in the top right

4. **The app icon should now appear on your home screen!**

### Step 4: Enable Notifications

1. **Open the PWA** from your home screen (not from Safari browser)

2. **Go to Settings** page (bottom navigation)

3. **Enable Notifications:**
   - Tap **"Enable Notifications"** button
   - Safari will prompt for notification permission - tap **"Allow"**
   - You should see "Notifications enabled" message

4. **Configure Notification Times** (already set to 11am, 3pm, 8pm by default):
   - The times are set in the Settings page
   - You can adjust them if needed
   - Tap **"Save Settings"** after making changes

5. **Test the Notification:**
   - Tap **"Test Notification"** button in Settings
   - You should receive a notification with your recent foods
   - If it works, your setup is complete!

## How It Works

### Daily Notifications

- **11:00 AM** - Morning meal reminder
- **3:00 PM** - Afternoon snack reminder  
- **8:00 PM** - Evening meal reminder

Each notification shows:
- Your 5 most recent foods
- Action buttons for each food (up to 4 visible)
- A "View All" button to open the full log page

### Logging Foods from Notifications

1. When you receive a notification, you'll see your recent foods as action buttons
2. **Tap any food button** to instantly log it
3. The food is automatically added to your daily tracking
4. A success toast will appear when you open the app

### If Notification Actions Don't Work

If tapping food buttons in notifications doesn't work:
1. **Tap the notification itself** (not the action button)
2. This opens the app to the Log page
3. You can then select foods manually

**Note:** iOS has limitations with notification actions. If actions don't work on your device, use the notification body tap to open the app.

## Troubleshooting

### Notifications Not Appearing

1. **Check Permission:**
   - Go to iPhone Settings > [App Name] > Notifications
   - Ensure "Allow Notifications" is ON
   - Check that Alerts are enabled

2. **Ensure App is Installed:**
   - Notifications only work for installed PWAs (added to home screen)
   - Opening in Safari browser won't work for scheduled notifications

3. **Check Service Worker:**
   - Open the app
   - Go to Settings
   - Try "Test Notification" button
   - Check browser console for errors

### Service Worker Issues

If notifications aren't scheduling:
1. Clear browser cache
2. Uninstall and reinstall the PWA
3. Ensure you're using the app from home screen, not Safari browser

### HTTPS Requirement

- PWAs and notifications require HTTPS
- Local development (localhost) works without HTTPS
- For production, you MUST use HTTPS

## Technical Notes

- **Data Storage:** All data is stored locally in your browser (localStorage)
- **Offline Support:** The app works completely offline after first load
- **Service Worker:** Handles caching and notification display
- **Scheduling:** Notifications are scheduled using JavaScript timers (resets when app is reopened)

## Support

If you encounter issues:
1. Check browser console for errors
2. Ensure iOS version is 18.5 or later
3. Make sure you've installed the app to home screen
4. Verify notification permissions are granted

Enjoy tracking your meals! 🍽️

