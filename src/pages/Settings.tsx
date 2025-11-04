import { useState, useEffect } from "react";
import { getPreferences, savePreferences } from "@/lib/storage";
import { requestNotificationPermission, enablePushNotifications, scheduleNotifications, testNotification } from "@/lib/notifications";
import { isPushSupported, getCurrentSubscription } from "@/lib/pushNotifications";
import { UserPreferences } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const Settings = () => {
  const [prefs, setPrefs] = useState<UserPreferences>(getPreferences());
  const [notificationPermission, setNotificationPermission] = useState(
    "Notification" in window ? Notification.permission : "denied"
  );

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  const handleSave = async () => {
    savePreferences(prefs);
    
    // Schedule notifications if enabled
    if (prefs.notificationsEnabled && notificationPermission === "granted") {
      try {
        await scheduleNotifications(prefs.notificationTimes);
        toast.success("Settings saved and notifications scheduled!");
      } catch (error) {
        console.error("Failed to schedule notifications:", error);
        toast.error("Settings saved, but failed to schedule notifications");
      }
    } else {
      toast.success("Settings saved");
    }
  };

  const handleEnableNotifications = async () => {
    try {
      console.log('=== Starting notification enable process ===');
      console.log('API URL:', import.meta.env.VITE_API_URL || 'http://localhost:3000');
      console.log('Push supported:', isPushSupported());
      console.log('Service worker:', 'serviceWorker' in navigator);
      
      // Enable push notifications (this requests permission and subscribes)
      const enabled = await enablePushNotifications();
      
      console.log('enablePushNotifications returned:', enabled);
      
      if (enabled) {
        setNotificationPermission("granted");
        const updatedPrefs = { ...prefs, notificationsEnabled: true };
        setPrefs(updatedPrefs);
        savePreferences(updatedPrefs);
        
        // Schedule notifications immediately
        try {
          await scheduleNotifications(updatedPrefs.notificationTimes);
          toast.success("Notifications enabled and scheduled!");
        } catch (error) {
          console.error("Failed to schedule notifications:", error);
          toast.success("Notifications enabled");
        }
      } else {
        toast.error("Failed to enable push notifications");
      }
    } catch (error) {
      console.error("=== Error enabling notifications ===");
      console.error("Full error:", error);
      console.error("Error name:", error instanceof Error ? error.name : 'unknown');
      console.error("Error message:", error instanceof Error ? error.message : String(error));
      console.error("Error stack:", error instanceof Error ? error.stack : 'no stack');
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Provide more specific error messages
      if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
        toast.error("Connection timed out. Check your internet connection and try again.");
      } else if (errorMessage.includes("VAPID") || errorMessage.includes("backend") || errorMessage.includes("fetch")) {
        toast.error(`Backend connection failed: ${errorMessage}. Check if backend is running and VITE_API_URL is correct.`);
      } else if (errorMessage.includes("permission")) {
        toast.error("Notification permission was denied. Please enable it in iPhone Settings.");
      } else {
        toast.error(`Failed to enable notifications: ${errorMessage}`);
      }
    }
  };

  const handleTestNotification = async () => {
    if (notificationPermission !== "granted") {
      toast.error("Please enable notifications first");
      return;
    }
    
    try {
      await testNotification();
      toast.success("Test notification sent!");
    } catch (error) {
      console.error("Failed to send test notification:", error);
      toast.error("Failed to send test notification");
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-6">Settings</h1>

        <div className="space-y-6">
          {/* Daily Target */}
          <Card className="p-6 shadow-soft">
            <Label htmlFor="target" className="text-base font-semibold mb-3 block">
              Daily Calorie Target
            </Label>
            <Input
              id="target"
              type="number"
              value={prefs.dailyCalorieTarget}
              onChange={(e) =>
                setPrefs({ ...prefs, dailyCalorieTarget: parseInt(e.target.value) || 2000 })
              }
              className="text-lg"
            />
          </Card>

          {/* Show Macros */}
          <Card className="p-6 shadow-soft">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold mb-1">Show Macros</div>
                <div className="text-sm text-muted-foreground">
                  Display protein, carbs, and fat breakdown
                </div>
              </div>
              <Switch
                checked={prefs.showMacros}
                onCheckedChange={(checked) => setPrefs({ ...prefs, showMacros: checked })}
              />
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-6 shadow-soft">
            <div className="font-semibold mb-3">Meal Reminders</div>
            <div className="text-sm text-muted-foreground mb-4">
              Get reminded to log your meals at:
            </div>
            <div className="space-y-3 mb-4">
              {prefs.notificationTimes.map((time, index) => (
                <Input
                  key={index}
                  type="time"
                  value={time}
                  onChange={(e) => {
                    const newTimes = [...prefs.notificationTimes];
                    newTimes[index] = e.target.value;
                    setPrefs({ ...prefs, notificationTimes: newTimes });
                  }}
                />
              ))}
            </div>
            {notificationPermission !== "granted" && (
              <Button
                onClick={handleEnableNotifications}
                className="w-full gradient-primary"
              >
                Enable Notifications
              </Button>
            )}
            {notificationPermission === "granted" && (
              <div className="space-y-3">
                <div className="text-sm text-success flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success"></div>
                  Notifications enabled
                </div>
                <Button
                  onClick={handleTestNotification}
                  variant="outline"
                  className="w-full"
                >
                  Test Notification
                </Button>
              </div>
            )}
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} className="w-full gradient-accent" size="lg">
            Save Settings
          </Button>

          {/* Debug Info */}
          <Card className="p-6 shadow-soft border-2 border-orange-200">
            <div className="font-semibold mb-3 text-orange-600">🔍 Debug Info</div>
            <div className="space-y-3 text-sm">
              <div className="space-y-2">
                <div className="font-medium">API URL:</div>
                <div className="font-mono text-xs bg-muted p-2 rounded break-all">
                  {import.meta.env.VITE_API_URL || 'http://localhost:3000 (DEFAULT)'}
                </div>
                <div className="text-xs text-muted-foreground">
                  {import.meta.env.VITE_API_URL 
                    ? '✅ Environment variable set' 
                    : '⚠️ Using default (localhost)'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-medium">Push Support:</div>
                <div className="text-xs">
                  {isPushSupported() ? '✅ Supported' : '❌ Not supported'}
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-medium">Service Worker:</div>
                <div className="text-xs">
                  {('serviceWorker' in navigator) ? '✅ Available' : '❌ Not available'}
                </div>
              </div>

              <Button
                onClick={async () => {
                  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                  toast.info(`Testing: ${apiUrl}`);
                  
                  try {
                    const response = await fetch(`${apiUrl}/api/vapid-key`);
                    
                    if (!response.ok) {
                      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    const data = await response.json();
                    
                    if (data.publicKey) {
                      toast.success(`✅ Backend connected! URL: ${apiUrl}`);
                    } else {
                      toast.error(`❌ Invalid response from backend`);
                    }
                  } catch (error) {
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    toast.error(`❌ Backend failed: ${errorMsg}`);
                    console.error('Backend test error:', error);
                  }
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Test Backend Connection
              </Button>

              <Button
                onClick={async () => {
                  try {
                    const subscription = await getCurrentSubscription();
                    if (subscription) {
                      toast.success('✅ Push subscription active');
                      console.log('Subscription:', subscription);
                    } else {
                      toast.info('ℹ️ No push subscription found');
                    }
                  } catch (error) {
                    toast.error(`❌ Error checking subscription: ${error instanceof Error ? error.message : String(error)}`);
                  }
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Check Push Subscription
              </Button>

              <Button
                onClick={() => {
                  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
                  const details = {
                    apiUrl,
                    hasEnvVar: !!import.meta.env.VITE_API_URL,
                    pushSupported: isPushSupported(),
                    serviceWorkerSupported: 'serviceWorker' in navigator,
                    notificationPermission: notificationPermission,
                  };
                  console.log('Debug Details:', details);
                  toast.info('Debug info logged to console');
                }}
                variant="outline"
                size="sm"
                className="w-full"
              >
                Log All Debug Info to Console
              </Button>
            </div>
          </Card>

          {/* App Info */}
          <Card className="p-6 shadow-soft">
            <div className="text-sm text-muted-foreground text-center">
              <p className="mb-2">Calorie Tracker PWA</p>
              <p>Version 1.0.0</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;
