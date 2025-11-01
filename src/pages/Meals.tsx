import { useState, useEffect } from "react";
import { getMeals, saveMeal, getFoods } from "@/lib/storage";
import { Meal, MealItem, Food } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, X } from "lucide-react";
import { toast } from "sonner";

const Meals = () => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [mealName, setMealName] = useState("");
  const [selectedFoods, setSelectedFoods] = useState<Array<{ foodId: string; quantity: number }>>([]);
  const [foods, setFoods] = useState<Food[]>([]);

  useEffect(() => {
    loadMeals();
    loadFoods();
  }, []);

  const loadMeals = () => {
    setMeals(getMeals());
  };

  const loadFoods = () => {
    setFoods(getFoods());
  };

  const handleOpenDialog = () => {
    setMealName("");
    setSelectedFoods([]);
    setIsDialogOpen(true);
  };

  const handleAddFoodToMeal = () => {
    if (foods.length === 0) {
      toast.error("Please add some foods first!");
      return;
    }
    setSelectedFoods([...selectedFoods, { foodId: foods[0].id, quantity: 1 }]);
  };

  const handleRemoveFoodFromMeal = (index: number) => {
    setSelectedFoods(selectedFoods.filter((_, i) => i !== index));
  };

  const handleFoodChange = (index: number, foodId: string) => {
    const updated = [...selectedFoods];
    updated[index].foodId = foodId;
    setSelectedFoods(updated);
  };

  const handleQuantityChange = (index: number, quantity: number) => {
    const updated = [...selectedFoods];
    updated[index].quantity = quantity;
    setSelectedFoods(updated);
  };

  const calculateMealTotals = () => {
    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    selectedFoods.forEach((item) => {
      const food = foods.find((f) => f.id === item.foodId);
      if (food) {
        const multiplier = item.quantity;
        calories += food.calories * multiplier;
        protein += food.protein * multiplier;
        carbs += food.carbs * multiplier;
        fat += food.fat * multiplier;
      }
    });

    return { calories, protein, carbs, fat };
  };

  const handleSaveMeal = () => {
    if (!mealName.trim()) {
      toast.error("Please enter a meal name");
      return;
    }

    if (selectedFoods.length === 0) {
      toast.error("Please add at least one food to the meal");
      return;
    }

    const totals = calculateMealTotals();
    const mealItems: MealItem[] = selectedFoods.map((item) => ({
      foodId: item.foodId,
      quantityMultiplier: item.quantity,
    }));

    const newMeal: Meal = {
      id: crypto.randomUUID(),
      name: mealName.trim(),
      items: mealItems,
      calories: totals.calories,
      protein: totals.protein,
      carbs: totals.carbs,
      fat: totals.fat,
    };

    saveMeal(newMeal);
    loadMeals();
    setIsDialogOpen(false);
    toast.success(`Created meal: ${newMeal.name}`);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Meals</h1>
          <Button className="gradient-primary" onClick={handleOpenDialog}>
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
            <Button className="gradient-accent" onClick={handleOpenDialog}>
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

        {/* New Meal Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Meal</DialogTitle>
              <DialogDescription>
                Combine multiple foods into a meal for quick logging.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="mealName">Meal Name *</Label>
                <Input
                  id="mealName"
                  placeholder="e.g., Chicken & Rice Bowl"
                  value={mealName}
                  onChange={(e) => setMealName(e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Foods</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddFoodToMeal}
                    disabled={foods.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Food
                  </Button>
                </div>

                {foods.length === 0 && (
                  <Card className="p-4 bg-muted">
                    <p className="text-sm text-muted-foreground text-center">
                      No foods available. Add foods first in the Foods page.
                    </p>
                  </Card>
                )}

                {selectedFoods.map((item, index) => {
                  const selectedFood = foods.find((f) => f.id === item.foodId);
                  return (
                    <Card key={index} className="p-3">
                      <div className="flex items-center gap-2">
                        <select
                          className="flex-1 px-3 py-2 border rounded-md text-sm"
                          value={item.foodId}
                          onChange={(e) => handleFoodChange(index, e.target.value)}
                        >
                          {foods.map((food) => (
                            <option key={food.id} value={food.id}>
                              {food.name}
                            </option>
                          ))}
                        </select>
                        <Input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={item.quantity}
                          onChange={(e) =>
                            handleQuantityChange(index, parseFloat(e.target.value) || 1)
                          }
                          className="w-20"
                          placeholder="1"
                        />
                        <span className="text-sm text-muted-foreground">
                          {selectedFood ? `${Math.round(selectedFood.calories * item.quantity)} kcal` : ""}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveFoodFromMeal(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Card>
                  );
                })}

                {selectedFoods.length > 0 && (
                  <Card className="p-4 bg-primary/10">
                    <div className="space-y-1">
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span>{Math.round(calculateMealTotals().calories)} kcal</span>
                      </div>
                      <div className="flex gap-4 text-xs text-muted-foreground">
                        <span>P: {Math.round(calculateMealTotals().protein)}g</span>
                        <span>C: {Math.round(calculateMealTotals().carbs)}g</span>
                        <span>F: {Math.round(calculateMealTotals().fat)}g</span>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                className="gradient-primary"
                onClick={handleSaveMeal}
                disabled={selectedFoods.length === 0 || !mealName.trim()}
              >
                Save Meal
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Meals;
