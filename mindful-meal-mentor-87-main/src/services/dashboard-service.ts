import type { AssessmentFormState } from "@/types";

export interface DashboardAssessmentSummary {
  age: string;
  height: string;
  weight: string;
  goal: string;
  activity: string;
  diet: string;
  cuisines: string;
  budget: string;
}

const GOALS: Record<string, string> = {
  "weight-loss": "Weight loss",
  maintenance: "Weight maintenance",
  "weight-gain": "Weight gain",
};

const ACTIVITY_LEVELS: Record<string, string> = {
  sedentary: "Mostly sitting",
  light: "Light activity",
  moderate: "Moderate activity",
  high: "High activity",
};

const DIETARY_PATTERNS: Record<string, string> = {
  omnivore: "Omnivore",
  vegetarian: "Vegetarian",
  eggetarian: "Eggetarian",
  pescatarian: "Pescatarian",
  vegan: "Vegan",
  other: "Other",
};

export function getDashboardAssessmentSummary(
  answers: AssessmentFormState | null,
): DashboardAssessmentSummary | null {
  if (!answers) return null;
  const goal = GOALS[answers.goal];
  const activity = ACTIVITY_LEVELS[answers.activityLevel];
  const diet = DIETARY_PATTERNS[answers.dietaryPattern];
  if (!goal || !activity || !diet) return null;
  return {
    age: `${answers.age} years`,
    height: `${answers.heightCm} cm`,
    weight: `${answers.weightKg} kg`,
    goal,
    activity,
    diet,
    cuisines: answers.preferredCuisines.join(", "),
    budget: answers.budget.trim(),
  };
}
