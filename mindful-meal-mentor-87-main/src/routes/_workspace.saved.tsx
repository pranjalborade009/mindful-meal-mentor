import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/common";
import { FoodCard } from "@/components/food/FoodCard";
import { foodDataService } from "@/services/food-data-service";
import { useSavedFoods } from "@/hooks/use-saved-foods";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_workspace/saved")({
  head: () => pageMeta("Saved Foods", "Foods saved during your current session."),
  component: SavedPage,
});

function SavedPage() {
  const { saved, remove } = useSavedFoods();
  const foods = saved.map((id) => foodDataService.getById(id)).filter((f) => f !== undefined);
  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Collection" title="Saved Foods" description={`${foods.length} saved ${foods.length === 1 ? "food" : "foods"} · saved for this session only`} />
      {foods.length === 0 ? (
        <EmptyState icon={Bookmark} title="Nothing saved yet" description="Save foods from the explorer to build your collection." action={<Button variant="forest" asChild><Link to="/explorer">Open Food Explorer</Link></Button>} />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {foods.map((f) => <FoodCard key={f.id} food={f} onRemove={() => { remove(f.id); toast(`${f.name} removed`); }} />)}
        </div>
      )}
    </div>
  );
}
