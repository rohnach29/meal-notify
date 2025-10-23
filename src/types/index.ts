export interface Food {
  id: string;
  name: string;
  brand?: string;
  servingSize: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  lastUsed?: Date;
}

export interface MealItem {
  foodId: string;
  quantityMultiplier: number;
}

export interface Meal {
  id: string;
  name: string;
  items: MealItem[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  lastUsed?: Date;
}

export interface LogEntry {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: Date;
  type: "meal" | "food";
  mealId?: string;
  foodId?: string;
  quantityMultiplier: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface UserPreferences {
  dailyCalorieTarget: number;
  notificationTimes: string[]; // ["11:00", "15:00", "20:00"]
  showMacros: boolean;
  notificationsEnabled: boolean;
}
