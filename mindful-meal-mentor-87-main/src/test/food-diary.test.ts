import { describe, expect, it } from "vitest";
import { demoFoods } from "@/data/demoFoods";
import { aggregateIntakeNutrition, calculateLoggedFoodPortion } from "@/services/intake-nutrition-service";
import { compareDailyIntakeToTargets } from "@/services/nutrition-target-comparison-service";
import { FoodDiaryService, type DiaryStorage } from "@/services/food-diary-service";
import type { FoodDiaryEntry } from "@/types";

class MemoryDiaryStorage implements DiaryStorage {
  value: string | null = null;

  getItem(): string | null {
    return this.value;
  }

  setItem(_key: string, value: string): void {
    this.value = value;
  }
}

const food = demoFoods[0]!;
const storage = () => new MemoryDiaryStorage();
const entry = (overrides: Partial<FoodDiaryEntry> = {}): FoodDiaryEntry => ({
  id: "entry-1",
  foodId: food.id,
  date: "2026-10-14",
  meal: "Breakfast",
  portion: food.nutrition.servingSize,
  ...overrides,
});
const createService = (store = storage()) => new FoodDiaryService(store, (foodId) => demoFoods.some((item) => item.id === foodId));

describe("food diary persistence", () => {
  it("adds, categorizes, and lists entries by selected date", () => {
    const service = createService();
    service.addEntry(entry());
    service.addEntry(entry({ id: "entry-2", date: "2026-10-15", meal: "Lunch" }));

    expect(service.getEntriesForDate("2026-10-14")).toHaveLength(1);
    expect(service.getEntriesForDate("2026-10-14")[0]?.meal).toBe("Breakfast");
    expect(service.getEntriesForDate("2026-10-15")[0]?.meal).toBe("Lunch");
  });

  it("edits meal and portion quantity and removes an entry", () => {
    const service = createService();
    service.addEntry(entry());
    service.updateEntry("entry-1", {
      meal: "Dinner",
      portion: { ...food.nutrition.servingSize, quantity: food.nutrition.servingSize.quantity / 2 },
    });
    expect(service.getEntries()[0]).toMatchObject({ meal: "Dinner", portion: { quantity: 190, unit: "g" } });

    service.removeEntry("entry-1");
    expect(service.getEntries()).toEqual([]);
  });

  it("rejects invalid additions and ignores invalid restored records", () => {
    const store = storage();
    const service = createService(store);
    expect(() => service.addEntry(entry({ date: "not-a-date" }))).toThrow("invalid");

    store.value = JSON.stringify({
      version: 1,
      entries: [
        { ...entry(), allergies: "peanuts" },
        { ...entry({ id: "bad-quantity", portion: { quantity: -1, unit: "g" } }) },
        { ...entry({ id: "bad-meal", meal: "Brunch" as FoodDiaryEntry["meal"] }) },
        { ...entry({ id: "unknown-food", foodId: "not-in-catalogue" }) },
      ],
    });

    expect(service.getEntries()).toEqual([entry()]);
    expect(service.getEntries()[0]).not.toHaveProperty("allergies");
  });

  it("keeps diary storage limited to food, date, meal, and portion", () => {
    const store = storage();
    createService(store).addEntry(entry());
    expect(store.value).not.toContain("healthConsiderations");
    expect(store.value).not.toContain("allergies");
    expect(JSON.parse(store.value ?? "{}")).toMatchObject({ version: 1, entries: [{ foodId: food.id, date: "2026-10-14", meal: "Breakfast" }] });
  });
});

describe("diary nutrition", () => {
  it("aggregates daily nutrition from portions and leaves missing values unknown", () => {
    const logged = calculateLoggedFoodPortion(food, {
      id: "entry-1", loggedAt: "2026-10-14T12:00:00Z", meal: "Breakfast", portion: food.nutrition.servingSize,
    });
    const totals = aggregateIntakeNutrition([logged]);

    expect(totals.nutrition.caloriesKcal).toBe(food.nutrition.caloriesKcal);
    expect(totals.nutrition.proteinG).toBe(food.nutrition.proteinG);
    expect(totals.dataQuality).toBe("estimated");
    expect(totals.completeness).toBe("complete");
  });

  it("marks incomplete and empty nutrition totals clearly", () => {
    const incompleteFood = { ...food, nutrition: { ...food.nutrition, caloriesKcal: null } };
    const logged = calculateLoggedFoodPortion(incompleteFood, {
      id: "entry-1", loggedAt: "2026-10-14T12:00:00Z", meal: "Breakfast", portion: food.nutrition.servingSize,
    });

    expect(aggregateIntakeNutrition([logged])).toMatchObject({ completeness: "partial", nutrition: { caloriesKcal: null } });
    expect(aggregateIntakeNutrition([])).toMatchObject({ completeness: "unavailable", nutrition: { caloriesKcal: null } });
  });

  it("does not invent missing daily targets", () => {
    const logged = calculateLoggedFoodPortion(food, {
      id: "entry-1", loggedAt: "2026-10-14T12:00:00Z", meal: "Breakfast", portion: food.nutrition.servingSize,
    });
    const comparison = compareDailyIntakeToTargets(aggregateIntakeNutrition([logged]), {});
    expect(comparison.caloriesKcal).toMatchObject({ status: "unavailable", target: null, progressPercent: null });
  });
});