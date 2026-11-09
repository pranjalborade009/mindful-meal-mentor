import { calculatePortionNutrition } from "@/lib/portion-calculations";
import type {
  Food,
  MealType,
  MicronutrientAmount,
  NutrientKey,
  NutritionDataQuality,
  NutritionInfo,
  NutritionProvenance,
  ServingSize,
} from "@/types";

export interface FoodIntakeLogInput {
  id: string;
  loggedAt: string;
  meal: MealType;
  portion: ServingSize;
}

export interface CalculatedFoodIntake extends FoodIntakeLogInput {
  foodId: string;
  foodName: string;
  nutrition: NutritionInfo;
  completeness: "complete" | "partial" | "unavailable";
  missingNutrients: string[];
  dataQuality: NutritionDataQuality;
  provenance: NutritionProvenance;
}

export type AggregateDataQuality = NutritionDataQuality | "mixed";

export interface IntakeNutritionTotals {
  nutrition: NutritionInfo;
  completeness: "complete" | "partial" | "unavailable";
  dataQuality: AggregateDataQuality;
  entryCount: number;
  missingNutrients: string[];
  provenance: string[];
}

const NUTRIENTS: NutrientKey[] = ["caloriesKcal", "proteinG", "carbohydrateG", "fatG", "fiberG"];

export function calculateLoggedFoodPortion(food: Food, log: FoodIntakeLogInput): CalculatedFoodIntake {
  const portion = calculatePortionNutrition(food.nutrition, log.portion);
  return {
    ...log,
    foodId: food.id,
    foodName: food.name,
    nutrition: portion.nutrition,
    completeness: portion.completeness,
    missingNutrients: portion.missingNutrients,
    dataQuality: food.nutritionDataQuality,
    provenance: food.nutritionProvenance,
  };
}

function sumKnownAmounts(values: (number | null | undefined)[]): number | null {
  if (values.length === 0) return null;
  let total = 0;
  for (const value of values) {
    if (value === null || value === undefined || !Number.isFinite(value)) return null;
    total += value;
  }
  return total;
}

function combinedDataQuality(entries: CalculatedFoodIntake[]): AggregateDataQuality {
  const firstEntry = entries[0];
  if (!firstEntry) return "estimated";
  const qualities = new Set(entries.map((entry) => entry.dataQuality));
  return qualities.size === 1 ? firstEntry.dataQuality : "mixed";
}

/** A nutrient total is known only when every logged portion has that nutrient value. */
export function aggregateIntakeNutrition(entries: CalculatedFoodIntake[]): IntakeNutritionTotals {
  const nutrition: NutritionInfo = {
    servingSize: { quantity: entries.length, unit: "serving", description: `${entries.length} logged portions` },
    basis: "per-serving",
    caloriesKcal: null,
    proteinG: null,
    carbohydrateG: null,
    fatG: null,
    fiberG: null,
  };
  const missingNutrients: string[] = [];

  for (const key of NUTRIENTS) {
    const total = sumKnownAmounts(entries.map((entry) => entry.nutrition[key]));
    nutrition[key] = total;
    if (total === null) missingNutrients.push(key);
  }

  const micronutrientNames = [...new Set(entries.flatMap((entry) => Object.keys(entry.nutrition.micronutrients ?? {})))];
  if (micronutrientNames.length) {
    nutrition.micronutrients = {};
    for (const name of micronutrientNames) {
      const amounts = entries.map((entry) => entry.nutrition.micronutrients?.[name]);
      const units = new Set(amounts.flatMap((amount) => amount ? [amount.unit] : []));
      const unit = units.size === 1 ? [...units][0]! : "incompatible units";
      const total = units.size === 1 ? sumKnownAmounts(amounts.map((amount) => amount?.value)) : null;
      const aggregate: MicronutrientAmount = { value: total, unit };
      nutrition.micronutrients[name] = aggregate;
      if (total === null) missingNutrients.push(`micronutrients.${name}`);
    }
  }

  const allNutrients = [...NUTRIENTS.map((key) => nutrition[key]), ...Object.values(nutrition.micronutrients ?? {}).map((amount) => amount.value)];
  const knownCount = allNutrients.filter((value) => value !== null).length;
  const completeness = entries.length === 0 || knownCount === 0
    ? "unavailable"
    : missingNutrients.length > 0
      ? "partial"
      : "complete";

  return {
    nutrition,
    completeness,
    dataQuality: entries.length ? combinedDataQuality(entries) : "estimated",
    entryCount: entries.length,
    missingNutrients,
    provenance: [...new Set(entries.map((entry) => entry.provenance.sourceName))],
  };
}

export function aggregateIntakeByMeal(entries: CalculatedFoodIntake[]): Partial<Record<MealType, IntakeNutritionTotals>> {
  const grouped = new Map<MealType, CalculatedFoodIntake[]>();
  for (const entry of entries) grouped.set(entry.meal, [...(grouped.get(entry.meal) ?? []), entry]);
  return Object.fromEntries([...grouped].map(([meal, meals]) => [meal, aggregateIntakeNutrition(meals)]));
}

/** Groups ISO timestamps by UTC calendar date for stable diary aggregation. */
export function aggregateIntakeByUtcDate(entries: CalculatedFoodIntake[]): Record<string, IntakeNutritionTotals> {
  const grouped = new Map<string, CalculatedFoodIntake[]>();
  for (const entry of entries) {
    const timestamp = new Date(entry.loggedAt);
    if (!Number.isFinite(timestamp.getTime())) throw new RangeError(`Invalid intake timestamp: ${entry.loggedAt}`);
    const date = timestamp.toISOString().slice(0, 10);
    grouped.set(date, [...(grouped.get(date) ?? []), entry]);
  }
  return Object.fromEntries([...grouped].sort(([a], [b]) => a.localeCompare(b)).map(([date, day]) => [date, aggregateIntakeNutrition(day)]));
}