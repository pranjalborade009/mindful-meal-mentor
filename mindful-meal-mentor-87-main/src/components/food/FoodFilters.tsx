import { useMemo, useState } from "react";
import type { Food, FoodCategory } from "@/types";
import { filterFoods, getFoodNutritionPer100g } from "@/services/food-data-service";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SortKey = "name-asc" | "calories-asc" | "protein-desc" | "price-asc";

export interface FilterState {
  q: string; cuisine: string; category: string; diet: string; meal: string; allergens: string; maxCal: number; minProtein: number; sort: SortKey;
}

export const defaultFilters: FilterState = { q: "", cuisine: "all", category: "all", diet: "all", meal: "all", allergens: "", maxCal: 700, minProtein: 0, sort: "name-asc" };

export function sortFoodResults(foods: Food[], sort: SortKey): Food[] {
  const sorted = [...foods];
  if (sort === "name-asc") sorted.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === "calories-asc") sorted.sort((a, b) => (getFoodNutritionPer100g(a).caloriesKcal ?? Infinity) - (getFoodNutritionPer100g(b).caloriesKcal ?? Infinity));
  if (sort === "protein-desc") sorted.sort((a, b) => (getFoodNutritionPer100g(b).proteinG ?? -Infinity) - (getFoodNutritionPer100g(a).proteinG ?? -Infinity));
  if (sort === "price-asc") sorted.sort((a, b) => (a.priceInr ?? Infinity) - (b.priceInr ?? Infinity));
  return sorted;
}

/** Local filtering over the curated, source-backed Food Explorer catalogue. */
export function useFoodFilter(foods: Food[]) {
  const [f, setF] = useState<FilterState>(defaultFilters);
  const results = useMemo(() => {
    const r = filterFoods(foods, {
      query: f.q,
      cuisine: f.cuisine,
      category: f.category === "all" ? "all" : f.category as FoodCategory,
      diet: f.diet,
      meal: f.meal,
      ...(f.maxCal < 700 ? { maxCalories: f.maxCal } : {}),
      ...(f.minProtein > 0 ? { minProtein: f.minProtein } : {}),
      allergensToAvoid: f.allergens.split(","),
    });
    return sortFoodResults(r, f.sort);
  }, [foods, f]);
  return { f, setF, results, reset: () => setF({ ...defaultFilters }) };
}

export function FilterSelect({ value, onChange, placeholder, options }: { value: string; onChange: (v: string) => void; placeholder: string; options: string[] }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-10 rounded-full bg-card" aria-label={placeholder}><SelectValue placeholder={placeholder} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {placeholder.toLowerCase()}</SelectItem>
        {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

export function SortSelect({ value, onChange }: { value: SortKey; onChange: (v: SortKey) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortKey)}>
      <SelectTrigger className="h-10 w-[190px] rounded-full bg-card" aria-label="Sort"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="name-asc">Name: A to Z</SelectItem>
        <SelectItem value="calories-asc">Calories per 100 g: low to high</SelectItem>
        <SelectItem value="protein-desc">Protein per 100 g: high to low</SelectItem>
        <SelectItem value="price-asc">Price: low to high</SelectItem>
      </SelectContent>
    </Select>
  );
}
