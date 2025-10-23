import { getMeals } from "./storage";

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

export const scheduleNotifications = (times: string[]): void => {
  // Clear existing scheduled notifications
  // Note: Web API doesn't support scheduling future notifications
  // We'll use service worker with periodic background sync in production
  console.log("Notification times set:", times);
};

export const showMealReminderNotification = (): void => {
  if (Notification.permission !== "granted") return;

  const meals = getMeals()
    .sort((a, b) => {
      const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
      const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
      return bTime - aTime;
    })
    .slice(0, 5);

  const notification = new Notification("Time to log your meal! 🍽️", {
    body:
      meals.length > 0
        ? `Quick log: ${meals.slice(0, 3).map((m) => m.name).join(", ")}`
        : "What did you eat?",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: "meal-reminder",
    requireInteraction: false,
  });

  notification.onclick = () => {
    window.focus();
    window.location.href = "/log";
    notification.close();
  };
};
