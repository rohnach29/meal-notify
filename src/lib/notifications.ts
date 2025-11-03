import {
  subscribeToPush,
  updateNotificationSchedule,
  sendTestNotification,
  isPushSupported,
  getCurrentSubscription,
} from "./pushNotifications";

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const enablePushNotifications = async (): Promise<boolean> => {
  if (!isPushSupported()) {
    console.error("Push notifications are not supported");
    throw new Error("Push notifications are not supported in this browser");
  }

  // Request notification permission first
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) {
    throw new Error("Notification permission was denied");
  }

  // Subscribe to push
  try {
    const subscription = await subscribeToPush();
    return subscription !== null;
  } catch (error) {
    console.error("Push subscription error:", error);
    throw error; // Re-throw to be caught by UI
  }
};

export const scheduleNotifications = async (times: string[]): Promise<void> => {
  // Check if already subscribed
  const existingSubscription = await getCurrentSubscription();
  
  if (!existingSubscription) {
    // Subscribe first
    const subscribed = await enablePushNotifications();
    if (!subscribed) {
      throw new Error("Failed to subscribe to push notifications");
    }
  }

  // Update schedule on server
  const success = await updateNotificationSchedule(times);
  if (!success) {
    throw new Error("Failed to update notification schedule");
  }
};

export const testNotification = async (): Promise<void> => {
  const success = await sendTestNotification();
  if (!success) {
    throw new Error("Failed to send test notification");
  }
};
