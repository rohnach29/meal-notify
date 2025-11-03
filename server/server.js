import 'dotenv/config';
import express from 'express';
import webpush from 'web-push';
import cors from 'cors';
import cron from 'node-cron';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: true, // Allow all origins (for PWA)
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());

// VAPID keys - set these as environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'YOUR_PUBLIC_KEY';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'YOUR_PRIVATE_KEY';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  'mailto:your-email@example.com', // Contact email for VAPID
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

// In-memory storage (in production, use a database)
const subscriptions = new Map(); // userId -> PushSubscription
const userSchedules = new Map(); // userId -> { notificationTimes: string[], foods: Food[] }

// Helper to get user ID from subscription
const getUserId = (subscription) => {
  return subscription.keys?.auth || subscription.endpoint;
};

// Get recent foods from subscription data
const getRecentFoods = (userId) => {
  const userData = userSchedules.get(userId);
  return userData?.foods || [];
};

// Send notification with food actions
const sendNotification = async (subscription, title, body, foods = []) => {
  const actions = [];
  
  // Add food actions (max 4)
  if (foods && foods.length > 0) {
    foods.slice(0, 4).forEach((food) => {
      actions.push({
        action: `food-${food.id}`,
        title: food.name.length > 20 ? food.name.substring(0, 17) + '...' : food.name,
      });
    });
  }
  
  // Add view all action
  actions.push({
    action: 'view-all',
    title: 'View All',
  });

  const payload = JSON.stringify({
    title: title || 'Meal Reminder 🍽️',
    body: body || 'Time to log your meal!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'meal-reminder',
    data: {
      url: '/log',
      foods: foods.map(f => f.id),
    },
    actions: actions,
  });

  try {
    await webpush.sendNotification(subscription, payload);
    console.log('Notification sent successfully');
  } catch (error) {
    console.error('Error sending notification:', error);
    // Remove invalid subscription
    if (error.statusCode === 410 || error.statusCode === 404) {
      const userId = getUserId(subscription);
      subscriptions.delete(userId);
      console.log('Removed invalid subscription');
    }
  }
};

// API Routes

// Get VAPID public key
app.get('/api/vapid-key', (req, res) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
app.post('/api/subscribe', async (req, res) => {
  const subscription = req.body.subscription;
  const userId = getUserId(subscription);
  
  if (!subscription) {
    return res.status(400).json({ error: 'Subscription required' });
  }

  subscriptions.set(userId, subscription);
  
  // Send a test notification
  try {
    await sendNotification(subscription, 'Welcome!', 'Notifications enabled. You will receive meal reminders at your scheduled times.');
    res.json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Update notification schedule
app.post('/api/update-schedule', async (req, res) => {
  const { subscription, notificationTimes, foods } = req.body;
  const userId = getUserId(subscription);

  if (!subscription || !notificationTimes) {
    return res.status(400).json({ error: 'Subscription and notification times required' });
  }

  // Update subscription
  subscriptions.set(userId, subscription);
  
  // Update schedule
  userSchedules.set(userId, {
    notificationTimes,
    foods: foods || [],
  });

  res.json({ success: true, message: 'Schedule updated' });
});

// Unsubscribe
app.post('/api/unsubscribe', (req, res) => {
  const subscription = req.body.subscription;
  const userId = getUserId(subscription);
  
  subscriptions.delete(userId);
  userSchedules.delete(userId);
  
  res.json({ success: true, message: 'Unsubscribed' });
});

// Test notification endpoint
app.post('/api/test-notification', async (req, res) => {
  const { subscription, foods } = req.body;
  
  if (!subscription) {
    return res.status(400).json({ error: 'Subscription required' });
  }

  try {
    await sendNotification(
      subscription,
      'Test Notification',
      foods && foods.length > 0
        ? `Test: ${foods.slice(0, 3).map(f => f.name).join(', ')}${foods.length > 3 ? ` +${foods.length - 3} more` : ''}`
        : 'Test notification - no recent foods',
      foods || []
    );
    res.json({ success: true, message: 'Test notification sent' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Check and send notifications for current time (within 5-minute window)
const checkAndSendNotifications = () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  // Create time windows to check (current time ± 2 minutes for 5-minute interval)
  const timeWindows = [
    `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`,
  ];
  
  // Also check if we're within 2 minutes of any scheduled time
  subscriptions.forEach((subscription, userId) => {
    const userData = userSchedules.get(userId);
    if (!userData || !userData.notificationTimes) return;

    const foods = userData.foods || [];
    const foodsList = Array.isArray(foods) ? foods.slice(0, 5) : [];

    // Check each scheduled time
    userData.notificationTimes.forEach((scheduledTime) => {
      const [scheduledHour, scheduledMinute] = scheduledTime.split(':').map(Number);
      const scheduledTotalMinutes = scheduledHour * 60 + scheduledMinute;
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      
      // Check if current time is within 2 minutes of scheduled time
      const timeDiff = Math.abs(currentTotalMinutes - scheduledTotalMinutes);
      
      if (timeDiff <= 2 && timeDiff >= 0) {
        const foodNames = foodsList.length > 0
          ? foodsList.slice(0, 3).map(f => f.name).join(', ') + 
            (foodsList.length > 3 ? ` +${foodsList.length - 3} more` : '')
          : 'Time to log your meal! What did you eat?';

        sendNotification(
          subscription,
          'Meal Reminder 🍽️',
          `Quick log: ${foodNames}`,
          foodsList
        );
      }
    });
  });
};

// Cron endpoint - called by external cron service every 5 minutes
// Checks all users and sends notifications if their scheduled time matches (within 2-minute window)
// For security, you can add CRON_SECRET env var and set it in your external cron service
app.get('/api/cron', async (req, res) => {
  // Optional: Verify cron secret for security
  const cronSecret = req.headers['authorization'] || req.query.secret;
  if (process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}` && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    checkAndSendNotifications();
    const now = new Date();
    res.json({ 
      success: true, 
      message: 'Notifications checked',
      checkedAt: now.toISOString(),
      currentTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    });
  } catch (error) {
    console.error('Cron error:', error);
    res.status(500).json({ error: 'Failed to check notifications' });
  }
});

// Start scheduler for local development only
// Runs every 5 minutes to check for scheduled notifications
// In production, external cron service will call /api/cron every 5 minutes
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  try {
    // Run every 5 minutes
    cron.schedule('*/5 * * * *', () => {
      console.log('Checking for scheduled notifications...');
      checkAndSendNotifications();
    });
    console.log('Local cron scheduler started (checks every 5 minutes)');
  } catch (error) {
    console.log('Cron not available, using endpoint-based scheduling');
  }
}

// Export for Vercel serverless
export default app;

// Start server for local development
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`VAPID Public Key: ${VAPID_PUBLIC_KEY.substring(0, 20)}...`);
    if (VAPID_PUBLIC_KEY === 'YOUR_PUBLIC_KEY') {
      console.warn('⚠️  Warning: Using default VAPID keys. Generate new keys with: npm run generate-keys');
    }
  });
}

