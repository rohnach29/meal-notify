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
  let notificationData = {
    title: 'Meal Reminder 🍽️',
    body: 'Time to log your meal!',
    foods: [],
  };

  if (event.data) {
    try {
      notificationData = JSON.parse(event.data.text());
    } catch (e) {
      console.error('Failed to parse push data:', e);
    }
  }

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
  const actions = [];
  
  // Add food actions (max 4 due to notification API limits)
  if (foods && foods.length > 0) {
    foods.slice(0, 4).forEach((food) => {
      actions.push({
        action: `food-${food.id}`,
        title: food.name.length > 20 ? food.name.substring(0, 17) + '...' : food.name,
        icon: '/icon-192.png'
      });
    });
  }
  
  // Add view all action
  actions.push({
    action: 'view-all',
    title: 'View All',
    icon: '/icon-192.png'
  });
  
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
  
  return self.registration.showNotification(title || `${APP_NAME} - Meal Reminder`, options);
}
