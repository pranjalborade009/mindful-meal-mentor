import { describe, expect, it } from "vitest";
import { demoFoods } from "@/data/demoFoods";
import { calculatePortionNutrition, formatNutrient } from "@/lib/portion-calculations";
import { filterFoods, isFoodAllowedForRestrictions } from "@/services/food-data-service";
import { getFoodNutritionPer100g } from "@/services/food-data-service";
import { sortFoodResults } from "@/components/food/FoodFilters";
import { calculateRecipeNutrition, createCustomFood } from "@/services/recipe-service";
import type { Food, NutritionInfo, Recipe } from "@/types";

const sampleFood = demoFoods[0]!;

function foodWithNutrition(id: string, nutrition: NutritionInfo): Food {
  return { ...sampleFood, id, nutrition };
}

describe("nutrition foundation", () => {
  it("scales per-serving nutrition and preserves missing values", () => {
    const reference: NutritionInfo = {
      servingSize: { quantity: 200, unit: "g" },
      basis: "per-serving",
      caloriesKcal: 300,
      proteinG: 20,
      carbohydrateG: null,
      fatG: 10,
      fiberG: null,
      micronutrients: { iron: { value: 4, unit: "mg" }, calcium: { value: null, unit: "mg" } },
    };

    const result = calculatePortionNutrition(reference, { quantity: 100, unit: "g" });

    expect(result.nutrition).toMatchObject({
      caloriesKcal: 150,
      proteinG: 10,
      carbohydrateG: null,
      fatG: 5,
      fiberG: null,
      micronutrients: { iron: { value: 2, unit: "mg" }, calcium: { value: null, unit: "mg" } },
    });
    expect(result.completeness).toBe("partial");
    expect(result.missingNutrients).toContain("carbohydrateG");
    expect(formatNutrient(null, " g")).toBe("Unknown");
  });

  it("scales per-100 g amounts and requires explicit mass for incompatible units", () => {
    const reference: NutritionInfo = {
      servingSize: { quantity: 100, unit: "g" },
      basis: "per-100g",
      caloriesKcal: 200,
      proteinG: 10,
      carbohydrateG: 30,
      fatG: 5,
      fiberG: 3,
    };

    const portion = calculatePortionNutrition(reference, { quantity: 250, unit: "g" });
    const unknownMass = calculatePortionNutrition(reference, { quantity: 250, unit: "ml" });
    const knownMass = calculatePortionNutrition(reference, { quantity: 1, unit: "piece", weightGrams: 50 });

    expect(portion.nutrition.caloriesKcal).toBe(500);
    expect(unknownMass.nutrition.caloriesKcal).toBeNull();
    expect(unknownMass.note).toContain("compatible unit");
    expect(knownMass.nutrition.caloriesKcal).toBe(100);
  });

  it("scales custom units only when the reference and selected weights are known", () => {
    const reference: NutritionInfo = {
      servingSize: { quantity: 1, unit: "piece", weightGrams: 80 },
      basis: "per-serving",
      caloriesKcal: 160,
      proteinG: 8,
      carbohydrateG: 20,
      fatG: 4,
      fiberG: 2,
    };

    expect(calculatePortionNutrition(reference, { quantity: 160, unit: "g" }).nutrition.caloriesKcal).toBe(320);
    expect(calculatePortionNutrition(reference, { quantity: 2, unit: "piece" }).nutrition.caloriesKcal).toBe(320);
  });

  it("aggregates recipe nutrition per serving and marks missing ingredient data", () => {
    const nutritionA: NutritionInfo = {
      servingSize: { quantity: 100, unit: "g" }, basis: "per-serving",
      caloriesKcal: 100, proteinG: 10, carbohydrateG: 20, fatG: 2, fiberG: 4,
    };
    const nutritionB: NutritionInfo = {
      servingSize: { quantity: 100, unit: "g" }, basis: "per-serving",
      caloriesKcal: 200, proteinG: 20, carbohydrateG: 30, fatG: 6, fiberG: 6,
    };
    const foods = [foodWithNutrition("a", nutritionA), foodWithNutrition("b", nutritionB)];
    const recipe: Recipe = {
      id: "recipe-1", name: "Test recipe", cuisine: "Maharashtrian", meal: "Lunch", servings: 2,
      ingredients: [
        { foodId: "a", quantity: { quantity: 100, unit: "g" } },
        { foodId: "b", quantity: { quantity: 50, unit: "g" } },
      ],
    };
    const result = calculateRecipeNutrition(recipe, (id) => foods.find((food) => food.id === id));

    expect(result.nutrition.caloriesKcal).toBe(100);
    expect(result.nutrition.proteinG).toBe(10);
    expect(result.nutrition.fiberG).toBe(3.5);
    expect(result.dataQuality).toBe("estimated");
    expect(result.completeness).toBe("complete");

    const incomplete = calculateRecipeNutrition({
      ...recipe,
      ingredients: [...recipe.ingredients, { foodId: "unknown", quantity: { quantity: 25, unit: "g" } }],
    }, (id) => foods.find((food) => food.id === id));
    expect(incomplete.nutrition.caloriesKcal).toBeNull();
    expect(incomplete.completeness).toBe("partial");
    expect(incomplete.missingIngredientIds).toEqual(["unknown"]);
  });

  it("creates custom foods with user-entered provenance instead of verified status", () => {
    const custom = createCustomFood({
      ...sampleFood,
      id: "custom-food",
      name: "My food",
      nutrition: { ...sampleFood.nutrition, caloriesKcal: null },
    });

    expect(custom.source).toBe("user-entered");
    expect(custom.nutritionDataQuality).toBe("user-entered");
    expect(custom.nutrition.caloriesKcal).toBeNull();
    expect(custom.nutritionProvenance.sourceType).toBe("user");
  });

  it("searches alternative names and filters by regional cuisine, category, diet, and meal", () => {
    const regionalFood: Food = {
      ...sampleFood,
      id: "regional-sample",
      name: "Green Lentil Dish",
      alternativeNames: ["mung bowl"],
      regionalOrigin: "Maharashtrian",
      category: "snack",
      dietaryLabels: ["Vegetarian"],
      meal: "Breakfast",
    };

    expect(filterFoods([regionalFood], { query: "MUNG" })).toEqual([regionalFood]);
    expect(filterFoods([regionalFood], { cuisine: "Maharashtrian", category: "snack", diet: "Vegetarian", meal: "Breakfast" })).toEqual([regionalFood]);
    expect(filterFoods([regionalFood], { diet: "Vegan" })).toEqual([]);
  });

  it("compares demo and USDA foods on a common per-100 g basis and sorts by that basis", () => {
    const demo: Food = {
      ...sampleFood,
      id: "demo-per-serving",
      name: "Zucchini sample",
      nutrition: { ...sampleFood.nutrition, servingSize: { quantity: 200, unit: "g" }, caloriesKcal: 300, proteinG: 20 },
    };
    const perHundred: Food = {
      ...sampleFood,
      id: "fdc-per-100g",
      name: "Apple source record",
      nutrition: { ...sampleFood.nutrition, servingSize: { quantity: 100, unit: "g" }, basis: "per-100g" as const, caloriesKcal: 160, proteinG: 4 },
    };

    expect(getFoodNutritionPer100g(demo)).toMatchObject({ caloriesKcal: 150, proteinG: 10 });
    expect(filterFoods([demo, perHundred], { maxCalories: 155 })).toEqual([demo]);
    expect(sortFoodResults([perHundred, demo], "calories-asc").map((food) => food.id)).toEqual([demo.id, perHundred.id]);
    expect(sortFoodResults([demo, perHundred], "name-asc").map((food) => food.name)).toEqual(["Apple source record", "Zucchini sample"]);
  });

  it("treats allergy and hard dietary restrictions as exclusions", () => {
    const unknownAllergens = { ...sampleFood, allergenDataStatus: "unknown" as const, allergens: null };
    const knownSafe = { ...sampleFood, allergenDataStatus: "complete" as const, allergens: [] };
    const containsPeanut = { ...sampleFood, allergenDataStatus: "complete" as const, allergens: ["peanuts"] };

    expect(isFoodAllowedForRestrictions(unknownAllergens, { allergens: ["peanuts"] })).toBe(false);
    expect(isFoodAllowedForRestrictions(knownSafe, { allergens: ["peanuts"] })).toBe(true);
    expect(isFoodAllowedForRestrictions(containsPeanut, { allergens: ["peanut"] })).toBe(false);
    expect(isFoodAllowedForRestrictions(sampleFood, { dietaryLabels: ["Vegan"] })).toBe(false);
    expect(filterFoods([unknownAllergens], { allergensToAvoid: ["peanuts"] })).toEqual([]);
  });
});