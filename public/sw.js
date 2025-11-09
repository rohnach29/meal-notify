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
  console.log('[SW] ========== PUSH EVENT RECEIVED ==========');
  console.log('[SW] Push event received at:', new Date().toISOString());
  
  let notificationData = {
    title: 'Meal Reminder 🍽️',
    body: 'Time to log your meal!',
    foods: [],
  };

  // Step 1: Check if event.data exists
  if (event.data) {
    console.log('[SW] ✅ event.data exists');
    try {
      // Step 2: Get the raw text data (before parsing)
      const rawText = event.data.text();
      console.log('[SW] Raw data text length:', rawText.length, 'characters');
      console.log('[SW] Raw data text (first 200 chars):', rawText.substring(0, 200));
      
      // Step 3: Parse the JSON
      const parsed = JSON.parse(rawText);
      console.log('[SW] ✅ Successfully parsed JSON');
      console.log('[SW] Parsed data keys:', Object.keys(parsed));
      
      // Step 4: Check what fields are present
      console.log('[SW] Has title?', !!parsed.title, '=', parsed.title);
      console.log('[SW] Has body?', !!parsed.body, '=', parsed.body);
      console.log('[SW] Has foods?', !!parsed.foods);
      console.log('[SW] Has data?', !!parsed.data);
      
      // Step 5: Specifically check foods array
      if (parsed.foods) {
        console.log('[SW] ✅ foods array exists!');
        console.log('[SW] foods type:', typeof parsed.foods);
        console.log('[SW] foods is array?', Array.isArray(parsed.foods));
        console.log('[SW] foods length:', parsed.foods?.length || 0);
        console.log('[SW] foods content:', JSON.stringify(parsed.foods, null, 2));
      } else {
        console.warn('[SW] ❌ foods array is MISSING from parsed data!');
        console.log('[SW] Full parsed data:', JSON.stringify(parsed, null, 2));
      }
      
      // Step 6: Check if foods is in data object instead
      if (parsed.data && parsed.data.foods) {
        console.log('[SW] ⚠️ Found foods in data.foods instead:', parsed.data.foods);
      }
      
      notificationData = parsed;
    } catch (e) {
      console.error('[SW] ❌ Failed to parse push data:', e);
      console.error('[SW] Error details:', e.message);
    }
  } else {
    console.warn('[SW] ❌ event.data is NULL or UNDEFINED');
  }

  // Step 7: Log what we're passing to showNotificationWithActions
  console.log('[SW] Passing to showNotificationWithActions:');
  console.log('[SW]   - foods:', notificationData.foods);
  console.log('[SW]   - foods length:', (notificationData.foods || []).length);
  console.log('[SW]   - title:', notificationData.title);
  console.log('[SW]   - body:', notificationData.body);

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
  console.log('[SW] ========== showNotificationWithActions CALLED ==========');
  console.log('[SW] Received parameters:');
  console.log('[SW]   - foods:', foods);
  console.log('[SW]   - foods type:', typeof foods);
  console.log('[SW]   - foods is array?', Array.isArray(foods));
  console.log('[SW]   - foods length:', foods?.length || 0);
  console.log('[SW]   - title:', title);
  console.log('[SW]   - body:', body);
  
  const actions = [];
  
  // Add food actions (max 4 due to notification API limits)
  if (foods && foods.length > 0) {
    console.log('[SW] ✅ Creating actions from foods array');
    console.log('[SW] Foods to process:', JSON.stringify(foods, null, 2));
    
    foods.slice(0, 4).forEach((food, index) => {
      console.log(`[SW] Processing food ${index + 1}:`, food);
      if (!food || !food.id || !food.name) {
        console.warn(`[SW] ⚠️ Food ${index + 1} is missing id or name:`, food);
        return;
      }
      const action = {
        action: `food-${food.id}`,
        title: food.name.length > 20 ? food.name.substring(0, 17) + '...' : food.name,
        icon: '/icon-192.png'
      };
      console.log(`[SW] Created action:`, action);
      actions.push(action);
    });
    console.log(`[SW] Created ${actions.length} food actions`);
  } else {
    console.warn('[SW] ❌ No foods provided or foods array is empty!');
    console.warn('[SW] This is why no action buttons will appear.');
  }
  
  // Add view all action
  actions.push({
    action: 'view-all',
    title: 'View All',
    icon: '/icon-192.png'
  });
  console.log('[SW] Added "View All" action');
  console.log('[SW] Total actions:', actions.length);
  console.log('[SW] Actions array:', JSON.stringify(actions, null, 2));
  
  const options = {
    body: body || 'Time to log your meal!',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: 'meal-reminder',
    requireInteraction: false,
    actions: actions,
    data: {
      url: '/log',
      foods: foods ? foods.map(f => f.id) : []
    }
  };
  
  console.log('[SW] Notification options:');
  console.log('[SW]   - body:', options.body);
  console.log('[SW]   - actions count:', options.actions.length);
  console.log('[SW]   - actions:', JSON.stringify(options.actions, null, 2));
  console.log('[SW]   - data.foods:', options.data.foods);
  
  console.log('[SW] Calling showNotification with title:', title);
  
  try {
    const notification = await self.registration.showNotification(
      title || `${APP_NAME} - Meal Reminder`, 
      options
    );
    console.log('[SW] ✅ Notification shown successfully');
    console.log('[SW] ========== END ==========');
    return notification;
  } catch (error) {
    console.error('[SW] ❌ Failed to show notification:', error);
    console.error('[SW] Error details:', error.message);
    throw error;
  }
}
