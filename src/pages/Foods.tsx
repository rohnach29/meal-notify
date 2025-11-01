import { useState, useEffect } from "react";
import { getFoods, saveFood } from "@/lib/storage";
import { Food } from "@/types";
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
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";

const Foods = () => {
  const [foods, setFoods] = useState<Food[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    brand: "",
    servingSize: "",
    calories: "",
    protein: "",
    carbs: "",
    fat: "",
  });

  useEffect(() => {
    loadFoods();
  }, []);

  const loadFoods = () => {
    setFoods(getFoods());
  };

  const handleOpenDialog = () => {
    setFormData({
      name: "",
      brand: "",
      servingSize: "",
      calories: "",
      protein: "",
      carbs: "",
      fat: "",
    });
    setIsDialogOpen(true);
  };

  const handleSaveFood = () => {
    if (!formData.name || !formData.servingSize) {
      toast.error("Please fill in at least name and serving size");
      return;
    }

    const newFood: Food = {
      id: crypto.randomUUID(),
      name: formData.name,
      brand: formData.brand || undefined,
      servingSize: formData.servingSize,
      calories: parseFloat(formData.calories) || 0,
      protein: parseFloat(formData.protein) || 0,
      carbs: parseFloat(formData.carbs) || 0,
      fat: parseFloat(formData.fat) || 0,
    };

    saveFood(newFood);
    loadFoods();
    setIsDialogOpen(false);
    toast.success(`Added ${newFood.name}`);
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
          <Button className="gradient-primary" onClick={handleOpenDialog}>
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
                <Button className="gradient-accent" onClick={handleOpenDialog}>
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

        {/* Add Food Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Food</DialogTitle>
              <DialogDescription>
                Enter the nutritional information for this food item.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Food Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Chicken Breast"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand (optional)</Label>
                <Input
                  id="brand"
                  placeholder="e.g., Generic"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="servingSize">Serving Size *</Label>
                <Input
                  id="servingSize"
                  placeholder="e.g., 100g"
                  value={formData.servingSize}
                  onChange={(e) => setFormData({ ...formData, servingSize: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="calories">Calories</Label>
                  <Input
                    id="calories"
                    type="number"
                    placeholder="0"
                    value={formData.calories}
                    onChange={(e) => setFormData({ ...formData, calories: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="protein">Protein (g)</Label>
                  <Input
                    id="protein"
                    type="number"
                    placeholder="0"
                    value={formData.protein}
                    onChange={(e) => setFormData({ ...formData, protein: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carbs">Carbs (g)</Label>
                  <Input
                    id="carbs"
                    type="number"
                    placeholder="0"
                    value={formData.carbs}
                    onChange={(e) => setFormData({ ...formData, carbs: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fat">Fat (g)</Label>
                  <Input
                    id="fat"
                    type="number"
                    placeholder="0"
                    value={formData.fat}
                    onChange={(e) => setFormData({ ...formData, fat: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="gradient-primary" onClick={handleSaveFood}>
                Save Food
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Foods;
