import { useState, useEffect } from "react";
import { getTodayLogs, getPreferences, getMeals, getFoods, deleteLog } from "@/lib/storage";
import { LogEntry, Meal, Food } from "@/types";
import { ProgressRing } from "@/components/ProgressRing";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Today = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [prefs, setPrefs] = useState(getPreferences());
  const [totalCalories, setTotalCalories] = useState(0);
  const [totalProtein, setTotalProtein] = useState(0);
  const [totalCarbs, setTotalCarbs] = useState(0);
  const [totalFat, setTotalFat] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const todayLogs = getTodayLogs();
    setLogs(todayLogs);
    setPrefs(getPreferences());

    const totals = todayLogs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        protein: acc.protein + log.protein,
        carbs: acc.carbs + log.carbs,
        fat: acc.fat + log.fat,
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    setTotalCalories(Math.round(totals.calories));
    setTotalProtein(Math.round(totals.protein));
    setTotalCarbs(Math.round(totals.carbs));
    setTotalFat(Math.round(totals.fat));
  };

  const handleDeleteLog = (id: string) => {
    deleteLog(id);
    loadData();
    toast.success("Log entry deleted");
  };

  const getLogDisplayName = (log: LogEntry): string => {
    if (log.type === "meal") {
      const meal = getMeals().find((m) => m.id === log.mealId);
      return meal ? meal.name : "Unknown Meal";
    } else {
      const food = getFoods().find((f) => f.id === log.foodId);
      return food ? food.name : "Unknown Food";
    }
  };

  const progress = (totalCalories / prefs.dailyCalorieTarget) * 100;
  const remaining = Math.max(0, prefs.dailyCalorieTarget - totalCalories);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary pb-20">
      <div className="max-w-lg mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Today</h1>
          <p className="text-muted-foreground">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>

        {/* Progress Ring */}
        <div className="flex justify-center mb-8">
          <ProgressRing progress={progress} size={220} strokeWidth={16}>
            <div className="text-center">
              <div className="text-5xl font-bold gradient-primary bg-clip-text text-transparent">
                {totalCalories}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                of {prefs.dailyCalorieTarget} kcal
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {remaining} remaining
              </div>
            </div>
          </ProgressRing>
        </div>

        {/* Macros */}
        {prefs.showMacros && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <Card className="p-4 text-center shadow-soft">
              <div className="text-2xl font-bold text-primary">{totalProtein}g</div>
              <div className="text-xs text-muted-foreground mt-1">Protein</div>
            </Card>
            <Card className="p-4 text-center shadow-soft">
              <div className="text-2xl font-bold text-accent">{totalCarbs}g</div>
              <div className="text-xs text-muted-foreground mt-1">Carbs</div>
            </Card>
            <Card className="p-4 text-center shadow-soft">
              <div className="text-2xl font-bold text-success">{totalFat}g</div>
              <div className="text-xs text-muted-foreground mt-1">Fat</div>
            </Card>
          </div>
        )}

        {/* Today's Logs */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Today's Log</h2>
            <Button
              size="sm"
              onClick={() => navigate("/log")}
              className="gradient-primary"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {logs.length === 0 ? (
            <Card className="p-8 text-center shadow-soft">
              <p className="text-muted-foreground mb-4">No entries yet today</p>
              <Button onClick={() => navigate("/log")} className="gradient-accent">
                <Plus className="h-4 w-4 mr-2" />
                Log Your First Meal
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <Card key={log.id} className="p-4 shadow-soft">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{getLogDisplayName(log)}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString("en-US", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        {log.quantityMultiplier !== 1 &&
                          ` • ${log.quantityMultiplier}x`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-semibold">{Math.round(log.calories)} kcal</div>
                        {prefs.showMacros && (
                          <div className="text-xs text-muted-foreground">
                            P:{Math.round(log.protein)} C:{Math.round(log.carbs)} F:
                            {Math.round(log.fat)}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteLog(log.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Today;
