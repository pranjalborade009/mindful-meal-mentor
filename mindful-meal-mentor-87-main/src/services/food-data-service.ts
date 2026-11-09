import { demoFoods } from "@/data/demoFoods";
import { usdaFoundationFoods } from "@/data/usdaFoundationFoods";
import { usdaFnddsFoods } from "@/data/usdaFnddsFoods";
import { verifiedFoodImageMappings } from "@/data/verifiedFoodImageMappings";
import { curatedExplorerDishes } from "@/data/curatedExplorerDishes";
import { calculatePortionNutrition } from "@/lib/portion-calculations";
import type { Food, FoodCategory } from "@/types";

const catalogueFoods = [...demoFoods, ...usdaFoundationFoods, ...usdaFnddsFoods].map((food) => {
  const image = verifiedFoodImageMappings[food.id];
  const curatedDish = curatedExplorerDishes.find((dish) => dish.id === food.id);
  return {
    ...food,
    ...(image ?? {}),
    ...(curatedDish
      ? {
          name: curatedDish.name,
          alternativeNames: [...new Set([...(food.alternativeNames ?? []), ...curatedDish.alternativeNames])],
          cuisine: curatedDish.cuisine,
        }
      : {}),
  };
});

const explorerFoods = curatedExplorerDishes.flatMap((dish) => {
  const food = catalogueFoods.find((candidate) => candidate.id === dish.id);
  return food ? [food] : [];
});

export function normalizeFoodSearchTerm(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export interface FoodSearchFilters {
  query?: string;
  cuisine?: string;
  category?: FoodCategory | "all";
  diet?: string;
  meal?: string;
  maxCalories?: number;
  minProtein?: number;
  allergensToAvoid?: string[];
}

/** Explorer numeric filters/sorts compare a common 100 g basis across catalogue records. */
export function getFoodNutritionPer100g(food: Food) {
  if (food.nutrition.basis === "per-100g") return food.nutrition;
  return calculatePortionNutrition(food.nutrition, { quantity: 100, unit: "g" }).nutrition;
}

export function isFoodAllowedForRestrictions(
  food: Food,
  restrictions: { dietaryLabels?: string[]; allergens?: string[] },
): boolean {
  if (restrictions.dietaryLabels?.some((label) => !food.dietaryLabels.includes(label))) return false;

  const allergens = restrictions.allergens?.map((allergen) => allergen.trim().toLocaleLowerCase()).filter(Boolean) ?? [];
  if (allergens.length) {
    if (food.allergenDataStatus !== "complete" || food.allergens === null) return false;
    const knownAllergens = food.allergens.map((allergen) => allergen.toLocaleLowerCase());
    if (allergens.some((allergen) => knownAllergens.some((known) => known.includes(allergen) || allergen.includes(known)))) return false;
  }

  return true;
}

export function filterFoods(foods: Food[], filters: FoodSearchFilters): Food[] {
  const query = normalizeFoodSearchTerm(filters.query ?? "");
  const filtered = foods.filter((food) => {
    const textMatches = !query || [food.name, ...(food.alternativeNames ?? [])]
      .some((term) => normalizeFoodSearchTerm(term).includes(query));
    const per100g = getFoodNutritionPer100g(food);
    const matchesNutrition = (filters.maxCalories === undefined || (per100g.caloriesKcal !== null && per100g.caloriesKcal <= filters.maxCalories)) &&
      (filters.minProtein === undefined || (per100g.proteinG !== null && per100g.proteinG >= filters.minProtein));

    return textMatches &&
      (!filters.cuisine || filters.cuisine === "all" || food.cuisine === filters.cuisine || food.regionalOrigin === filters.cuisine) &&
      (!filters.category || filters.category === "all" || food.category === filters.category) &&
      (!filters.diet || filters.diet === "all" || food.dietaryLabels.includes(filters.diet)) &&
      (!filters.meal || filters.meal === "all" || food.meal === filters.meal) &&
      matchesNutrition &&
      isFoodAllowedForRestrictions(food, filters.allergensToAvoid ? { allergens: filters.allergensToAvoid } : {});
  });

  return filtered;
}

/** Frontend data boundary; replace this adapter with the FastAPI client later. */
export const foodDataService = {
  getAll(): Food[] {
    return catalogueFoods;
  },
  getExplorerFoods(): Food[] {
    return explorerFoods;
  },
  getById(id: string): Food | undefined {
    return catalogueFoods.find((food) => food.id === id);
  },
  getCuisines(): string[] {
    return [...new Set(catalogueFoods.flatMap((food) => [
      ...(food.cuisine !== "Unspecified" ? [food.cuisine] : []),
      ...(food.regionalOrigin ? [food.regionalOrigin] : []),
    ]))].sort();
  },
  getCategories(): FoodCategory[] {
    return [...new Set(catalogueFoods.map((food) => food.category))].sort();
  },
  getExplorerCuisines(): string[] {
    return [...new Set(explorerFoods.flatMap((food) => [
      ...(food.cuisine !== "Unspecified" ? [food.cuisine] : []),
      ...(food.regionalOrigin ? [food.regionalOrigin] : []),
    ]))].sort();
  },
  getExplorerCategories(): FoodCategory[] {
    return [...new Set(explorerFoods.map((food) => food.category))].sort();
  },
};
