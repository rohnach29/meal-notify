// Service Worker for PWA notifications
// This file will be processed by VitePWA injectManifest
// VitePWA will inject the manifest array here: self.__WB_MANIFEST

// Import workbox using importScripts (works in service workers)
try {
  importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-precaching.prod.js');

  // Precache all files using the injected manifest
  // VitePWA will replace self.__WB_MANIFEST with the actual manifest array
  if (workbox && workbox.precaching) {
    workbox.precaching.precacheAndRoute(self.__WB_MANIFEST);
  }
} catch (e) {
  console.error('Workbox precaching failed:', e);
  // Fallback: manually cache critical files if workbox fails
  const CACHE_NAME = 'meal-notify-v1';
  const urlsToCache = ['/', '/index.html'];
  
  self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
    );
  });
}

const APP_NAME = 'Calorie Tracker';

// Helper function to send logs to client (so we can see them in main console)
// Safari doesn't show service worker console.log, so we send via postMessage
async function logToClient(...args) {
  try {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    clients.forEach(client => {
      client.postMessage({
        type: 'SW_LOG',
        logs: args.map(arg => {
          if (typeof arg === 'object') {
            try {
              return JSON.stringify(arg, null, 2);
            } catch {
              return String(arg);
            }
          }
          return String(arg);
        })
      });
    });
  } catch (e) {
    // Silently fail if we can't send to clients
  }
  // Also log to console (might work in some browsers)
  console.log('[SW]', ...args);
}

// Install event
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const action = event.action;
  const data = event.notification.data || {};
  
  // If action is a food ID, log it via message
  if (action && action.startsWith('food-')) {
    const foodId = action.replace('food-', '');
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          // App is open, send message to log food
          clientList[0].postMessage({
            type: 'LOG_FOOD_FROM_NOTIFICATION',
            foodId: foodId
          });
          return clientList[0].focus();
        } else {
          // App is closed, open with query param
          return clients.openWindow(`/?logFood=${foodId}`);
        }
      })
    );
  } else if (action === 'view-all') {
    // Open log page
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          clientList[0].postMessage({
            type: 'OPEN_LOG_PAGE'
          });
          return clientList[0].focus();
        } else {
          return clients.openWindow('/log');
        }
      })
    );
  } else {
    // Default: open the log page
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('/log');
      })
    );
  }
});

// Push event handler (for Web Push notifications from server)
self.addEventListener('push', (event) => {
  logToClient('========== PUSH EVENT RECEIVED ==========');
  logToClient('Push event received at:', new Date().toISOString());
  
  let notificationData = {
    title: 'Meal Reminder 🍽️',
    body: 'Time to log your meal!',
    foods: [],
  };

  // Step 1: Check if event.data exists
  if (event.data) {
    logToClient('✅ event.data exists');
    try {
      // Step 2: Get the raw text data (before parsing)
      const rawText = event.data.text();
      logToClient('Raw data text length:', rawText.length, 'characters');
      logToClient('Raw data text (first 500 chars):', rawText.substring(0, 500));
      
      // Step 3: Parse the JSON
      const parsed = JSON.parse(rawText);
      logToClient('✅ Successfully parsed JSON');
      logToClient('Parsed data keys:', Object.keys(parsed));
      
      // Step 4: Check what fields are present
      logToClient('Has title?', !!parsed.title, '=', parsed.title);
      logToClient('Has body?', !!parsed.body, '=', parsed.body);
      logToClient('Has foods?', !!parsed.foods);
      logToClient('Has data?', !!parsed.data);
      
      // Step 5: Specifically check foods array
      if (parsed.foods) {
        logToClient('✅ foods array exists!');
        logToClient('foods type:', typeof parsed.foods);
        logToClient('foods is array?', Array.isArray(parsed.foods));
        logToClient('foods length:', parsed.foods?.length || 0);
        logToClient('foods content:', parsed.foods);
      } else {
        logToClient('❌ foods array is MISSING from parsed data!');
        logToClient('Full parsed data:', parsed);
      }
      
      // Step 6: Check if foods is in data object instead
      if (parsed.data && parsed.data.foods) {
        logToClient('⚠️ Found foods in data.foods instead:', parsed.data.foods);
      }
      
      notificationData = parsed;
    } catch (e) {
      logToClient('❌ Failed to parse push data:', e.message);
      logToClient('Error:', e);
    }
  } else {
    logToClient('❌ event.data is NULL or UNDEFINED');
  }

  // Step 7: Log what we're passing to showNotificationWithActions
  logToClient('Passing to showNotificationWithActions:');
  logToClient('  - foods:', notificationData.foods);
  logToClient('  - foods length:', (notificationData.foods || []).length);
  logToClient('  - title:', notificationData.title);
  logToClient('  - body:', notificationData.body);

  event.waitUntil(
    showNotificationWithActions(
      notificationData.foods || [],
      notificationData.title,
      notificationData.body
    )
  );
});

// Message handler from main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { foods, title, body } = event.data;
    showNotificationWithActions(foods, title, body);
  }
});

// Show notification with food actions
async function showNotificationWithActions(foods, title, body) {
  logToClient('========== showNotificationWithActions CALLED ==========');
  logToClient('Received parameters:');
  logToClient('  - foods:', foods);
  logToClient('  - foods type:', typeof foods);
  logToClient('  - foods is array?', Array.isArray(foods));
  logToClient('  - foods length:', foods?.length || 0);
  logToClient('  - title:', title);
  logToClient('  - body:', body);
  
  // Get absolute URL for icons (iOS requires absolute URLs)
  const iconUrl = self.location.origin + '/icon-192.png';
  logToClient('Icon URL:', iconUrl);
  
  const actions = [];
  
  // Filter out invalid foods and add food actions (max 4 due to notification API limits)
  if (foods && foods.length > 0) {
    logToClient('✅ Creating actions from foods array');
    logToClient('Foods to process:', foods);
    
    // Filter valid foods (must have id and name, and id must not be empty)
    const validFoods = foods.filter(food => {
      const isValid = food && food.id && food.id !== '' && food.name;
      if (!isValid) {
        logToClient(`⚠️ Filtered out invalid food:`, food);
      }
      return isValid;
    });
    
    logToClient(`Valid foods after filtering: ${validFoods.length} out of ${foods.length}`);
    
    validFoods.slice(0, 4).forEach((food, index) => {
      logToClient(`Processing food ${index + 1}:`, food);
      const action = {
        action: `food-${food.id}`,
        title: food.name.length > 20 ? food.name.substring(0, 17) + '...' : food.name,
        // Don't include icon - iOS Safari doesn't support icons in notification actions
      };
      logToClient(`Created action:`, action);
      actions.push(action);
    });
    logToClient(`Created ${actions.length} food actions`);
  } else {
    logToClient('❌ No foods provided or foods array is empty!');
    logToClient('This is why no action buttons will appear.');
  }
  
  // Add view all action (only if we have food actions)
  if (actions.length > 0) {
    actions.push({
      action: 'view-all',
      title: 'View All',
      // Don't include icon - iOS Safari doesn't support icons in notification actions
    });
    logToClient('Added "View All" action');
  }
  
  logToClient('Total actions:', actions.length);
  logToClient('Actions array:', actions);
  
  const options = {
    body: body || 'Time to log your meal!',
    icon: iconUrl,  // ✅ Use absolute URL for notification icon
    badge: iconUrl, // ✅ Use absolute URL for notification badge
    tag: 'meal-reminder',
    requireInteraction: false,
    data: {
      url: '/log',
      foods: foods ? foods.filter(f => f && f.id && f.id !== '').map(f => f.id) : []
    }
  };
  
  // Only add actions if we have them (iOS might not show notification if actions array is empty or malformed)
  if (actions.length > 0) {
    options.actions = actions;
  }
  
  logToClient('Notification options:');
  logToClient('  - body:', options.body);
  logToClient('  - icon:', options.icon);
  logToClient('  - actions count:', options.actions ? options.actions.length : 0);
  logToClient('  - actions:', options.actions);
  logToClient('  - data.foods:', options.data.foods);
  
  logToClient('Calling showNotification with title:', title);
  
  try {
    const notification = await self.registration.showNotification(
      title || `${APP_NAME} - Meal Reminder`, 
      options
    );
    logToClient('✅ Notification shown successfully');
    logToClient('========== END ==========');
    return notification;
  } catch (error) {
    logToClient('❌ Failed to show notification:', error.message);
    logToClient('Error:', error);
    throw error;
  }
}
