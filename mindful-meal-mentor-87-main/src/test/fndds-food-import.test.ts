import { describe, expect, it } from "vitest";
import { usdaFnddsFoods } from "@/data/usdaFnddsFoods";
import { foodDataService } from "@/services/food-data-service";

describe("selected FNDDS Indian dishes", () => {
  it("adds the selected FDC records without identifier collisions", () => {
    const foods = foodDataService.getAll();
    const ids = foods.map((food) => food.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(usdaFnddsFoods.map((food) => food.id)).toEqual([
      "usda-fdc-2706538",
      "usda-fdc-2708730",
    ]);
    expect(foodDataService.getById("usda-fdc-2706538")?.name).toBe("Biryani with chicken");
    expect(foodDataService.getById("usda-fdc-2708730")?.name).toBe("Samosa");
  });

  it("preserves available source nutrition and does not infer unsupported metadata", () => {
    const biryani = foodDataService.getById("usda-fdc-2706538")!;
    const samosa = foodDataService.getById("usda-fdc-2708730")!;

    expect(biryani.nutrition).toMatchObject({
      basis: "per-100g",
      caloriesKcal: 104,
      proteinG: 7.15,
      carbohydrateG: 13.55,
      fatG: 2.38,
      fiberG: 1.1,
    });
    expect(samosa.nutrition).toMatchObject({
      caloriesKcal: 310,
      proteinG: 5.14,
      carbohydrateG: 33.16,
      fatG: 17.47,
      fiberG: 1.8,
    });
    expect(biryani.servingOptions?.map(({ description, weightGrams }) => [description, weightGrams])).toContainEqual(["1 cup", 196]);
    expect(samosa.servingOptions?.map(({ description, weightGrams }) => [description, weightGrams])).toContainEqual(["1 small/individual", 25]);
    expect(biryani.cuisine).toBe("Indian");
    expect(samosa.cuisine).toBe("Unspecified");
    expect(biryani.diet).toBe("Unspecified");
    expect(biryani.allergens).toBeNull();
    expect(biryani.allergenDataStatus).toBe("unknown");
  });

  it("includes attributed, food-matched Commons photographs", () => {
    for (const food of usdaFnddsFoods) {
      expect(food.image).toMatch(/^https:\/\/thumb\.wikimedia\.org\//);
      expect(food.imageAttribution).toMatchObject({
        licenseName: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      });
      expect(food.imageAttribution?.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
  });
});
