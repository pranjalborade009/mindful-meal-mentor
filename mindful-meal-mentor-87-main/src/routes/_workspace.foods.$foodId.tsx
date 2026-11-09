import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Bookmark, BookmarkCheck, Leaf } from "lucide-react";
import { Pie, PieChart, ResponsiveContainer, Cell } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FoodImage, FoodImageCredit } from "@/components/food/FoodCard";
import { foodDataService } from "@/services/food-data-service";
import { useSavedFoods } from "@/hooks/use-saved-foods";
import { calculatePortionNutrition, formatNutrient } from "@/lib/portion-calculations";

export const Route = createFileRoute("/_workspace/foods/$foodId")({
  loader: ({ params }) => {
    const food = foodDataService.getById(params.foodId);
    if (!food) throw notFound();
    return { food };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ title: "Food not found — NUTRIFY" }, { name: "robots", content: "noindex" }] };
    const d = `${loaderData.food.name}: ${formatNutrient(loaderData.food.nutrition.caloriesKcal, " kcal")}, ${formatNutrient(loaderData.food.nutrition.proteinG, " g protein")}. Nutrition details on NUTRIFY.`;
    return { meta: [{ title: `${loaderData.food.name} — NUTRIFY` }, { name: "description", content: d }, { property: "og:title", content: `${loaderData.food.name} — NUTRIFY` }, { property: "og:description", content: d }] };
  },
  notFoundComponent: FoodNotFound,
  component: FoodDetails,
});

function FoodNotFound() {
  return (
    <div className="py-20 text-center">
      <h1 className="font-display text-3xl">Food not found</h1>
      <Button variant="outline" className="mt-6" asChild><Link to="/explorer">Back to Food Explorer</Link></Button>
    </div>
  );
}

function FoodDetails() {
  const { food } = Route.useLoaderData();
  const { isSaved, toggle } = useSavedFoods();
  const portionOptions = [food.nutrition.servingSize, ...(food.servingOptions ?? [])];
  const [portionQuantity, setPortionQuantity] = useState(String(food.nutrition.servingSize.quantity));
  const [portionOptionIndex, setPortionOptionIndex] = useState("0");
  useEffect(() => {
    setPortionOptionIndex("0");
    setPortionQuantity(String(food.nutrition.servingSize.quantity));
  }, [food.id, food.nutrition.servingSize.quantity]);
  const saved = isSaved(food.id);
  const nutrition = food.nutrition;
  const selectedServing = portionOptions[Number(portionOptionIndex)] ?? nutrition.servingSize;
  const selectedQuantity = Number(portionQuantity);
  const selectedNutrition = calculatePortionNutrition(nutrition, {
    ...selectedServing,
    quantity: selectedQuantity,
    ...(selectedServing.weightGrams !== undefined && Number.isFinite(selectedQuantity) && selectedServing.quantity > 0
      ? { weightGrams: selectedServing.weightGrams * selectedQuantity / selectedServing.quantity }
      : {}),
  });
  const displayedNutrition = selectedNutrition.nutrition;
  const macros = [
    { name: "Protein", value: displayedNutrition.proteinG === null ? null : displayedNutrition.proteinG * 4, color: "var(--color-chart-1)" },
    { name: "Carbs", value: displayedNutrition.carbohydrateG === null ? null : displayedNutrition.carbohydrateG * 4, color: "var(--color-chart-2)" },
    { name: "Fat", value: displayedNutrition.fatG === null ? null : displayedNutrition.fatG * 9, color: "var(--color-chart-3)" },
  ];
  const chartMacros = macros.filter((macro): macro is typeof macro & { value: number } => macro.value !== null);
  const nutritionRows: [string, number | null, string][] = [
    ["Calories", displayedNutrition.caloriesKcal, " kcal"],
    ["Protein", displayedNutrition.proteinG, " g"],
    ["Carbohydrates", displayedNutrition.carbohydrateG, " g"],
    ["Fat", displayedNutrition.fatG, " g"],
    ["Fibre", displayedNutrition.fiberG, " g"],
  ];
  const categoryLabel = {
    dish: "Prepared dish",
    ingredient: "Ingredient",
    beverage: "Beverage",
    snack: "Snack",
    other: "Other food",
  }[food.category];
  const allergenLabel = food.allergenDataStatus === "complete"
    ? (food.allergens?.length ? food.allergens.join(", ") : "No listed allergens")
    : food.allergens?.length
      ? `Listed allergens: ${food.allergens.join(", ")} (other allergens may be missing)`
      : "Allergen information unavailable";
  return (
    <div>
      <Link to="/explorer" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-forest"><ArrowLeft className="size-4" /> Back to Food Explorer</Link>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-[2rem] border bg-muted">
            <FoodImage food={food} className="aspect-[5/4]" />
          </div>
          <FoodImageCredit food={food} />
        </div>
        <div>
          <div className="flex flex-wrap gap-2">
            {(food.cuisine !== "Unspecified" ? food.cuisine : food.regionalOrigin) && <span className="rounded-full bg-sage px-3 py-1 text-xs text-forest">{food.cuisine !== "Unspecified" ? food.cuisine : food.regionalOrigin}</span>}
            <span className="rounded-full bg-sage px-3 py-1 text-xs text-forest">{categoryLabel}</span>
            {food.meal && <span className="rounded-full bg-sage px-3 py-1 text-xs text-forest">{food.meal}</span>}
            {food.dietaryLabels.map((label) => <span key={label} className="inline-flex items-center gap-1 rounded-full bg-lime px-3 py-1 text-xs text-lime-foreground"><Leaf className="size-3" />{label}</span>)}
          </div>
          <h1 className="mt-4 font-display text-5xl leading-tight">{food.name}</h1>

          <section className="mt-6 border-y py-5" aria-labelledby="nutrition-heading">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="nutrition-heading" className="text-base font-semibold text-forest">Nutrition per portion</h2>
                <p className="mt-1 text-xs text-muted-foreground">Reference: {nutrition.basis === "per-100g" ? "per 100 g" : "per serving"}</p>
              </div>
              {portionOptions.length > 1 && (
                <label className="grid gap-1 text-xs text-muted-foreground">
                  Standard portion
                  <select value={portionOptionIndex} onChange={(event) => {
                    const nextIndex = Number(event.target.value);
                    const option = portionOptions[nextIndex];
                    if (option) {
                      setPortionOptionIndex(event.target.value);
                      setPortionQuantity(String(option.quantity));
                    }
                  }} className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground">
                    {portionOptions.map((option, index) => <option key={`${option.description ?? option.unit}-${index}`} value={index}>{option.description ?? `${option.quantity} ${option.unit}`}</option>)}
                  </select>
                </label>
              )}
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Portion
                <Input type="number" min="0.1" step="0.1" value={portionQuantity} onChange={(event) => setPortionQuantity(event.target.value)} aria-label={`Selected portion in ${selectedServing.unit}`} className="h-9 w-24 bg-card" />
                {selectedServing.unit}
              </label>
            </div>
            {selectedNutrition.note && <p className="mt-3 text-xs text-muted-foreground">{selectedNutrition.note}</p>}
            <div className="mt-4 grid grid-cols-[140px_1fr] items-center gap-6">
              {chartMacros.length === 3 ? (
                <div className="h-36">
                  <ResponsiveContainer><PieChart><Pie data={chartMacros} dataKey="value" innerRadius={42} outerRadius={64} paddingAngle={2} stroke="none">{chartMacros.map((macro) => <Cell key={macro.name} fill={macro.color} />)}</Pie></PieChart></ResponsiveContainer>
                </div>
              ) : <p className="text-center text-xs text-muted-foreground">Macro chart unavailable</p>}
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {nutritionRows.map(([label, value, unit]) => (
                  <div key={label} className="border-b pb-2"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="font-semibold text-forest">{formatNutrient(value, unit)}</dd></div>
                ))}
                {Object.entries(displayedNutrition.micronutrients ?? {}).map(([name, value]) => (
                  <div key={name} className="border-b pb-2"><dt className="text-xs capitalize text-muted-foreground">{name}</dt><dd className="font-semibold text-forest">{formatNutrient(value.value, ` ${value.unit}`)}</dd></div>
                ))}
              </dl>
            </div>
          </section>

          <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Allergen information</p>
              <p className="font-medium text-forest">{allergenLabel}</p>
            </div>
          </div>

          {food.ingredients && (
            <div className="mt-6">
              <p className="text-sm font-semibold text-forest">Ingredients</p>
              <div className="mt-2 flex flex-wrap gap-2">{food.ingredients.map((i) => <span key={i} className="rounded-full border bg-card px-3 py-1 text-xs">{i}</span>)}</div>
            </div>
          )}

          {food.preparationMethod && <div className="mt-5"><p className="text-sm font-semibold text-forest">Preparation</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{food.preparationMethod}</p></div>}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button variant={saved ? "lime" : "forest"} size="lg" onClick={() => toggle(food.id)}>{saved ? <BookmarkCheck /> : <Bookmark />} {saved ? "Saved" : "Save Food"}</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
