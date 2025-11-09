// Service Worker registration and management
let registration: ServiceWorkerRegistration | null = null;
let notificationInterval: number | null = null;

export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!("serviceWorker" in navigator)) {
    console.log("Service Worker not supported");
    return null;
  }

  try {
    // Wait for any existing service worker to be ready (VitePWA auto-registers)
    // If none exists, VitePWA will register one automatically
    registration = await navigator.serviceWorker.ready;
    console.log("Service Worker ready:", registration.scope);
    
    return registration;
  } catch (error) {
    console.error("Service Worker not available:", error);
    // Try to register manually if VitePWA didn't register one
    try {
      registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
      });
      await navigator.serviceWorker.ready;
      return registration;
    } catch (manualError) {
      console.error("Manual Service Worker registration failed:", manualError);
      return null;
    }
  }
};

export const getServiceWorkerRegistration = (): ServiceWorkerRegistration | null => {
  return registration;
};

// Schedule notifications using intervals (since setTimeout doesn't work in service workers reliably on iOS)
export const scheduleNotifications = async (
  times: string[],
  getRecentFoods: () => any[]
): Promise<void> => {
  // Clear existing interval
  if (notificationInterval !== null) {
    clearInterval(notificationInterval);
    notificationInterval = null;
  }

  const reg = await navigator.serviceWorker.ready;
  
  if (!reg) {
    console.error("Service Worker not ready");
    return;
  }

  // Calculate next notification times
  const now = new Date();
  const scheduledNotifications: Array<{ time: Date; timeStr: string }> = [];

  for (const timeStr of times) {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes, 0, 0);
    
    // If time has passed today, schedule for tomorrow
    if (scheduledTime <= now) {
      scheduledTime.setDate(scheduledTime.getDate() + 1);
    }
    
    scheduledNotifications.push({ time: scheduledTime, timeStr });
  }

  // Sort by time
  scheduledNotifications.sort((a, b) => a.time.getTime() - b.time.getTime());

  // Schedule each notification
  scheduledNotifications.forEach(({ time, timeStr }) => {
    const delay = time.getTime() - now.getTime();
    
    setTimeout(() => {
      showScheduledNotification(timeStr, getRecentFoods);
      
      // Schedule recurring daily notification
      const dailyInterval = 24 * 60 * 60 * 1000; // 24 hours
      setInterval(() => {
        showScheduledNotification(timeStr, getRecentFoods);
      }, dailyInterval);
    }, delay);
  });
};

const showScheduledNotification = async (
  timeStr: string,
  getRecentFoods: () => any[]
): Promise<void> => {
  const reg = await navigator.serviceWorker.ready;
  
  if (!reg) {
    return;
  }

  const foods = getRecentFoods().slice(0, 5);
  
  // Send message to service worker to show notification
  if (reg.active) {
    reg.active.postMessage({
      type: "SHOW_NOTIFICATION",
      foods: foods,
      title: "Meal Reminder 🍽️",
      body: foods.length > 0
        ? `Quick log: ${foods.slice(0, 3).map((f) => f.name).join(", ")}${
            foods.length > 3 ? ` +${foods.length - 3} more` : ""
          }`
        : "Time to log your meal! What did you eat?",
    });
  }
};

// Test notification
export const showTestNotification = async (
  getRecentFoods: () => any[]
): Promise<void> => {
  const reg = await navigator.serviceWorker.ready;
  
  if (!reg) {
    return;
  }

  const foods = getRecentFoods().slice(0, 5);
  
  if (reg.active) {
    reg.active.postMessage({
      type: "SHOW_NOTIFICATION",
      foods: foods,
      title: "Test Notification",
      body: foods.length > 0
        ? `Test: ${foods.slice(0, 3).map((f) => f.name).join(", ")}${
            foods.length > 3 ? ` +${foods.length - 3} more` : ""
          }`
        : "Test notification - no recent foods",
    });
  }
};

// Listen for messages from service worker
export const setupServiceWorkerMessageListener = (
  onLogFood: (foodId: string) => void,
  onOpenLogPage: () => void
): void => {
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data.type === "LOG_FOOD_FROM_NOTIFICATION") {
      onLogFood(event.data.foodId);
    } else if (event.data.type === "OPEN_LOG_PAGE") {
      onOpenLogPage();
    } else if (event.data.type === "SW_LOG") {
      // Log service worker messages to main console
      // This allows us to see service worker logs in Safari Web Inspector
      console.log('[SW]', ...event.data.logs);
    }
  });
};

