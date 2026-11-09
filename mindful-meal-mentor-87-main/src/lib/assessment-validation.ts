import type { AssessmentFormState } from "@/types";

export const ASSESSMENT_STEPS = [
  "About you",
  "Goals and routine",
  "Food preferences",
  "Everyday needs",
  "Review",
] as const;

export function createEmptyAssessmentForm(): AssessmentFormState {
  return {
    age: "",
    heightCm: "",
    weightKg: "",
    goal: "",
    activityLevel: "",
    dietaryPattern: "",
    preferredCuisines: [],
    favoriteFoods: "",
    dislikedFoods: "",
    allergies: "",
    intolerances: "",
    mealTimingPreferences: [],
    budget: "",
    cookingPreference: "",
    healthConsiderations: "",
  };
}

export function validateAssessmentStep(step: number, form: AssessmentFormState): Record<string, string> {
  const errors: Record<string, string> = {};

  if (step === 0) {
    const age = Number(form.age);
    const height = Number(form.heightCm);
    const weight = Number(form.weightKg);

    if (!form.age.trim()) errors["age"] = "Enter your age.";
    else if (!Number.isInteger(age) || age < 1 || age > 120) errors["age"] = "Enter an age from 1 to 120.";

    if (!form.heightCm.trim()) errors["heightCm"] = "Enter your height.";
    else if (!Number.isFinite(height) || height < 80 || height > 250) errors["heightCm"] = "Enter a height from 80 to 250 cm.";

    if (!form.weightKg.trim()) errors["weightKg"] = "Enter your current weight.";
    else if (!Number.isFinite(weight) || weight < 20 || weight > 500) errors["weightKg"] = "Enter a weight from 20 to 500 kg.";
  }

  if (step === 1) {
    if (!form.goal) errors["goal"] = "Choose a goal to continue.";
    if (!form.activityLevel) errors["activityLevel"] = "Choose an activity level to continue.";
    if (!form.dietaryPattern) errors["dietaryPattern"] = "Choose a dietary pattern to continue.";
  }

  return errors;
}

export function getNextAssessmentStep(step: number): number {
  return Math.min(step + 1, ASSESSMENT_STEPS.length - 1);
}

export function getPreviousAssessmentStep(step: number): number {
  return Math.max(step - 1, 0);
}