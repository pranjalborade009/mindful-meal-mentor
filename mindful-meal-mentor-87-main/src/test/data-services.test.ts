import { describe, expect, it } from "vitest";
import { foodDataService } from "@/services/food-data-service";

describe("frontend data services", () => {
  it("exposes demo foods with serving-scoped nutrition through the service", () => {
    const foods = foodDataService.getAll();
    const sampleFoods = foods.filter((food) => food.source === "demo");

    expect(sampleFoods).toHaveLength(8);
    expect(sampleFoods.every((food) => food.nutritionDataQuality === "estimated")).toBe(true);
    expect(sampleFoods.every((food) => food.nutritionProvenance.sourceType === "demo")).toBe(true);
    expect(sampleFoods.every((food) => food.allergenDataStatus === "unknown")).toBe(true);
    expect(sampleFoods.every((food) => food.nutrition.servingSize.quantity > 0)).toBe(true);
    expect(sampleFoods.every((food) => food.nutrition.servingSize.unit === "g")).toBe(true);
    expect(foods.some((food) => food.source === "usda-fooddata-central")).toBe(true);
    expect(new Set(foods.map((food) => food.id)).size).toBe(foods.length);
    expect(foodDataService.getById(foods[0]!.id)).toEqual(foods[0]);
    expect(foodDataService.getCuisines()).toContain("Indian");
  });

});
