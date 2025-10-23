import { useState, useEffect } from "react";
import { getPreferences, savePreferences } from "@/lib/storage";
import { requestNotificationPermission } from "@/lib/notifications";
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

  const handleSave = () => {
    savePreferences(prefs);
    toast.success("Settings saved");
  };

  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      setNotificationPermission("granted");
      setPrefs({ ...prefs, notificationsEnabled: true });
      toast.success("Notifications enabled");
    } else {
      toast.error("Notification permission denied");
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
              <div className="text-sm text-success flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-success"></div>
                Notifications enabled
              </div>
            )}
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} className="w-full gradient-accent" size="lg">
            Save Settings
          </Button>

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
