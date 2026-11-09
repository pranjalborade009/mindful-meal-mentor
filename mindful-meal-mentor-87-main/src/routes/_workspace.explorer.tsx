import { createFileRoute } from "@tanstack/react-router";
import { Search, SearchX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/common";
import { FoodCard } from "@/components/food/FoodCard";
import { FilterSelect, SortSelect, useFoodFilter } from "@/components/food/FoodFilters";
import { foodDataService } from "@/services/food-data-service";
import { pageMeta } from "@/lib/seo";

export const Route = createFileRoute("/_workspace/explorer")({
  head: () => pageMeta("Food Explorer", "Search and filter foods by cuisine, diet, meal type, calories and protein."),
  component: ExplorerPage,
});

function ExplorerPage() {
  const foods = foodDataService.getExplorerFoods();
  const { f, setF, results, reset } = useFoodFilter(foods);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Discover" title="Food Explorer" description="Browse dishes, compare nutrition, and save foods you enjoy." />

      <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="surface h-fit space-y-5 p-5 lg:sticky lg:top-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} placeholder="Search dishes" className="h-10 rounded-full bg-background pl-9" aria-label="Search dishes" />
          </div>
          <FilterSelect value={f.cuisine} onChange={(v) => setF({ ...f, cuisine: v })} placeholder="Cuisines" options={foodDataService.getExplorerCuisines()} />
          <FilterSelect value={f.category} onChange={(v) => setF({ ...f, category: v })} placeholder="Categories" options={foodDataService.getExplorerCategories()} />
          <FilterSelect value={f.diet} onChange={(v) => setF({ ...f, diet: v })} placeholder="Diets" options={["Vegetarian", "Non-vegetarian", "Vegan"]} />
          <FilterSelect value={f.meal} onChange={(v) => setF({ ...f, meal: v })} placeholder="Meals" options={["Breakfast", "Lunch", "Dinner", "Snack"]} />
          <div>
            <Input value={f.allergens} onChange={(e) => setF({ ...f, allergens: e.target.value })} placeholder="Exclude allergens" className="h-10 rounded-full bg-card" aria-label="Allergens to exclude, comma separated" />
            <p className="mt-1.5 px-2 text-xs leading-relaxed text-muted-foreground">Foods without complete allergen data are excluded when you enter an allergen.</p>
          </div>
          <div>
            <p className="mb-3 flex justify-between text-sm text-forest"><span>Max calories / 100 g</span><span className="text-muted-foreground">{f.maxCal} kcal</span></p>
            <Slider min={200} max={700} step={10} value={[f.maxCal]} onValueChange={([v]) => setF({ ...f, maxCal: v ?? f.maxCal })} />
          </div>
          <div>
            <p className="mb-3 flex justify-between text-sm text-forest"><span>Min protein / 100 g</span><span className="text-muted-foreground">{f.minProtein} g</span></p>
            <Slider min={0} max={45} step={1} value={[f.minProtein]} onValueChange={([v]) => setF({ ...f, minProtein: v ?? 0 })} />
          </div>
          <Button variant="ghost" size="sm" onClick={reset} className="w-full">Reset filters</Button>
        </aside>

        <div>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm text-muted-foreground"><span className="font-semibold text-forest">{results.length}</span> of {foods.length} foods</p>
            <SortSelect value={f.sort} onChange={(v) => setF({ ...f, sort: v })} />
          </div>
          {results.length === 0 ? (
            <EmptyState icon={SearchX} title="No results" description="No prepared dishes match your search. Try another spelling or reset filters." action={<Button variant="outline" onClick={reset}>Reset filters</Button>} />
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{results.map((x) => <FoodCard key={x.id} food={x} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
