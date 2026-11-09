import { afterEach, describe, expect, it } from "vitest";
import {
  createEmptyAssessmentForm,
  getNextAssessmentStep,
  getPreviousAssessmentStep,
  validateAssessmentStep,
} from "@/lib/assessment-validation";
import { clearLegacyAssessmentDraft } from "@/services/assessment-storage";

afterEach(() => clearLegacyAssessmentDraft());

describe("personal assessment", () => {
  it("requires valid measurements and required goal selections", () => {
    const form = createEmptyAssessmentForm();
    expect(validateAssessmentStep(0, form)).toEqual({
      age: "Enter your age.",
      heightCm: "Enter your height.",
      weightKg: "Enter your current weight.",
    });
    expect(validateAssessmentStep(1, form)).toEqual({
      goal: "Choose a goal to continue.",
      activityLevel: "Choose an activity level to continue.",
      dietaryPattern: "Choose a dietary pattern to continue.",
    });
  });

  it("accepts valid required answers and does not require optional answers", () => {
    const form = {
      ...createEmptyAssessmentForm(),
      age: "32",
      heightCm: "172",
      weightKg: "74.5",
      goal: "maintenance" as const,
      activityLevel: "moderate" as const,
      dietaryPattern: "vegetarian" as const,
    };

    expect(validateAssessmentStep(0, form)).toEqual({});
    expect(validateAssessmentStep(1, form)).toEqual({});
    expect(validateAssessmentStep(2, form)).toEqual({});
    expect(validateAssessmentStep(3, form)).toEqual({});
  });

  it("rejects out-of-range measurements and missing required choices", () => {
    const form = {
      ...createEmptyAssessmentForm(),
      age: "0",
      heightCm: "251",
      weightKg: "19",
    };

    expect(validateAssessmentStep(0, form)).toEqual({
      age: "Enter an age from 1 to 120.",
      heightCm: "Enter a height from 80 to 250 cm.",
      weightKg: "Enter a weight from 20 to 500 kg.",
    });
    expect(validateAssessmentStep(1, form)).toEqual({
      goal: "Choose a goal to continue.",
      activityLevel: "Choose an activity level to continue.",
      dietaryPattern: "Choose a dietary pattern to continue.",
    });
  });

  it("supports back and continue navigation across assessment steps", () => {
    expect(getNextAssessmentStep(1)).toBe(2);
    expect(getNextAssessmentStep(4)).toBe(4);
    expect(getPreviousAssessmentStep(3)).toBe(2);
    expect(getPreviousAssessmentStep(0)).toBe(0);
  });

  it("clears drafts left by the previous local-storage implementation", () => {
    window.localStorage.setItem("nutrify-assessment-draft-v1", JSON.stringify({
      version: 1,
      step: 2,
      form: { age: "32", allergies: "peanuts" },
    }));
    clearLegacyAssessmentDraft();
    expect(window.localStorage.getItem("nutrify-assessment-draft-v1")).toBeNull();
  });
});