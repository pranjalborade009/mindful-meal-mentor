import { describe, expect, it } from "vitest";
import { createEmptyAssessmentForm } from "@/lib/assessment-validation";
import { getDashboardAssessmentSummary } from "@/services/dashboard-service";

describe("dashboard assessment summary", () => {
  it("shows only values from a saved, valid assessment", () => {
    const answers = {
      ...createEmptyAssessmentForm(),
      age: "32",
      heightCm: "172",
      weightKg: "74.5",
      goal: "maintenance" as const,
      activityLevel: "moderate" as const,
      dietaryPattern: "vegetarian" as const,
      preferredCuisines: ["Gujarati", "South Indian"],
      budget: "₹300 per day",
    };

    expect(getDashboardAssessmentSummary(answers)).toEqual({
      age: "32 years",
      height: "172 cm",
      weight: "74.5 kg",
      goal: "Weight maintenance",
      activity: "Moderate activity",
      diet: "Vegetarian",
      cuisines: "Gujarati, South Indian",
      budget: "₹300 per day",
    });
  });

  it("returns no personalized summary when there is no valid saved assessment", () => {
    expect(getDashboardAssessmentSummary(null)).toBeNull();
    expect(getDashboardAssessmentSummary({
      ...createEmptyAssessmentForm(),
      age: "32",
      heightCm: "172",
      weightKg: "74.5",
      goal: "",
      activityLevel: "moderate",
      dietaryPattern: "vegetarian",
    })).toBeNull();
  });
});
