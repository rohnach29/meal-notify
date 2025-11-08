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
// Returns: { success: true } or throws error with details
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
    return { 
      success: true, 
      message: 'Notification sent successfully',
      endpoint: subscription.endpoint?.substring(0, 50) + '...'
    };
  } catch (error) {
    // Remove invalid subscription
    if (error.statusCode === 410 || error.statusCode === 404) {
      const userId = getUserId(subscription);
      subscriptions.delete(userId);
      console.log('Removed invalid subscription:', userId.substring(0, 20));
    }
    
    // Return error details instead of throwing (for diagnostics)
    return {
      success: false,
      error: error.message,
      statusCode: error.statusCode,
      endpoint: subscription.endpoint?.substring(0, 50) + '...',
      body: error.body ? JSON.stringify(error.body).substring(0, 100) : undefined
    };
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
    const result = await sendNotification(
      subscription,
      'Test Notification',
      foods && foods.length > 0
        ? `Test: ${foods.slice(0, 3).map(f => f.name).join(', ')}${foods.length > 3 ? ` +${foods.length - 3} more` : ''}`
        : 'Test notification - no recent foods',
      foods || []
    );
    
    if (result.success) {
      res.json({ success: true, message: 'Test notification sent', details: result });
    } else {
      res.status(500).json({ 
        success: false,
        error: 'Failed to send notification', 
        details: result 
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to send notification', details: error.message });
  }
});

// Check and send notifications for current time (exact match)
// Cron runs every minute, so we check for exact time matches only
// Returns detailed diagnostics in the response instead of just console.log
const checkAndSendNotifications = async () => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')}`;
  
  // Build detailed diagnostics object (returned in API response)
  const diagnostics = {
    timestamp: now.toISOString(),
    currentTime,
    currentTimeUTC: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')} UTC`,
    subscriptionsInMemory: subscriptions.size,
    schedulesInMemory: userSchedules.size,
    subscriptions: [],
    summary: {
      subscriptionsChecked: 0,
      subscriptionsWithSchedules: 0,
      schedulesChecked: 0,
      timeMatches: 0,
      notificationsAttempted: 0,
      notificationsSucceeded: 0,
      notificationsFailed: 0
    },
    issues: []
  };
  
  // Check each subscription
  if (subscriptions.size === 0) {
    diagnostics.issues.push('No subscriptions stored - did you enable notifications?');
    return diagnostics;
  }
  
  // Process each subscription
  for (const [userId, subscription] of subscriptions.entries()) {
    const userIdShort = userId.substring(0, 30) + '...';
    diagnostics.summary.subscriptionsChecked++;
    
    const subDiagnostic = {
      userId: userIdShort,
      endpoint: subscription.endpoint?.substring(0, 50) + '...',
      hasSchedule: false,
      scheduleTimes: [],
      timeChecks: [],
      notifications: []
    };
    
    const userData = userSchedules.get(userId);
    
    if (!userData) {
      subDiagnostic.issues = ['No schedule data found'];
      diagnostics.issues.push(`Subscription has no schedule`);
      diagnostics.subscriptions.push(subDiagnostic);
      continue;
    }
    
    if (!userData.notificationTimes || userData.notificationTimes.length === 0) {
      subDiagnostic.issues = ['No notification times set'];
      diagnostics.issues.push(`Subscription has no notification times`);
      diagnostics.subscriptions.push(subDiagnostic);
      continue;
    }
    
    subDiagnostic.hasSchedule = true;
    subDiagnostic.scheduleTimes = userData.notificationTimes;
    diagnostics.summary.subscriptionsWithSchedules++;

    const foods = userData.foods || [];
    const foodsList = Array.isArray(foods) ? foods.slice(0, 5) : [];

    // Check each scheduled time - exact match only (cron runs every minute)
    for (const scheduledTime of userData.notificationTimes) {
      diagnostics.summary.schedulesChecked++;
      const [scheduledHour, scheduledMinute] = scheduledTime.split(':').map(Number);
      const scheduledTotalMinutes = scheduledHour * 60 + scheduledMinute;
      const currentTotalMinutes = currentHour * 60 + currentMinute;
      const timeDiff = Math.abs(currentTotalMinutes - scheduledTotalMinutes);
      
      const timeCheck = {
        scheduledTime,
        scheduledTimeUTC: `${String(scheduledHour).padStart(2, '0')}:${String(scheduledMinute).padStart(2, '0')} UTC`,
        currentTime,
        currentTimeUTC: `${String(currentHour).padStart(2, '0')}:${String(currentMinute).padStart(2, '0')} UTC`,
        scheduledMinutes: scheduledTotalMinutes,
        currentMinutes: currentTotalMinutes,
        timeDiff,
        matches: timeDiff === 0  // Exact match only (cron runs every minute)
      };
      
      subDiagnostic.timeChecks.push(timeCheck);
      
      // Exact match only - no time window needed since cron runs every minute
      if (timeDiff === 0) {
        diagnostics.summary.timeMatches++;
        diagnostics.summary.notificationsAttempted++;
        
        const foodNames = foodsList.length > 0
          ? foodsList.slice(0, 3).map(f => f.name).join(', ') + 
            (foodsList.length > 3 ? ` +${foodsList.length - 3} more` : '')
          : 'Time to log your meal! What did you eat?';

        // Send notification and capture result
        const result = await sendNotification(
          subscription,
          'Meal Reminder 🍽️',
          `Quick log: ${foodNames}`,
          foodsList
        );
        
        const notificationResult = {
          scheduledTime,
          attempted: true,
          success: result.success,
          timestamp: new Date().toISOString(),
          ...result
        };
        
        subDiagnostic.notifications.push(notificationResult);
        
        if (result.success) {
          diagnostics.summary.notificationsSucceeded++;
        } else {
          diagnostics.summary.notificationsFailed++;
          diagnostics.issues.push(
            `Notification failed for ${scheduledTime}: ${result.error} (${result.statusCode || 'unknown'})`
          );
        }
      }
    }
    
    diagnostics.subscriptions.push(subDiagnostic);
  }
  
  return diagnostics;
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

// Cron endpoint - called by external cron service every minute
// Checks all users and sends notifications if their scheduled time matches exactly
// Returns detailed diagnostics in the response for debugging
// For security, you can add CRON_SECRET env var and set it in your external cron service
app.get('/api/cron', async (req, res) => {
  // Optional: Verify cron secret for security
  const cronSecret = req.headers['authorization'] || req.query.secret;
  if (process.env.CRON_SECRET && cronSecret !== `Bearer ${process.env.CRON_SECRET}` && cronSecret !== process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const diagnostics = await checkAndSendNotifications();
    res.json({ 
      success: true, 
      message: 'Notifications checked',
      ...diagnostics  // Include all diagnostic information in response
    });
  } catch (error) {
    console.error('Cron error:', error);
    res.status(500).json({ 
      error: 'Failed to check notifications', 
      details: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

// Start scheduler for local development only
// Runs every minute to check for scheduled notifications
// In production, external cron service will call /api/cron every minute
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  try {
    // Run every minute
    cron.schedule('* * * * *', () => {
      console.log('Checking for scheduled notifications...');
      checkAndSendNotifications();
    });
    console.log('Local cron scheduler started (checks every minute)');
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

