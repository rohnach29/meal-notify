// Web Push notification subscription and management
import { getFoods } from "./storage";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

let vapidPublicKey: string | null = null;
let subscription: PushSubscription | null = null;

// Get VAPID public key from server
export const getVapidKey = async (): Promise<string> => {
  if (vapidPublicKey) {
    return vapidPublicKey;
  }

  try {
    const response = await fetch(`${API_URL}/api/vapid-key`);
    const data = await response.json();
    vapidPublicKey = data.publicKey;
    return vapidPublicKey;
  } catch (error) {
    console.error('Failed to get VAPID key:', error);
    throw error;
  }
};

// Convert VAPID key to Uint8Array
const urlBase64ToUint8Array = (base64String: string): Uint8Array => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Subscribe to push notifications
export const subscribeToPush = async (): Promise<PushSubscription | null> => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.error('Push notifications are not supported');
    throw new Error('Push notifications are not supported in this browser');
  }

  try {
    // Register service worker first
    const registration = await navigator.serviceWorker.ready;
    console.log('Service worker ready');

    // Get VAPID public key from backend
    console.log('Fetching VAPID key from:', `${API_URL}/api/vapid-key`);
    const publicKey = await getVapidKey();
    
    if (!publicKey) {
      throw new Error('Failed to get VAPID public key from backend');
    }
    
    console.log('VAPID key received');
    const applicationServerKey = urlBase64ToUint8Array(publicKey);

    // Subscribe to push
    console.log('Subscribing to push manager...');
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey,
    });
    
    console.log('Push subscription created:', subscription.endpoint.substring(0, 50) + '...');

    // Send subscription to server
    console.log('Sending subscription to backend:', `${API_URL}/api/subscribe`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    try {
      const response = await fetch(`${API_URL}/api/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Backend subscription failed: ${response.status}`;
        try {
          const errorData = JSON.parse(errorText);
          errorMessage += ` - ${errorData.error || errorData.details || errorText}`;
        } catch {
          errorMessage += ` - ${errorText}`;
        }
        console.error('Backend subscription failed:', response.status, errorText);
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('Subscribed to push notifications successfully:', result);
      return subscription;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        console.error('Request timed out');
        throw new Error('Request timed out - backend may be slow or unreachable');
      }
      
      console.error('Failed to send subscription to backend:', error);
      // Re-throw with more context
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(`Failed to subscribe: ${String(error)}`);
    }
  } catch (error) {
    console.error('Failed to subscribe:', error);
    // Re-throw with more context
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Push subscription failed: ${String(error)}`);
  }
};

// Update notification schedule on server
export const updateNotificationSchedule = async (
  notificationTimes: string[]
): Promise<boolean> => {
  if (!subscription) {
    // Try to get existing subscription
    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();
    if (!existingSubscription) {
      console.error('No push subscription found');
      return false;
    }
    subscription = existingSubscription;
  }

  const foods = getFoods()
    .sort((a, b) => {
      const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
      const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5);

  try {
    await fetch(`${API_URL}/api/update-schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription,
        notificationTimes,
        foods,
      }),
    });

    console.log('Schedule updated on server');
    return true;
  } catch (error) {
    console.error('Failed to update schedule:', error);
    return false;
  }
};

// Send test notification
export const sendTestNotification = async (): Promise<boolean> => {
  if (!subscription) {
    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();
    if (!existingSubscription) {
      console.error('No push subscription found');
      return false;
    }
    subscription = existingSubscription;
  }

  const foods = getFoods()
    .sort((a, b) => {
      const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
      const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5);

  try {
    await fetch(`${API_URL}/api/test-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        subscription,
        foods,
      }),
    });

    return true;
  } catch (error) {
    console.error('Failed to send test notification:', error);
    return false;
  }
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async (): Promise<boolean> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const existingSubscription = await registration.pushManager.getSubscription();
    
    if (existingSubscription) {
      await existingSubscription.unsubscribe();
      
      await fetch(`${API_URL}/api/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscription: existingSubscription }),
      });

      subscription = null;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Failed to unsubscribe:', error);
    return false;
  }
};

// Check if push notifications are supported
export const isPushSupported = (): boolean => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Get current subscription
export const getCurrentSubscription = async (): Promise<PushSubscription | null> => {
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch (error) {
    console.error('Failed to get subscription:', error);
    return null;
  }
};

