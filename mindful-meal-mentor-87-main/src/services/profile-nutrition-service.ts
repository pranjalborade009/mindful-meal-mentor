import type { AssessmentActivityLevel, AssessmentGoal } from "@/types";

export type MifflinStJeorSex = "female" | "male";
export type ProfileSafetyContext =
  | "not-reviewed"
  | "no-known-exclusions-reviewed"
  | "pregnancy-or-breastfeeding"
  | "complex-medical-condition";

export interface ProfileCalculationInput {
  ageYears?: number | null;
  heightCm?: number | null;
  weightKg?: number | null;
  sexForMifflinStJeor?: MifflinStJeorSex | null;
  activityLevel?: AssessmentActivityLevel | null;
  goal?: AssessmentGoal | null;
  safetyContext?: ProfileSafetyContext;
}

export type EstimateResult<Value> =
  | { status: "available"; value: Value; method: string; note: string }
  | { status: "unavailable"; reason: string }
  | { status: "invalid"; reason: string };

export interface ProfileNutritionEstimates {
  bmi: EstimateResult<number>;
  restingEnergyKcal: EstimateResult<number>;
  dailyEnergyKcal: EstimateResult<number>;
  goalEnergyKcal: EstimateResult<number>;
  proteinTargetG: EstimateResult<number>;
}

const ACTIVITY_FACTORS: Record<AssessmentActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  high: 1.725,
};

const PROFILE_NOTE = "An estimate, not a measurement or medical recommendation.";

function available<Value>(value: Value, method: string, note = PROFILE_NOTE): EstimateResult<Value> {
  return { status: "available", value, method, note };
}

function unavailable<Value>(reason: string): EstimateResult<Value> {
  return { status: "unavailable", reason };
}

function invalid<Value>(reason: string): EstimateResult<Value> {
  return { status: "invalid", reason };
}

type ProfileMeasurements =
  | { status: "available"; ageYears: number; heightCm: number; weightKg: number }
  | { status: "unavailable"; reason: string }
  | { status: "invalid"; reason: string };

function validateProfileMeasurements(input: ProfileCalculationInput): ProfileMeasurements {
  if (input.ageYears === undefined || input.ageYears === null) return { status: "unavailable", reason: "Age is required for this adult calculation." };
  if (!Number.isFinite(input.ageYears) || !Number.isInteger(input.ageYears) || input.ageYears < 1 || input.ageYears > 120) {
    return { status: "invalid", reason: "Age must be a whole number from 1 to 120 years." };
  }
  if (input.ageYears < 18) return { status: "unavailable", reason: "These equations are not provided for people under 18." };
  if (input.heightCm === undefined || input.heightCm === null) return { status: "unavailable", reason: "Height is required." };
  if (!Number.isFinite(input.heightCm) || input.heightCm < 120 || input.heightCm > 230) {
    return { status: "invalid", reason: "Height must be from 120 to 230 cm for this calculation." };
  }
  if (input.weightKg === undefined || input.weightKg === null) return { status: "unavailable", reason: "Weight is required." };
  if (!Number.isFinite(input.weightKg) || input.weightKg < 30 || input.weightKg > 300) {
    return { status: "invalid", reason: "Weight must be from 30 to 300 kg for this calculation." };
  }
  return { status: "available", ageYears: input.ageYears, heightCm: input.heightCm, weightKg: input.weightKg };
}

function safetyIssue(input: ProfileCalculationInput): string | null {
  if (input.safetyContext === "pregnancy-or-breastfeeding") {
    return "Individual energy and nutrient targets are not calculated during pregnancy or breastfeeding.";
  }
  if (input.safetyContext === "complex-medical-condition") {
    return "Individual targets for complex medical conditions require qualified clinical guidance.";
  }
  if (input.safetyContext !== "no-known-exclusions-reviewed") {
    return "Confirm that pregnancy, breastfeeding, and complex medical conditions do not apply before calculating targets.";
  }
  return null;
}

function roundToOneDecimal(value: number): number {
  return Math.round(value * 10) / 10;
}

/** BMI is mass/height squared for adults; it is not a diagnosis or a complete health measure. */
export function calculateBmi(input: ProfileCalculationInput): EstimateResult<number> {
  const profile = validateProfileMeasurements(input);
  if (profile.status !== "available") return profile;

  const heightM = profile.heightCm / 100;
  const bmi = profile.weightKg / (heightM * heightM);
  if (!Number.isFinite(bmi)) return invalid("BMI could not be calculated from these measurements.");

  return available(
    roundToOneDecimal(bmi),
    "BMI = weight in kg / height in metres squared",
    "BMI is a screening calculation, not a diagnosis; it does not describe body composition or overall health.",
  );
}

/**
 * Mifflin–St Jeor adult equation (Mifflin et al., AJCN 1990, 51:241–247).
 * Its sex coefficient is required explicitly; it is not inferred from the assessment.
 */
export function calculateRestingEnergyExpenditure(input: ProfileCalculationInput): EstimateResult<number> {
  const profile = validateProfileMeasurements(input);
  if (profile.status !== "available") return profile;

  const bmi = calculateBmi(input);
  if (bmi.status !== "available") return bmi;
  if (bmi.value < 15 || bmi.value > 50) {
    return unavailable("This equation is not used outside the engine's conservative BMI support range of 15 to 50; seek individualized guidance.");
  }

  const safety = safetyIssue(input);
  if (safety) return unavailable(safety);
  if (!input.sexForMifflinStJeor) return unavailable("The Mifflin–St Jeor equation requires an explicit equation coefficient selection.");

  const sexCoefficient = input.sexForMifflinStJeor === "male" ? 5 : -161;
  const result = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.ageYears + sexCoefficient;
  if (!Number.isFinite(result) || result <= 0) return invalid("The equation did not produce a valid resting-energy estimate.");

  return available(roundToOneDecimal(result), "Mifflin–St Jeor", "Estimated resting energy expenditure; individual error is expected.");
}

/** TDEE uses conventional activity multipliers; these are rough estimates, not measured activity. */
export function calculateDailyEnergyExpenditure(input: ProfileCalculationInput): EstimateResult<number> {
  const resting = calculateRestingEnergyExpenditure(input);
  if (resting.status !== "available") return resting;
  if (!input.activityLevel) return unavailable("Choose an activity level to estimate daily energy expenditure.");

  const factor = ACTIVITY_FACTORS[input.activityLevel];
  return available(
    roundToOneDecimal(resting.value * factor),
    `Mifflin–St Jeor × activity factor ${factor}`,
    "Estimated daily energy expenditure; activity factors are approximate and may not match an individual's needs.",
  );
}

/**
 * Applies a modest 10% goal adjustment, capped at 500 kcal/day, to estimated TDEE.
 * This is a planning estimate only and is withheld if it falls below estimated resting expenditure.
 */
export function calculateGoalEnergyTarget(input: ProfileCalculationInput): EstimateResult<number> {
  if (!input.goal) return unavailable("Choose a goal to estimate a goal-based energy target.");

  const daily = calculateDailyEnergyExpenditure(input);
  if (daily.status !== "available") return daily;
  const resting = calculateRestingEnergyExpenditure(input);
  if (resting.status !== "available") return resting;

  const adjustment = Math.min(daily.value * 0.1, 500);
  const target = input.goal === "weight-loss"
    ? daily.value - adjustment
    : input.goal === "weight-gain"
      ? daily.value + adjustment
      : daily.value;

  if (target < resting.value) return unavailable("The goal adjustment would fall below estimated resting expenditure; no target is returned.");
  return available(
    roundToOneDecimal(target),
    input.goal === "maintenance" ? "Estimated daily energy expenditure (maintenance)" : `Estimated daily energy expenditure with a capped 10% ${input.goal === "weight-loss" ? "reduction" : "increase"}`,
    "A conservative planning estimate, not a prescribed intake or guarantee of safety. Review with a qualified professional when unsure.",
  );
}

/** Adult protein RDA: 0.8 g/kg/day (National Academies DRI, 2005), limited to BMI 18.5–29.9. */
export function calculateProteinTarget(input: ProfileCalculationInput): EstimateResult<number> {
  const profile = validateProfileMeasurements(input);
  if (profile.status !== "available") return profile;

  const bmi = calculateBmi(input);
  if (bmi.status !== "available") return bmi;
  const safety = safetyIssue(input);
  if (safety) return unavailable(safety);
  if (bmi.value < 18.5 || bmi.value >= 30) {
    return unavailable("The 0.8 g/kg reference is not applied outside the engine's BMI support range; an individualized reference weight may be needed.");
  }

  return available(roundToOneDecimal(profile.weightKg * 0.8), "Adult protein RDA: 0.8 g/kg/day", "Reference intake for generally healthy adults; this is not individualized for sport, illness, pregnancy, or recovery.");
}

export function calculateProfileNutrition(input: ProfileCalculationInput): ProfileNutritionEstimates {
  return {
    bmi: calculateBmi(input),
    restingEnergyKcal: calculateRestingEnergyExpenditure(input),
    dailyEnergyKcal: calculateDailyEnergyExpenditure(input),
    goalEnergyKcal: calculateGoalEnergyTarget(input),
    proteinTargetG: calculateProteinTarget(input),
  };
}