import { calculatePortionNutrition } from "@/lib/portion-calculations";
import type {
  CustomFood,
  CustomFoodInput,
  Food,
  NutrientKey,
  NutritionInfo,
  Recipe,
  RecipeNutritionResult,
} from "@/types";

const nutrientKeys: NutrientKey[] = ["caloriesKcal", "proteinG", "carbohydrateG", "fatG", "fiberG"];

export function createCustomFood(input: CustomFoodInput): CustomFood {
  if (!input.id.trim() || !input.name.trim()) throw new Error("A custom food requires an id and name.");
  return {
    ...input,
    source: "user-entered",
    nutritionDataQuality: "user-entered",
    nutritionProvenance: {
      sourceName: "User-entered",
      sourceType: "user",
      note: "Values are user-provided and have not been independently verified.",
    },
  };
}

/** Computes recipe totals only where every ingredient's corresponding nutrient is available. */
export function calculateRecipeNutrition(
  recipe: Recipe,
  getFood: (id: string) => Food | undefined,
): RecipeNutritionResult {
  const missingIngredientIds: string[] = [];
  const portions = recipe.ingredients.map((ingredient) => {
    const food = getFood(ingredient.foodId);
    if (!food) {
      missingIngredientIds.push(ingredient.foodId);
      return null;
    }
    return calculatePortionNutrition(food.nutrition, ingredient.quantity);
  });

  const allNutrients = [...nutrientKeys];
  const micronutrientNames = [...new Set(portions.flatMap((portion) => Object.keys(portion?.nutrition.micronutrients ?? {})))];
  const nutrition: NutritionInfo = {
    servingSize: { quantity: 1, unit: "serving", description: "1 recipe serving" },
    basis: "per-serving",
    caloriesKcal: null,
    proteinG: null,
    carbohydrateG: null,
    fatG: null,
    fiberG: null,
  };

  for (const key of allNutrients) {
    const amounts = portions.map((portion) => portion?.nutrition[key] ?? null);
    if (recipe.servings > 0 && portions.length > 0 && amounts.every((amount): amount is number => amount !== null)) {
      nutrition[key] = amounts.reduce((total, amount) => total + amount, 0) / recipe.servings;
    }
  }

  if (micronutrientNames.length) {
    nutrition.micronutrients = {};
    for (const name of micronutrientNames) {
      const amounts = portions.map((portion) => portion?.nutrition.micronutrients?.[name] ?? null);
      const unit = amounts.find((amount) => amount !== null)?.unit ?? "";
      const compatibleAmounts = amounts.map((amount) => amount?.unit === unit ? amount.value : null);
      nutrition.micronutrients[name] = recipe.servings > 0 && portions.length > 0 && compatibleAmounts.every((amount): amount is number => amount !== null)
        ? { value: compatibleAmounts.reduce((total, amount) => total + amount, 0) / recipe.servings, unit }
        : { value: null, unit };
    }
  }

  const values = nutrientKeys.map((key) => nutrition[key]);
  const micronutrientValues = Object.values(nutrition.micronutrients ?? {}).map((amount) => amount.value);
  const allValues = [...values, ...micronutrientValues];
  const knownCount = allValues.filter((amount) => amount !== null).length;
  const missingCount = allValues.length - knownCount;
  const invalidRecipe = !Number.isFinite(recipe.servings) || recipe.servings <= 0 || recipe.ingredients.length === 0;
  const hasUsableInput = portions.some((portion) => portion && nutrientKeys.some((key) => portion.nutrition[key] !== null));

  return {
    nutrition,
    dataQuality: "estimated",
    completeness: invalidRecipe || !hasUsableInput ? "unavailable" : missingCount || missingIngredientIds.length ? "partial" : "complete",
    missingIngredientIds: [...new Set(missingIngredientIds)],
  };
}