import { getFoods } from "./storage";
import {
  scheduleNotifications as scheduleSWNotifications,
  showTestNotification,
} from "./serviceWorker";

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

export const scheduleNotifications = async (times: string[]): Promise<void> => {
  // Get recent foods function
  const getRecentFoods = () => {
    return getFoods()
      .sort((a, b) => {
        const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
        const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  };

  // Schedule notifications via service worker
  await scheduleSWNotifications(times, getRecentFoods);
};

export const testNotification = async (): Promise<void> => {
  const getRecentFoods = () => {
    return getFoods()
      .sort((a, b) => {
        const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
        const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 5);
  };

  await showTestNotification(getRecentFoods);
};
