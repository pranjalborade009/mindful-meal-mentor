import type { NutrientKey } from "@/types";
import type { IntakeNutritionTotals } from "@/services/intake-nutrition-service";

export type DailyNutritionTargets = Partial<Record<NutrientKey, number | null>>;

export interface NutrientProgress {
  status: "available" | "unavailable";
  consumed: number | null;
  target: number | null;
  difference: number | null;
  progressPercent: number | null;
  dataQuality?: IntakeNutritionTotals["dataQuality"];
  note?: string;
  reason?: string;
}

export type DailyTargetComparison = Record<NutrientKey, NutrientProgress>;

function compareNutrient(
  nutrient: NutrientKey,
  intake: IntakeNutritionTotals,
  targets: DailyNutritionTargets,
): NutrientProgress {
  const target = targets[nutrient];
  const consumed = intake.nutrition[nutrient];

  if (target === undefined || target === null || !Number.isFinite(target) || target <= 0) {
    return { status: "unavailable", consumed, target: null, difference: null, progressPercent: null, reason: "No valid target is available for this nutrient." };
  }
  if (consumed === null || !Number.isFinite(consumed)) {
    return { status: "unavailable", consumed: null, target, difference: null, progressPercent: null, reason: "Logged intake does not contain complete data for this nutrient." };
  }

  return {
    status: "available",
    consumed,
    target,
    difference: target - consumed,
    progressPercent: Math.round((consumed / target) * 100),
    dataQuality: intake.dataQuality,
    note: intake.dataQuality === "verified"
      ? "Based on logged portions and verified source data."
      : "An estimate based on logged portions and the available food data; not an exact measurement.",
  };
}

/** Compares each nutrient independently and leaves unavailable intake/targets uncomputed. */
export function compareDailyIntakeToTargets(
  intake: IntakeNutritionTotals,
  targets: DailyNutritionTargets,
): DailyTargetComparison {
  return {
    caloriesKcal: compareNutrient("caloriesKcal", intake, targets),
    proteinG: compareNutrient("proteinG", intake, targets),
    carbohydrateG: compareNutrient("carbohydrateG", intake, targets),
    fatG: compareNutrient("fatG", intake, targets),
    fiberG: compareNutrient("fiberG", intake, targets),
  };
}