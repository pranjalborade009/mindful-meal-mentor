import { describe, expect, it } from "vitest";
import { curatedExplorerDishes } from "@/data/curatedExplorerDishes";
import { foodDataService, filterFoods } from "@/services/food-data-service";

describe("curated Food Explorer catalogue", () => {
  it("uses stable source food IDs as canonical dish IDs", () => {
    const foods = foodDataService.getExplorerFoods();
    expect(foods.map((food) => food.id)).toEqual(curatedExplorerDishes.map((dish) => dish.id));
    expect(foods.every((food) => food.category === "dish" || food.category === "snack")).toBe(true);
    expect(new Set(foods.map((food) => food.name.toLocaleLowerCase())).size).toBe(foods.length);
  });

  it.each([
    ["chicken biriyani", "usda-fdc-2706538"],
    ["fried-rice", "usda-fdc-334536"],
    ["pupusas con frijoles", "usda-fdc-334720"],
    ["pork tamales", "usda-fdc-334628"],
  ])("searches alternative spellings and source names for %s", (query, id) => {
    expect(filterFoods(foodDataService.getExplorerFoods(), { query }).map((food) => food.id)).toContain(id);
  });

  it("keeps raw ingredients, beverages, and demo-only foods out of Food Explorer", () => {
    const explorerIds = new Set(foodDataService.getExplorerFoods().map((food) => food.id));
    expect(explorerIds.has("usda-fdc-2262074")).toBe(false);
    expect(explorerIds.has("usda-fdc-2257045")).toBe(false);
    expect(explorerIds.has("paneer-tikka")).toBe(false);
    expect(foodDataService.getById("usda-fdc-2262074")).toBeDefined();
    expect(foodDataService.getById("paneer-tikka")).toBeDefined();
  });

  it("limits cuisine and category filters to visible sourced dishes", () => {
    expect(foodDataService.getExplorerCuisines()).toEqual(["Chinese", "Indian", "Latin American"]);
    expect(foodDataService.getExplorerCategories()).toEqual(["dish", "snack"]);
  });
});
