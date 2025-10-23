import { useState, useEffect } from "react";
import { getMeals } from "@/lib/storage";
import { Meal } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

const Meals = () => {
  const [meals, setMeals] = useState<Meal[]>([]);

  useEffect(() => {
    loadMeals();
  }, []);

  const loadMeals = () => {
    setMeals(getMeals());
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Meals</h1>
          <Button className="gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            New Meal
          </Button>
        </div>

        {meals.length === 0 ? (
          <Card className="p-8 text-center shadow-soft">
            <p className="text-muted-foreground mb-4">No meals yet</p>
            <p className="text-sm text-muted-foreground mb-6">
              Create meal combos for quick logging
            </p>
            <Button className="gradient-accent">
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Meal
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {meals.map((meal) => (
              <Card key={meal.id} className="p-4 shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium text-lg">{meal.name}</div>
                  <div className="font-semibold text-primary">
                    {Math.round(meal.calories)} kcal
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {meal.items.length} items
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
                    P: {Math.round(meal.protein)}g
                  </span>
                  <span className="px-2 py-1 rounded-full bg-accent/10 text-accent">
                    C: {Math.round(meal.carbs)}g
                  </span>
                  <span className="px-2 py-1 rounded-full bg-success/10 text-success">
                    F: {Math.round(meal.fat)}g
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Meals;
