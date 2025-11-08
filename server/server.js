import 'dotenv/config';
import express from 'express';
import webpush from 'web-push';
import cors from 'cors';
import cron from 'node-cron';

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration - explicitly allow frontend origin
// This is critical for Vercel deployments where redirects can break CORS
// You can set FRONTEND_URL environment variable to add custom frontend URLs
const allowedOrigins = [
  process.env.FRONTEND_URL, // Allow custom frontend URL from environment
  'https://meal-notify.vercel.app',
  'https://meal-notify-git-main-*.vercel.app', // Vercel preview deployments
  'http://localhost:5173',
  'http://localhost:8080',
  'http://localhost:3000',
].filter(Boolean); // Remove undefined values

app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow requests with no origin (mobile apps, Postman, etc.)
  if (!origin) {
    return next();
  }
  
  // Check if origin is in allowed list
  const isAllowed = allowedOrigins.some(allowed => {
    // Support wildcard for Vercel preview URLs
    if (allowed.includes('*')) {
      const pattern = allowed.replace('*', '.*');
      return new RegExp(pattern).test(origin);
    }
    return origin === allowed;
  });
  
  // For development, allow all origins
  if (process.env.NODE_ENV !== 'production' || isAllowed) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
  }
  
  next();
});

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
  // Explicitly set CORS headers for this endpoint (important for redirects)
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Subscribe to push notifications
app.post('/api/subscribe', async (req, res) => {
  try {
    const subscription = req.body.subscription;
    
    if (!subscription) {
      return res.status(400).json({ error: 'Subscription required' });
    }
    
    const userId = getUserId(subscription);
    
    // Save subscription first (critical step)
    subscriptions.set(userId, subscription);
    console.log('[SUBSCRIBE] ✅ Subscription saved for user:', userId.substring(0, 30) + '...');
    console.log('[SUBSCRIBE] Total subscriptions now:', subscriptions.size);
    console.log('[SUBSCRIBE] UserId used:', userId.substring(0, 50));
    
    // Send test notification asynchronously (don't block on it)
    // On iOS, this might fail initially, but subscription is still valid
    sendNotification(
      subscription, 
      'Welcome!', 
      'Notifications enabled. You will receive meal reminders at your scheduled times.'
    ).catch(err => {
      console.log('Test notification failed (non-blocking):', err.message);
      // Don't fail the subscription if test notification fails
      // Subscription is still valid and will work for scheduled notifications
    });
    
    // Return success immediately - subscription is saved
    res.json({ success: true, message: 'Subscribed successfully' });
  } catch (error) {
    console.error('Subscribe error:', error);
    res.status(500).json({ error: 'Failed to subscribe', details: error.message });
  }
});

// Update notification schedule
app.post('/api/update-schedule', async (req, res) => {
  const { subscription, notificationTimes, foods } = req.body;
  const userId = getUserId(subscription);

  if (!subscription || !notificationTimes) {
    return res.status(400).json({ error: 'Subscription and notification times required' });
  }

  // Update subscription (in case it changed)
  subscriptions.set(userId, subscription);
  
  // Update schedule
  userSchedules.set(userId, {
    notificationTimes,
    foods: foods || [],
  });

  console.log('[UPDATE-SCHEDULE] ✅ Schedule updated for user:', userId.substring(0, 30) + '...');
  console.log('[UPDATE-SCHEDULE] Times:', notificationTimes.join(', '));
  console.log('[UPDATE-SCHEDULE] Foods:', (foods || []).length);
  console.log('[UPDATE-SCHEDULE] Total schedules now:', userSchedules.size);
  console.log('[UPDATE-SCHEDULE] UserId used:', userId.substring(0, 50));
  console.log('[UPDATE-SCHEDULE] Checking if subscription exists for this userId:', subscriptions.has(userId));

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
  const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
  
  console.log(`\n[CRON] ===== Checking notifications at ${currentTime} =====`);
  console.log(`[CRON] Total subscriptions in memory: ${subscriptions.size}`);
  console.log(`[CRON] Total schedules in memory: ${userSchedules.size}`);
  
  // Track what we find
  const stats = {
    subscriptionsChecked: 0,
    subscriptionsWithSchedules: 0,
    schedulesChecked: 0,
    notificationsSent: 0,
    timeMatches: [],
    issues: []
  };
  
  // Check each subscription
  if (subscriptions.size === 0) {
    console.log(`[CRON] ⚠️  No subscriptions found in memory!`);
    stats.issues.push('No subscriptions stored - did you enable notifications?');
    return stats;
  }
  
  subscriptions.forEach((subscription, userId) => {
    stats.subscriptionsChecked++;
    const userIdShort = userId.substring(0, 20) + '...';
    console.log(`[CRON] Checking subscription ${stats.subscriptionsChecked}: ${userIdShort}`);
    
    const userData = userSchedules.get(userId);
    
    if (!userData) {
      console.log(`[CRON]   ⚠️  No schedule data found for this subscription`);
      stats.issues.push(`Subscription ${stats.subscriptionsChecked} has no schedule`);
      return;
    }
    
    if (!userData.notificationTimes || userData.notificationTimes.length === 0) {
      console.log(`[CRON]   ⚠️  No notification times set`);
      stats.issues.push(`Subscription ${stats.subscriptionsChecked} has no notification times`);
      return;
    }
    
    stats.subscriptionsWithSchedules++;
    console.log(`[CRON]   ✅ Has schedule with ${userData.notificationTimes.length} time(s): ${userData.notificationTimes.join(', ')}`);

    const foods = userData.foods || [];
    const foodsList = Array.isArray(foods) ? foods.slice(0, 5) : [];
    console.log(`[CRON]   📦 Foods available: ${foodsList.length}`);

    // Check each scheduled time
    userData.notificationTimes.forEach((scheduledTime) => {
      stats.schedulesChecked++;
      const [scheduledHour, scheduledMinute] = scheduledTime.split(':').map(Number);
      const scheduledTotalMinutes = scheduledHour * 60 + scheduledMinute;
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      
      // Check if current time is within 2 minutes of scheduled time
      const timeDiff = Math.abs(currentTotalMinutes - scheduledTotalMinutes);
      
      console.log(`[CRON]   🕐 Checking ${scheduledTime}:`);
      console.log(`[CRON]      Current: ${currentTime} (${currentTotalMinutes} min)`);
      console.log(`[CRON]      Scheduled: ${scheduledTime} (${scheduledTotalMinutes} min)`);
      console.log(`[CRON]      Difference: ${timeDiff} minutes`);
      
      if (timeDiff <= 2 && timeDiff >= 0) {
        console.log(`[CRON]      ✅ MATCH! Within 2-minute window, sending notification...`);
        stats.timeMatches.push({
          scheduledTime,
          currentTime,
          timeDiff
        });
        stats.notificationsSent++;
        
        const foodNames = foodsList.length > 0
          ? foodsList.slice(0, 3).map(f => f.name).join(', ') + 
            (foodsList.length > 3 ? ` +${foodsList.length - 3} more` : '')
          : 'Time to log your meal! What did you eat?';

        sendNotification(
          subscription,
          'Meal Reminder 🍽️',
          `Quick log: ${foodNames}`,
          foodsList
        ).then(() => {
          console.log(`[CRON]      ✅ Notification sent successfully`);
        }).catch((err) => {
          console.error(`[CRON]      ❌ Failed to send notification:`, err.message);
          stats.issues.push(`Failed to send notification for ${scheduledTime}: ${err.message}`);
        });
      } else {
        console.log(`[CRON]      ⏭️  Not matching (need diff <= 2 minutes)`);
      }
    });
  });
  
  console.log(`[CRON] ===== Summary =====`);
  console.log(`[CRON] Subscriptions checked: ${stats.subscriptionsChecked}`);
  console.log(`[CRON] Subscriptions with schedules: ${stats.subscriptionsWithSchedules}`);
  console.log(`[CRON] Schedules checked: ${stats.schedulesChecked}`);
  console.log(`[CRON] Time matches: ${stats.timeMatches.length}`);
  console.log(`[CRON] Notifications sent: ${stats.notificationsSent}`);
  if (stats.issues.length > 0) {
    console.log(`[CRON] Issues: ${stats.issues.length}`);
    stats.issues.forEach(issue => console.log(`[CRON]   - ${issue}`));
  }
  console.log(`[CRON] ===================\n`);
  
  return stats;
};

// Diagnostic endpoint - check what's stored in memory
app.get('/api/debug', (req, res) => {
  const subscriptionList = Array.from(subscriptions.keys()).map(userId => {
    const sub = subscriptions.get(userId);
    return {
      userId: userId.substring(0, 30) + '...',
      endpoint: sub?.endpoint?.substring(0, 50) + '...' || 'no endpoint',
      hasKeys: !!sub?.keys
    };
  });
  
  const scheduleList = Array.from(userSchedules.keys()).map(userId => {
    const schedule = userSchedules.get(userId);
    return {
      userId: userId.substring(0, 30) + '...',
      notificationTimes: schedule?.notificationTimes || [],
      foodsCount: schedule?.foods?.length || 0,
      foods: schedule?.foods?.map(f => f.name) || []
    };
  });
  
  res.json({
    timestamp: new Date().toISOString(),
    memory: {
      totalSubscriptions: subscriptions.size,
      totalSchedules: userSchedules.size
    },
    subscriptions: subscriptionList,
    schedules: scheduleList,
    notes: {
      subscriptionsInMemory: subscriptions.size > 0 ? '✅ Subscriptions found' : '❌ No subscriptions - enable notifications first',
      schedulesInMemory: userSchedules.size > 0 ? '✅ Schedules found' : '❌ No schedules - save settings first',
      matchCheck: 'Check if userId from subscriptions matches userId from schedules'
    }
  });
});

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
    const stats = checkAndSendNotifications();
    const now = new Date();
    res.json({ 
      success: true, 
      message: 'Notifications checked',
      checkedAt: now.toISOString(),
      currentTime: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      stats: {
        totalSubscriptions: stats.subscriptionsChecked,
        totalSchedules: userSchedules.size,
        subscriptionsWithSchedules: stats.subscriptionsWithSchedules,
        schedulesChecked: stats.schedulesChecked,
        timeMatches: stats.timeMatches.length,
        notificationsSent: stats.notificationsSent,
        issues: stats.issues
      }
    });
  } catch (error) {
    console.error('Cron error:', error);
    res.status(500).json({ error: 'Failed to check notifications', details: error.message });
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

