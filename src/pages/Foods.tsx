import { useState, useEffect } from "react";
import { getFoods } from "@/lib/storage";
import { Food } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";

const Foods = () => {
  const [foods, setFoods] = useState<Food[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadFoods();
  }, []);

  const loadFoods = () => {
    setFoods(getFoods());
  };

  const filteredFoods = foods.filter(
    (food) =>
      food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      food.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Foods</h1>
          <Button className="gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Food
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search foods..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {filteredFoods.length === 0 ? (
          <Card className="p-8 text-center shadow-soft">
            <p className="text-muted-foreground mb-4">
              {searchQuery ? "No foods found" : "No foods yet"}
            </p>
            {!searchQuery && (
              <>
                <p className="text-sm text-muted-foreground mb-6">
                  Add foods to start tracking
                </p>
                <Button className="gradient-accent">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Food
                </Button>
              </>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredFoods.map((food) => (
              <Card key={food.id} className="p-4 shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="font-medium">{food.name}</div>
                    {food.brand && (
                      <div className="text-sm text-muted-foreground">{food.brand}</div>
                    )}
                  </div>
                  <div className="font-semibold text-primary">
                    {Math.round(food.calories)} kcal
                  </div>
                </div>
                <div className="text-sm text-muted-foreground mb-2">
                  {food.servingSize}
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary">
                    P: {Math.round(food.protein)}g
                  </span>
                  <span className="px-2 py-1 rounded-full bg-accent/10 text-accent">
                    C: {Math.round(food.carbs)}g
                  </span>
                  <span className="px-2 py-1 rounded-full bg-success/10 text-success">
                    F: {Math.round(food.fat)}g
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

export default Foods;
