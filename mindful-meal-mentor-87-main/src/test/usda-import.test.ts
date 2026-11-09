import { describe, expect, it } from "vitest";
import { usdaFoundationFoods, usdaFoundationImportSummary } from "@/data/usdaFoundationFoods";
import { normalizeUsdaFoundationFoods } from "@/services/usda-food-import-service";
import { foodDataService } from "@/services/food-data-service";
import { FoodDiaryService, type DiaryStorage } from "@/services/food-diary-service";
import { calculatePortionNutrition } from "@/lib/portion-calculations";

function nutrient(id: number, name: string, amount: number, unitName: string, extra: Record<string, unknown> = {}) {
  return {
    nutrient: { id, name, unitName },
    amount,
    foodNutrientDerivation: { description: "Analytical" },
    ...extra,
  };
}

function sourceFood(fdcId: number, description: string, nutrients: unknown[] = []) {
  return {
    fdcId,
    description,
    publicationDate: "2026-04-30",
    foodCategory: { description: "Cereal Grains and Pasta" },
    foodNutrients: nutrients,
    foodPortions: [{ amount: 1, measureUnit: { name: "cup", abbreviation: "cup" }, gramWeight: 180 }],
  };
}

class TestDiaryStorage implements DiaryStorage {
  value: string | null = null;
  getItem(): string | null { return this.value; }
  setItem(_key: string, value: string): void { this.value = value; }
}

describe("USDA Foundation Foods import", () => {
  it("normalizes source identity, nutrients, units, preparation, and standard portions", () => {
    const source = sourceFood(101, "Rice, brown, raw", [
      nutrient(1008, "Energy", 360, "kcal"),
      nutrient(2047, "Energy (Atwater General Factors)", 365, "kcal"),
      nutrient(2048, "Energy (Atwater Specific Factors)", 368, "kcal"),
      nutrient(1003, "Protein", 7.5, "g"),
      nutrient(1004, "Total lipid (fat)", 3, "g"),
      nutrient(1005, "Carbohydrate, by difference", 75, "g"),
      nutrient(1079, "Fiber, total dietary", 0, "g", { loq: 0.2 }),
      nutrient(1089, "Iron, Fe", 1.2, "mg"),
    ]);

    const result = normalizeUsdaFoundationFoods({ FoundationFoods: [source] });
    const imported = result.foods[0]!;

    expect(imported).toMatchObject({
      id: "usda-fdc-101",
      source: "usda-fooddata-central",
      category: "ingredient",
      meal: null,
      diet: "Unspecified",
      preparationState: "raw",
      externalDataId: { source: "usda-fooddata-central", id: 101, release: "2026-04-30" },
      nutritionDataQuality: "estimated",
      nutritionProvenance: { sourceType: "database", sourceName: "USDA FoodData Central Foundation Foods" },
      nutrition: {
        basis: "per-100g",
        servingSize: { quantity: 100, unit: "g" },
        caloriesKcal: 368,
        proteinG: 7.5,
        carbohydrateG: 75,
        fatG: 3,
        fiberG: null,
        micronutrients: { iron: { value: 1.2, unit: "mg" } },
      },
      servingOptions: [{ quantity: 1, unit: "serving", weightGrams: 180 }],
    });
    expect(imported.allergens).toBeNull();
    expect(imported.allergenDataStatus).toBe("unknown");
    expect(imported.nutritionProvenance.note).toContain("per 100 g");
  });

  it("deduplicates by FDC ID and rejects records without usable nutrient data", () => {
    const valid = sourceFood(202, "Tomato, raw", [nutrient(1003, "Protein", 1, "g")]);
    const result = normalizeUsdaFoundationFoods({
      FoundationFoods: [
        valid,
        sourceFood(202, "Duplicate row", [nutrient(1003, "Protein", 9, "g")]),
        { description: "Missing source ID", foodNutrients: [nutrient(1003, "Protein", 1, "g")] },
        sourceFood(303, "No nutrients", []),
      ],
    });

    expect(result.foods).toHaveLength(1);
    expect(result.foods[0]?.name).toBe("Tomato, raw");
    expect(result.report).toEqual({
      sourceRecordCount: 4,
      validFoodCount: 1,
      skippedMissingIdCount: 1,
      skippedInvalidCount: 1,
      duplicateFdcIdCount: 1,
    });
  });

  it("keeps genuinely missing nutrients null and portion calculations unit-safe", () => {
    const food = normalizeUsdaFoundationFoods({
      FoundationFoods: [sourceFood(404, "Spinach, cooked", [nutrient(1008, "Energy", 23, "kcal")])],
    }).foods[0]!;
    const portion = calculatePortionNutrition(food.nutrition, { quantity: 50, unit: "g" });

    expect(food.nutrition.proteinG).toBeNull();
    expect(portion.nutrition.caloriesKcal).toBe(11.5);
    expect(portion.nutrition.proteinG).toBeNull();
    expect(portion.completeness).toBe("partial");
  });

  it("leaves core nutrient values unavailable when the source unit contradicts the nutrient ID", () => {
    const imported = normalizeUsdaFoundationFoods({
      FoundationFoods: [sourceFood(405, "Oats, raw", [
        nutrient(1008, "Energy", 1500, "kJ"),
        nutrient(1003, "Protein", 10, "mg"),
        nutrient(1005, "Carbohydrate, by difference", 20, "mg"),
        nutrient(1004, "Total lipid (fat)", 5, "g"),
      ])],
    }).foods[0]!;

    expect(imported.nutrition.caloriesKcal).toBeNull();
    expect(imported.nutrition.proteinG).toBeNull();
    expect(imported.nutrition.carbohydrateG).toBeNull();
    expect(imported.nutrition.fatG).toBe(5);
    expect(imported.nutritionProvenance.note).toContain("unexpected unit");
  });

  it("bundles the acquired source snapshot with the reported validated count", () => {
    expect(usdaFoundationImportSummary.sourceRecordCount).toBe(395);
    expect(usdaFoundationFoods).toHaveLength(usdaFoundationImportSummary.validFoodCount);
    expect(new Set(usdaFoundationFoods.map((food) => food.externalDataId?.id)).size).toBe(usdaFoundationFoods.length);
    expect(usdaFoundationFoods.every((food) => food.source === "usda-fooddata-central")).toBe(true);
    expect(usdaFoundationFoods.every((food) => food.nutritionDataQuality === "estimated")).toBe(true);
  });

  it("keeps existing demo IDs and allows imported FDC IDs to resolve in diary entries", () => {
    const existingDemoIds = ["salmon-quinoa-bowl", "paneer-tikka", "greek-yogurt-bowl", "lentil-salad", "millet-khichdi", "tofu-stir-fry", "grilled-chicken-plate", "moong-chilla"];
    expect(existingDemoIds.every((id) => foodDataService.getById(id))).toBe(true);

    const imported = usdaFoundationFoods.find((food) => food.servingOptions?.length);
    expect(imported).toBeDefined();
    const store = new TestDiaryStorage();
    const diary = new FoodDiaryService(store, (id) => foodDataService.getById(id) !== undefined);
    const portion = imported!.servingOptions![0]!;
    diary.addEntry({ id: "fdc-diary-entry", foodId: imported!.id, date: "2026-10-14", meal: "Lunch", portion });

    expect(diary.getEntriesForDate("2026-10-14")[0]).toMatchObject({ foodId: imported!.id, portion });
    expect(foodDataService.getById(imported!.id)?.nutrition.basis).toBe("per-100g");
  });
});