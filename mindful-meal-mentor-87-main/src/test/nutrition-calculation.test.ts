import { describe, expect, it } from "vitest";
import { demoFoods } from "@/data/demoFoods";
import {
  calculateBmi,
  calculateDailyEnergyExpenditure,
  calculateGoalEnergyTarget,
  calculateProfileNutrition,
  calculateProteinTarget,
  calculateRestingEnergyExpenditure,
  type ProfileCalculationInput,
} from "@/services/profile-nutrition-service";
import {
  aggregateIntakeByMeal,
  aggregateIntakeByUtcDate,
  aggregateIntakeNutrition,
  calculateLoggedFoodPortion,
} from "@/services/intake-nutrition-service";
import { compareDailyIntakeToTargets } from "@/services/nutrition-target-comparison-service";

const eligibleAdult: ProfileCalculationInput = {
  ageYears: 30,
  heightCm: 170,
  weightKg: 70,
  sexForMifflinStJeor: "female",
  activityLevel: "moderate",
  goal: "weight-loss",
  safetyContext: "no-known-exclusions-reviewed",
};

describe("profile nutrition estimates", () => {
  it("calculates adult BMI with a non-diagnostic limitation note", () => {
    const result = calculateBmi(eligibleAdult);
    expect(result.status).toBe("available");
    if (result.status === "available") {
      expect(result.value).toBe(24.2);
      expect(result.method).toContain("height in metres squared");
      expect(result.note).toContain("not a diagnosis");
    }
  });

  it("returns unavailable or invalid results for missing and out-of-range profile inputs", () => {
    expect(calculateBmi({ heightCm: 170, weightKg: 70 }).status).toBe("unavailable");
    expect(calculateBmi({ ...eligibleAdult, ageYears: 17 }).status).toBe("unavailable");
    expect(calculateBmi({ ...eligibleAdult, heightCm: 0 }).status).toBe("invalid");
    expect(calculateRestingEnergyExpenditure({ ageYears: 30, heightCm: 170 }).status).toBe("unavailable");
    expect(calculateRestingEnergyExpenditure({
      ageYears: 30,
      heightCm: 170,
      weightKg: 70,
      activityLevel: "moderate",
      goal: "weight-loss",
      safetyContext: "no-known-exclusions-reviewed",
    }).status).toBe("unavailable");
  });

  it("uses Mifflin–St Jeor and the documented activity multiplier", () => {
    const resting = calculateRestingEnergyExpenditure(eligibleAdult);
    const daily = calculateDailyEnergyExpenditure(eligibleAdult);
    expect(resting).toMatchObject({ status: "available", value: 1451.5, method: "Mifflin–St Jeor" });
    expect(daily).toMatchObject({ status: "available", value: 2249.8, method: "Mifflin–St Jeor × activity factor 1.55" });
  });

  it("applies a capped modest goal adjustment and withholds unsafe or unsupported targets", () => {
    const maintenance = calculateGoalEnergyTarget({ ...eligibleAdult, goal: "maintenance" });
    const gain = calculateGoalEnergyTarget({ ...eligibleAdult, goal: "weight-gain" });
    const lose = calculateGoalEnergyTarget(eligibleAdult);
    const { goal: _goal, ...profileWithoutGoal } = eligibleAdult;
    const noGoal = calculateGoalEnergyTarget(profileWithoutGoal);
    const pregnancy = calculateGoalEnergyTarget({ ...eligibleAdult, safetyContext: "pregnancy-or-breastfeeding" });
    const complexCondition = calculateProteinTarget({ ...eligibleAdult, safetyContext: "complex-medical-condition" });

    expect(maintenance).toMatchObject({ status: "available", value: 2249.8 });
    expect(gain).toMatchObject({ status: "available", value: 2474.8 });
    expect(lose).toMatchObject({ status: "available", value: 2024.8 });
    expect(noGoal.status).toBe("unavailable");
    expect(pregnancy.status).toBe("unavailable");
    expect(complexCondition.status).toBe("unavailable");
  });

  it("caps goal adjustments at 500 kcal and requires an explicit safety review", () => {
    const highEnergyProfile: ProfileCalculationInput = {
      ageYears: 30,
      heightCm: 200,
      weightKg: 200,
      sexForMifflinStJeor: "male",
      activityLevel: "high",
      goal: "weight-gain",
      safetyContext: "no-known-exclusions-reviewed",
    };
    const capped = calculateGoalEnergyTarget(highEnergyProfile);
    const { safetyContext: _safetyContext, ...unreviewedProfile } = eligibleAdult;
    const unreviewed = calculateGoalEnergyTarget(unreviewedProfile);

    expect(capped).toMatchObject({ status: "available", value: 5856.1 });
    expect(unreviewed).toMatchObject({ status: "unavailable", reason: expect.stringContaining("Confirm") });
  });

  it("limits protein RDA use to supported healthy-adult inputs", () => {
    expect(calculateProteinTarget(eligibleAdult)).toMatchObject({ status: "available", value: 56 });
    expect(calculateProteinTarget({ ...eligibleAdult, weightKg: 100 }).status).toBe("unavailable");
    expect(calculateProteinTarget({ ...eligibleAdult, safetyContext: "not-reviewed" }).status).toBe("unavailable");
  });

  it("returns independent results for the profile calculation bundle", () => {
    expect(calculateProfileNutrition(eligibleAdult)).toMatchObject({
      bmi: { status: "available" },
      restingEnergyKcal: { status: "available" },
      dailyEnergyKcal: { status: "available" },
      goalEnergyKcal: { status: "available" },
      proteinTargetG: { status: "available" },
    });
  });
});

describe("food intake and daily comparisons", () => {
  const firstFood = demoFoods[0]!;
  const secondFood = demoFoods[1]!;
  const entries = [
    calculateLoggedFoodPortion(firstFood, {
      id: "entry-1", loggedAt: "2026-10-14T08:00:00Z", meal: "Breakfast",
      portion: firstFood.nutrition.servingSize,
    }),
    calculateLoggedFoodPortion(secondFood, {
      id: "entry-2", loggedAt: "2026-10-14T12:00:00Z", meal: "Lunch",
      portion: { ...secondFood.nutrition.servingSize, quantity: secondFood.nutrition.servingSize.quantity / 2 },
    }),
  ];

  it("aggregates meal and UTC day nutrition without losing source quality", () => {
    const totals = aggregateIntakeNutrition(entries);
    const meals = aggregateIntakeByMeal(entries);
    const days = aggregateIntakeByUtcDate(entries);

    expect(totals).toMatchObject({
      completeness: "complete",
      dataQuality: "estimated",
      entryCount: 2,
      nutrition: { caloriesKcal: 690, proteinG: 45 },
    });
    expect(meals["Breakfast"]?.entryCount).toBe(1);
    expect(meals["Lunch"]?.nutrition.caloriesKcal).toBe(170);
    expect(days["2026-10-14"]?.nutrition.caloriesKcal).toBe(690);
    expect(totals.provenance).toContain("Prototype demo values (unverified)");
  });

  it("keeps missing nutrient totals unknown and marks partial or unavailable data", () => {
    const partialFood = {
      ...firstFood,
      nutrition: { ...firstFood.nutrition, proteinG: null },
    };
    const partialEntry = calculateLoggedFoodPortion(partialFood, {
      id: "partial", loggedAt: "2026-10-14T08:00:00Z", meal: "Breakfast", portion: partialFood.nutrition.servingSize,
    });
    const partial = aggregateIntakeNutrition([entries[0]!, partialEntry]);
    const unavailable = aggregateIntakeNutrition([]);

    expect(partial.completeness).toBe("partial");
    expect(partial.nutrition.proteinG).toBeNull();
    expect(partial.nutrition.caloriesKcal).toBe(1040);
    expect(unavailable.completeness).toBe("unavailable");
    expect(unavailable.nutrition.caloriesKcal).toBeNull();
  });

  it("marks totals as mixed when logged portions use different data-quality sources", () => {
    const mixedEntries = [entries[0]!, { ...entries[1]!, dataQuality: "user-entered" as const }];
    expect(aggregateIntakeNutrition(mixedEntries).dataQuality).toBe("mixed");
  });

  it("preserves micronutrient units and refuses to add incompatible units", () => {
    const withMicronutrients = entries.map((entry, index) => ({
      ...entry,
      nutrition: {
        ...entry.nutrition,
        micronutrients: { iron: { value: 2, unit: index === 0 ? "mg" : "g" } },
      },
    }));
    const totals = aggregateIntakeNutrition(withMicronutrients);

    expect(totals.nutrition.micronutrients?.["iron"]).toEqual({ value: null, unit: "incompatible units" });
    expect(totals.completeness).toBe("partial");
  });

  it("compares each available nutrient neutrally and leaves unavailable comparisons explicit", () => {
    const intake = aggregateIntakeNutrition(entries);
    const comparison = compareDailyIntakeToTargets(intake, { caloriesKcal: 2000, proteinG: 100 });

    expect(comparison.caloriesKcal).toMatchObject({
      status: "available", consumed: 690, target: 2000, difference: 1310, progressPercent: 35,
      dataQuality: "estimated",
    });
    expect(comparison.caloriesKcal.note).toContain("not an exact measurement");
    expect(comparison.proteinG.status).toBe("available");
    expect(comparison.fatG).toMatchObject({ status: "unavailable", target: null, progressPercent: null });
  });

  it("marks comparison unavailable for missing intake or invalid targets", () => {
    const noIntake = aggregateIntakeNutrition([]);
    expect(compareDailyIntakeToTargets(noIntake, { caloriesKcal: 2000 }).caloriesKcal.status).toBe("unavailable");
    expect(compareDailyIntakeToTargets(aggregateIntakeNutrition(entries), { caloriesKcal: 0 }).caloriesKcal.status).toBe("unavailable");
  });
});