import { describe, expect, it } from "vitest";
import { demoFoods } from "@/data/demoFoods";
import { curatedExplorerDishes } from "@/data/curatedExplorerDishes";
import { foodPhotoGenerationManifest } from "@/data/food-photo-generation-manifest";
import { usdaFoundationFoods } from "@/data/usdaFoundationFoods";
import { usdaFnddsFoods } from "@/data/usdaFnddsFoods";
import { verifiedFoodImageMappings } from "@/data/verifiedFoodImageMappings";
import { foodDataService } from "@/services/food-data-service";

describe("verified food image mappings", () => {
  it("maps only existing catalogue IDs and stores source and reuse information", () => {
    const foods = foodDataService.getAll();
    const ids = new Set(foods.map((food) => food.id));

    expect(Object.keys(verifiedFoodImageMappings)).toHaveLength(21);
    for (const [id, mapping] of Object.entries(verifiedFoodImageMappings)) {
      expect(ids.has(id), `unknown food ID ${id}`).toBe(true);
      expect(mapping.image).toMatch(/^https:\/\/(?:thumb|upload)\.wikimedia\.org\//);
      expect(mapping.imageAttribution.credit).toContain("Wikimedia Commons");
      expect(mapping.imageAttribution.sourceUrl).toMatch(/^https:\/\/commons\.wikimedia\.org\/\?curid=\d+$/);
      expect(mapping.imageAttribution.licenseName).not.toBe("");
      expect(mapping.imageAttribution.licenseUrl).toMatch(/^https:\/\/creativecommons\.org\//);
    }
    const mappedImages = Object.values(verifiedFoodImageMappings).map((mapping) => mapping.image);
    expect(new Set(mappedImages).size).toBe(mappedImages.length);

    expect(foods.filter((food) => food.imageAttribution)).toHaveLength(23);
  });

  it("adds image metadata without changing source IDs or nutrition data", () => {
    const originalFoods = [...demoFoods, ...usdaFoundationFoods, ...usdaFnddsFoods];

    for (const original of originalFoods) {
      const catalogueFood = foodDataService.getById(original.id);
      expect(catalogueFood?.id).toBe(original.id);
      expect(catalogueFood?.nutrition).toEqual(original.nutrition);
      expect(catalogueFood?.nutritionProvenance).toEqual(original.nutritionProvenance);
    }
  });

  it("exposes only unique sourced prepared foods with a unique attributed image in Explorer", () => {
    const foods = foodDataService.getExplorerFoods();
    const ids = foods.map((food) => food.id);
    const canonicalNames = curatedExplorerDishes.map((dish) =>
      dish.name.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
    );
    const images = foods.map((food) => food.image);

    expect(foodDataService.getAll()).toHaveLength(372);
    expect(foods).toHaveLength(6);
    expect(new Set(ids).size).toBe(foods.length);
    expect(new Set(canonicalNames).size).toBe(canonicalNames.length);
    expect(new Set(images).size).toBe(foods.length);
    for (const food of foods) {
      expect(food.source).toBe("usda-fooddata-central");
      expect(food.nutritionProvenance.sourceType).toBe("database");
      expect(food.nutritionDataQuality).toBe("estimated");
      expect(food.image).toMatch(/^https:\/\/(?:thumb|upload)\.wikimedia\.org\//);
      expect(food.imageAttribution).toBeDefined();
      expect(food.nutrition.servingSize.quantity).toBeGreaterThan(0);
    }
  });

  it("keeps a 30-image generation manifest explicit about files that do not exist yet", () => {
    expect(foodPhotoGenerationManifest).toHaveLength(30);
    expect(new Set(foodPhotoGenerationManifest.map((item) => item.canonicalId)).size).toBe(30);
    expect(new Set(foodPhotoGenerationManifest.map((item) => item.outputPath)).size).toBe(30);
    expect(foodPhotoGenerationManifest.every((item) => item.outputPath.startsWith("src/assets/dishes/") && item.outputPath.endsWith(".webp"))).toBe(true);
    expect(foodPhotoGenerationManifest.every((item) => item.prompt.length > 80)).toBe(true);
    expect(foodPhotoGenerationManifest.filter((item) => item.catalogueFoodId)).toHaveLength(6);
  });
});
