import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import { BottomNav } from "@/components/BottomNav";
import { seedInitialData } from "@/lib/storage";
import { registerServiceWorker, setupServiceWorkerMessageListener } from "@/lib/serviceWorker";
import { getFoods, saveFood, saveLog } from "@/lib/storage";
import { Food, LogEntry } from "@/types";
import { toast } from "sonner";
import Today from "./pages/Today";
import Log from "./pages/Log";
import Meals from "./pages/Meals";
import Foods from "./pages/Foods";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to handle notification-based food logging
const NotificationHandler = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    // Handle food logging from notification URL param
    const logFoodId = searchParams.get("logFood");
    if (logFoodId) {
      handleLogFoodFromNotification(logFoodId);
      // Remove the query param from URL
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams]);

  const handleLogFoodFromNotification = (foodId: string) => {
    const foods = getFoods();
    const food = foods.find((f) => f.id === foodId);
    
    if (!food) {
      toast.error("Food not found");
      return;
    }

    const now = new Date();
    const log: LogEntry = {
      id: crypto.randomUUID(),
      date: now.toISOString().split("T")[0],
      timestamp: now,
      type: "food",
      foodId: food.id,
      quantityMultiplier: 1,
      calories: food.calories,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    };

    saveLog(log);
    saveFood({ ...food, lastUsed: now });
    toast.success(`Logged ${food.name} from notification!`);
    
    // Navigate to today page to show updated log
    navigate("/");
  };

  // Set up service worker message listener
  useEffect(() => {
    setupServiceWorkerMessageListener(
      (foodId: string) => {
        handleLogFoodFromNotification(foodId);
      },
      () => {
        navigate("/log");
      }
    );
  }, [navigate]);

  return null;
};

const App = () => {
  useEffect(() => {
    seedInitialData();
    
    // Register service worker
    if ("serviceWorker" in navigator) {
      registerServiceWorker().catch((error) => {
        console.error("Service Worker registration error:", error);
      });
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-center" />
        <BrowserRouter>
          <NotificationHandler />
          <Routes>
            <Route path="/" element={<Today />} />
            <Route path="/log" element={<Log />} />
            <Route path="/meals" element={<Meals />} />
            <Route path="/foods" element={<Foods />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <BottomNav />
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
