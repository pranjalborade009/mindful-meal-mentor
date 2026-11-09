import type { NutritionInfo, NutrientKey, ServingSize } from "@/types";

export interface PortionNutritionResult {
  nutrition: NutritionInfo;
  completeness: "complete" | "partial" | "unavailable";
  missingNutrients: string[];
  note?: string;
}

const BASE_NUTRIENTS: NutrientKey[] = ["caloriesKcal", "proteinG", "carbohydrateG", "fatG", "fiberG"];

function gramsFor(size: ServingSize): number | null {
  if (size.unit === "g") return size.quantity;
  return size.weightGrams ?? null;
}

function scaleFactor(reference: ServingSize, basis: NutritionInfo["basis"], selected: ServingSize): number | null {
  if (!Number.isFinite(selected.quantity) || selected.quantity <= 0) return null;

  if (basis === "per-100g") {
    const grams = gramsFor(selected);
    return grams === null || !Number.isFinite(grams) || grams <= 0 ? null : grams / 100;
  }

  if (reference.unit === selected.unit) {
    return Number.isFinite(reference.quantity) && reference.quantity > 0 ? selected.quantity / reference.quantity : null;
  }

  const referenceGrams = gramsFor(reference);
  const selectedGrams = gramsFor(selected);
  if (referenceGrams === null || selectedGrams === null || !Number.isFinite(referenceGrams) || !Number.isFinite(selectedGrams) || referenceGrams <= 0 || selectedGrams <= 0) return null;
  return selectedGrams / referenceGrams;
}

/**
 * Scales a known per-serving or per-100 g reference to a selected portion.
 * Mass/volume and item conversions are never assumed: cross-unit scaling needs explicit gram weights.
 */
export function calculatePortionNutrition(reference: NutritionInfo, selected: ServingSize): PortionNutritionResult {
  const factor = scaleFactor(reference.servingSize, reference.basis, selected);
  const missingNutrients: string[] = [];
  const nutrition: NutritionInfo = {
    servingSize: selected,
    basis: "per-serving",
    caloriesKcal: null,
    proteinG: null,
    carbohydrateG: null,
    fatG: null,
    fiberG: null,
  };

  for (const key of BASE_NUTRIENTS) {
    const amount = reference[key];
    if (factor === null || amount === null || !Number.isFinite(amount)) {
      missingNutrients.push(key);
      continue;
    }
    nutrition[key] = amount * factor;
  }

  if (reference.micronutrients) {
    nutrition.micronutrients = {};
    for (const [key, amount] of Object.entries(reference.micronutrients)) {
      if (factor === null || amount.value === null || !Number.isFinite(amount.value)) {
        nutrition.micronutrients[key] = { value: null, unit: amount.unit };
        missingNutrients.push(`micronutrients.${key}`);
      } else {
        nutrition.micronutrients[key] = { value: amount.value * factor, unit: amount.unit };
      }
    }
  }

  const knownCount = BASE_NUTRIENTS.length + Object.keys(reference.micronutrients ?? {}).length - missingNutrients.length;
  return {
    nutrition,
    completeness: knownCount === 0 ? "unavailable" : missingNutrients.length ? "partial" : "complete",
    missingNutrients,
    ...(factor === null ? { note: "This portion cannot be calculated without a compatible unit or known gram weight." } : {}),
  };
}

export function formatNutrient(value: number | null, unit: string): string {
  return value === null || !Number.isFinite(value) ? "Unknown" : `${Number(value.toFixed(1))}${unit}`;
}