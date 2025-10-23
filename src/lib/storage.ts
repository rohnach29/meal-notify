import { Food, Meal, LogEntry, UserPreferences } from "@/types";

const STORAGE_KEYS = {
  FOODS: "calorie-tracker-foods",
  MEALS: "calorie-tracker-meals",
  LOGS: "calorie-tracker-logs",
  PREFS: "calorie-tracker-prefs",
};

const DEFAULT_PREFS: UserPreferences = {
  dailyCalorieTarget: 2000,
  notificationTimes: ["11:00", "15:00", "20:00"],
  showMacros: true,
  notificationsEnabled: false,
};

// Foods
export const getFoods = (): Food[] => {
  const data = localStorage.getItem(STORAGE_KEYS.FOODS);
  return data ? JSON.parse(data) : [];
};

export const saveFood = (food: Food): void => {
  const foods = getFoods();
  const index = foods.findIndex((f) => f.id === food.id);
  if (index >= 0) {
    foods[index] = food;
  } else {
    foods.push(food);
  }
  localStorage.setItem(STORAGE_KEYS.FOODS, JSON.stringify(foods));
};

export const deleteFood = (id: string): void => {
  const foods = getFoods().filter((f) => f.id !== id);
  localStorage.setItem(STORAGE_KEYS.FOODS, JSON.stringify(foods));
};

// Meals
export const getMeals = (): Meal[] => {
  const data = localStorage.getItem(STORAGE_KEYS.MEALS);
  return data ? JSON.parse(data) : [];
};

export const saveMeal = (meal: Meal): void => {
  const meals = getMeals();
  const index = meals.findIndex((m) => m.id === meal.id);
  if (index >= 0) {
    meals[index] = meal;
  } else {
    meals.push(meal);
  }
  localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
};

export const deleteMeal = (id: string): void => {
  const meals = getMeals().filter((m) => m.id !== id);
  localStorage.setItem(STORAGE_KEYS.MEALS, JSON.stringify(meals));
};

// Log Entries
export const getLogs = (): LogEntry[] => {
  const data = localStorage.getItem(STORAGE_KEYS.LOGS);
  const logs = data ? JSON.parse(data) : [];
  return logs.map((log: any) => ({
    ...log,
    timestamp: new Date(log.timestamp),
  }));
};

export const getTodayLogs = (): LogEntry[] => {
  const today = new Date().toISOString().split("T")[0];
  return getLogs().filter((log) => log.date === today);
};

export const saveLog = (log: LogEntry): void => {
  const logs = getLogs();
  logs.push(log);
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
};

export const updateLog = (log: LogEntry): void => {
  const logs = getLogs();
  const index = logs.findIndex((l) => l.id === log.id);
  if (index >= 0) {
    logs[index] = log;
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  }
};

export const deleteLog = (id: string): void => {
  const logs = getLogs().filter((l) => l.id !== id);
  localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
};

// Preferences
export const getPreferences = (): UserPreferences => {
  const data = localStorage.getItem(STORAGE_KEYS.PREFS);
  return data ? JSON.parse(data) : DEFAULT_PREFS;
};

export const savePreferences = (prefs: UserPreferences): void => {
  localStorage.setItem(STORAGE_KEYS.PREFS, JSON.stringify(prefs));
};

// Seed data
export const seedInitialData = (): void => {
  if (getFoods().length === 0) {
    const sampleFoods: Food[] = [
      {
        id: "1",
        name: "Chicken Breast",
        servingSize: "100g",
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
      },
      {
        id: "2",
        name: "Brown Rice",
        servingSize: "1 cup cooked",
        calories: 218,
        protein: 5,
        carbs: 46,
        fat: 1.6,
      },
      {
        id: "3",
        name: "Greek Yogurt",
        servingSize: "170g",
        calories: 100,
        protein: 17,
        carbs: 6,
        fat: 0.7,
      },
      {
        id: "4",
        name: "Banana",
        servingSize: "1 medium",
        calories: 105,
        protein: 1.3,
        carbs: 27,
        fat: 0.4,
      },
      {
        id: "5",
        name: "Almonds",
        servingSize: "28g (about 23 almonds)",
        calories: 164,
        protein: 6,
        carbs: 6,
        fat: 14,
      },
    ];
    sampleFoods.forEach(saveFood);

    const sampleMeals: Meal[] = [
      {
        id: "1",
        name: "Chicken & Rice Bowl",
        items: [
          { foodId: "1", quantityMultiplier: 1.5 },
          { foodId: "2", quantityMultiplier: 1 },
        ],
        calories: 465,
        protein: 51.5,
        carbs: 46,
        fat: 7,
      },
      {
        id: "2",
        name: "Yogurt & Banana Snack",
        items: [
          { foodId: "3", quantityMultiplier: 1 },
          { foodId: "4", quantityMultiplier: 1 },
        ],
        calories: 205,
        protein: 18.3,
        carbs: 33,
        fat: 1.1,
      },
    ];
    sampleMeals.forEach(saveMeal);
  }
};
