import { useState, useEffect } from "react";
import { getMeals, getFoods, saveLog, saveMeal, saveFood } from "@/lib/storage";
import { Meal, Food, LogEntry } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const Log = () => {
  const navigate = useNavigate();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const allMeals = getMeals().sort((a, b) => {
      const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
      const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
      return bTime - aTime;
    });
    setMeals(allMeals);

    const allFoods = getFoods().sort((a, b) => {
      const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
      const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
      return bTime - aTime;
    });
    setFoods(allFoods);
  };

  const handleLogMeal = (meal: Meal) => {
    const now = new Date();
    const log: LogEntry = {
      id: crypto.randomUUID(),
      date: now.toISOString().split("T")[0],
      timestamp: now,
      type: "meal",
      mealId: meal.id,
      quantityMultiplier: 1,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
    };

    saveLog(log);
    
    // Update last used
    saveMeal({ ...meal, lastUsed: now });
    
    toast.success(`Logged ${meal.name}`);
    navigate("/");
  };

  const handleLogFood = (food: Food) => {
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
    
    // Update last used
    saveFood({ ...food, lastUsed: now });
    
    toast.success(`Logged ${food.name}`);
    navigate("/");
  };

  const filteredMeals = meals.filter((meal) =>
    meal.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFoods = foods.filter((food) =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentMeals = meals.slice(0, 5);

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-3xl font-bold mb-6">Quick Log</h1>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meals or foods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs defaultValue="recent" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="recent">Recent</TabsTrigger>
            <TabsTrigger value="meals">Meals</TabsTrigger>
            <TabsTrigger value="foods">Foods</TabsTrigger>
          </TabsList>

          <TabsContent value="recent" className="space-y-3">
            {recentMeals.length === 0 ? (
              <Card className="p-8 text-center shadow-soft">
                <p className="text-muted-foreground mb-4">No recent meals</p>
                <Button onClick={() => navigate("/meals")} className="gradient-primary">
                  Create Your First Meal
                </Button>
              </Card>
            ) : (
              recentMeals.map((meal) => (
                <Card
                  key={meal.id}
                  className="p-4 shadow-soft cursor-pointer hover:shadow-medium transition-smooth"
                  onClick={() => handleLogMeal(meal)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{meal.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {meal.items.length} items
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{Math.round(meal.calories)} kcal</div>
                      <div className="text-xs text-muted-foreground">
                        P:{Math.round(meal.protein)} C:{Math.round(meal.carbs)} F:
                        {Math.round(meal.fat)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="meals" className="space-y-3">
            {filteredMeals.length === 0 ? (
              <Card className="p-8 text-center shadow-soft">
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "No meals found" : "No meals yet"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => navigate("/meals")} className="gradient-primary">
                    Create a Meal
                  </Button>
                )}
              </Card>
            ) : (
              filteredMeals.map((meal) => (
                <Card
                  key={meal.id}
                  className="p-4 shadow-soft cursor-pointer hover:shadow-medium transition-smooth"
                  onClick={() => handleLogMeal(meal)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{meal.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {meal.items.length} items
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{Math.round(meal.calories)} kcal</div>
                      <div className="text-xs text-muted-foreground">
                        P:{Math.round(meal.protein)} C:{Math.round(meal.carbs)} F:
                        {Math.round(meal.fat)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="foods" className="space-y-3">
            {filteredFoods.length === 0 ? (
              <Card className="p-8 text-center shadow-soft">
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? "No foods found" : "No foods yet"}
                </p>
                {!searchQuery && (
                  <Button onClick={() => navigate("/foods")} className="gradient-primary">
                    Add a Food
                  </Button>
                )}
              </Card>
            ) : (
              filteredFoods.map((food) => (
                <Card
                  key={food.id}
                  className="p-4 shadow-soft cursor-pointer hover:shadow-medium transition-smooth"
                  onClick={() => handleLogFood(food)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{food.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {food.servingSize}
                        {food.brand && ` • ${food.brand}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{Math.round(food.calories)} kcal</div>
                      <div className="text-xs text-muted-foreground">
                        P:{Math.round(food.protein)} C:{Math.round(food.carbs)} F:
                        {Math.round(food.fat)}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Log;
