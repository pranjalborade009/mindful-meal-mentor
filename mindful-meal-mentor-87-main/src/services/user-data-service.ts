import type {
  AssessmentFormState,
  DiaryNutritionSnapshot,
  FoodDiaryEntry,
  NutritionDataQuality,
  NutritionInfo,
  NutritionProvenance,
  ServingSize,
} from "@/types";

export interface UserDataProfile {
  id: string;
  displayName: string;
}

export interface AssessmentRecord {
  id: string;
  answers: AssessmentFormState;
  createdAt: string;
}

export interface DiaryRecord extends FoodDiaryEntry {
  nutritionSnapshot: DiaryNutritionSnapshot;
  sourceIdentifier: string;
  sourceName: string;
  sourceType: string;
  sourceReference: string | null;
  externalSource: string | null;
  externalFoodId: string | null;
}

export interface UserDataAdapter {
  getCurrentUser(): Promise<{ id: string } | null>;
  loadProfile(userId: string): Promise<UserDataProfile | null>;
  updateProfile(userId: string, displayName: string): Promise<UserDataProfile>;
  loadLatestAssessment(userId: string): Promise<AssessmentRecord | null>;
  insertAssessment(userId: string, answers: AssessmentFormState): Promise<AssessmentRecord>;
  listDiaryEntries(userId: string, date: string): Promise<DiaryRecord[]>;
  insertDiaryEntry(userId: string, entry: FoodDiaryEntry, snapshot: DiaryNutritionSnapshot): Promise<DiaryRecord>;
  updateDiaryEntry(userId: string, id: string, changes: Pick<FoodDiaryEntry, "meal" | "portion">, snapshot: DiaryNutritionSnapshot): Promise<DiaryRecord>;
  deleteDiaryEntry(userId: string, id: string): Promise<void>;
}

function requireText(value: unknown, name: string, maxLength: number): string {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw new TypeError(`${name} is required and must be at most ${maxLength} characters.`);
  }
  return value.trim();
}

function isDateOnly(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function assertAssessmentFormState(answers: unknown): asserts answers is AssessmentFormState {
  if (typeof answers !== "object" || answers === null || Array.isArray(answers)) {
    throw new TypeError("Assessment answers are invalid.");
  }
  const form = answers as Record<string, unknown>;
  for (const key of [
    "age", "heightCm", "weightKg", "goal", "activityLevel", "dietaryPattern",
    "favoriteFoods", "dislikedFoods", "allergies", "intolerances", "budget",
    "cookingPreference", "healthConsiderations",
  ]) {
    if (typeof form[key] !== "string") throw new TypeError("Assessment answers are invalid.");
  }
  for (const key of ["preferredCuisines", "mealTimingPreferences"]) {
    if (!Array.isArray(form[key]) || !form[key].every((item) => typeof item === "string")) {
      throw new TypeError("Assessment answers are invalid.");
    }
  }
  const typedAnswers = answers as AssessmentFormState;
  const age = Number(typedAnswers.age);
  const height = Number(typedAnswers.heightCm);
  const weight = Number(typedAnswers.weightKg);
  if (!Number.isInteger(age) || age < 1 || age > 120) throw new TypeError("Enter a valid age before saving.");
  if (!Number.isFinite(height) || height < 80 || height > 250) throw new TypeError("Enter a valid height before saving.");
  if (!Number.isFinite(weight) || weight < 20 || weight > 500) throw new TypeError("Enter a valid weight before saving.");
  if (!["weight-loss", "maintenance", "weight-gain"].includes(typedAnswers.goal)) throw new TypeError("Choose a valid goal before saving.");
  if (!["sedentary", "light", "moderate", "high"].includes(typedAnswers.activityLevel)) throw new TypeError("Choose a valid activity level before saving.");
  if (!["omnivore", "vegetarian", "eggetarian", "pescatarian", "vegan", "other"].includes(typedAnswers.dietaryPattern)) throw new TypeError("Choose a valid dietary pattern before saving.");
  if (!["", "home-cooking", "quick-meals", "minimal-cooking", "mix"].includes(typedAnswers.cookingPreference)) {
    throw new TypeError("Choose a valid cooking preference.");
  }
  for (const key of [
    "favoriteFoods", "dislikedFoods", "allergies", "intolerances",
    "healthConsiderations", "budget",
  ] as const) {
    if (typedAnswers[key].length > 500) throw new TypeError("Assessment text fields must be at most 500 characters.");
  }
  if (
    typedAnswers.preferredCuisines.some((value) => value.length > 120) ||
    typedAnswers.mealTimingPreferences.some((value) => value.length > 120)
  ) throw new TypeError("Assessment preferences must be at most 120 characters each.");
}

export function assertDiaryNutritionSnapshot(value: unknown): asserts value is DiaryNutritionSnapshot {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("A saved diary entry has invalid nutrition data.");
  }
  const snapshot = value as Record<string, unknown>;
  const nutrition = snapshot["nutrition"];
  const provenance = snapshot["provenance"];
  const isRecord = (item: unknown): item is Record<string, unknown> =>
    typeof item === "object" && item !== null && !Array.isArray(item);
  const nutrients = ["caloriesKcal", "proteinG", "carbohydrateG", "fatG", "fiberG"];
  const isAmount = (amount: unknown): boolean =>
    amount === null || (typeof amount === "number" && Number.isFinite(amount));
  const servingSize = isRecord(nutrition) ? nutrition["servingSize"] : null;
  if (
    typeof snapshot["foodName"] !== "string" ||
    !["complete", "partial", "unavailable"].includes(String(snapshot["completeness"])) ||
    !Array.isArray(snapshot["missingNutrients"]) ||
    !snapshot["missingNutrients"].every((item) => typeof item === "string") ||
    !["verified", "estimated", "user-entered"].includes(String(snapshot["dataQuality"])) ||
    !isRecord(nutrition) ||
    !isRecord(servingSize) ||
    typeof servingSize["quantity"] !== "number" || !Number.isFinite(servingSize["quantity"]) ||
    !["g", "ml", "piece", "serving"].includes(String(servingSize["unit"])) ||
    !["per-serving", "per-100g"].includes(String(nutrition["basis"])) ||
    !nutrients.every((key) => isAmount(nutrition[key])) ||
    !isRecord(provenance) ||
    typeof provenance["sourceName"] !== "string" ||
    !["demo", "database", "food-label", "user", "calculated"].includes(String(provenance["sourceType"]))
  ) throw new Error("A saved diary entry has invalid nutrition data.");

  if (nutrition["micronutrients"] !== undefined) {
    if (!isRecord(nutrition["micronutrients"])) throw new Error("A saved diary entry has invalid nutrition data.");
    for (const amount of Object.values(nutrition["micronutrients"])) {
      if (!isRecord(amount) || !isAmount(amount["value"]) || typeof amount["unit"] !== "string") {
        throw new Error("A saved diary entry has invalid nutrition data.");
      }
    }
  }
}

function validateDiaryEntry(entry: FoodDiaryEntry): void {
  requireText(entry.id, "Entry ID", 120);
  requireText(entry.foodId, "Food ID", 240);
  if (!isDateOnly(entry.date)) throw new TypeError("Diary date must be a valid YYYY-MM-DD date.");
  if (!["Breakfast", "Lunch", "Dinner", "Snack"].includes(entry.meal)) throw new TypeError("Choose a valid meal.");
  const portion: ServingSize = entry.portion;
  if (!Number.isFinite(portion.quantity) || portion.quantity <= 0 || portion.quantity > 100_000) throw new TypeError("Enter a valid portion quantity.");
  if (!["g", "ml", "piece", "serving"].includes(portion.unit)) throw new TypeError("Choose a valid portion unit.");
  if (portion.weightGrams !== undefined && (!Number.isFinite(portion.weightGrams) || portion.weightGrams <= 0)) {
    throw new TypeError("Enter a valid portion weight.");
  }
}

export function createUserDataService(adapter: UserDataAdapter) {
  async function userId(): Promise<string> {
    const user = await adapter.getCurrentUser();
    if (!user) throw new Error("Your session has expired. Please sign in again.");
    return user.id;
  }

  return {
    async getProfile() {
      const id = await userId();
      const profile = await adapter.loadProfile(id);
      if (!profile) throw new Error("Your profile could not be found.");
      return profile;
    },
    async updateDisplayName(displayName: string) {
      const id = await userId();
      return adapter.updateProfile(id, requireText(displayName, "Display name", 120));
    },
    async getLatestAssessment() {
      return adapter.loadLatestAssessment(await userId());
    },
    async submitAssessment(answers: AssessmentFormState) {
      assertAssessmentFormState(answers);
      return adapter.insertAssessment(await userId(), answers);
    },
    async listDiaryEntries(date: string) {
      if (!isDateOnly(date)) throw new TypeError("Diary date must be a valid YYYY-MM-DD date.");
      return adapter.listDiaryEntries(await userId(), date);
    },
    async addDiaryEntry(entry: FoodDiaryEntry, snapshot: DiaryNutritionSnapshot) {
      validateDiaryEntry(entry);
      return adapter.insertDiaryEntry(await userId(), entry, snapshot);
    },
    async updateDiaryEntry(
      id: string,
      changes: Pick<FoodDiaryEntry, "meal" | "portion">,
      snapshot: DiaryNutritionSnapshot,
    ) {
      requireText(id, "Entry ID", 120);
      validateDiaryEntry({ id, foodId: "existing", date: "2000-01-01", ...changes });
      return adapter.updateDiaryEntry(await userId(), id, changes, snapshot);
    },
    async deleteDiaryEntry(id: string) {
      return adapter.deleteDiaryEntry(await userId(), requireText(id, "Entry ID", 120));
    },
  };
}

export function createDiarySnapshot(food: {
  name: string;
  nutrition: NutritionInfo;
  nutritionDataQuality: NutritionDataQuality;
  nutritionProvenance: NutritionProvenance;
  externalDataId?: { source: string; id: number; release: string };
}, calculated: {
  nutrition: NutritionInfo;
  completeness: "complete" | "partial" | "unavailable";
  missingNutrients: string[];
  dataQuality: NutritionDataQuality;
  provenance: NutritionProvenance;
}): DiaryNutritionSnapshot {
  return {
    foodName: food.name,
    nutrition: calculated.nutrition,
    completeness: calculated.completeness,
    missingNutrients: calculated.missingNutrients,
    dataQuality: calculated.dataQuality,
    provenance: calculated.provenance,
    ...(food.externalDataId ? { externalDataId: food.externalDataId } : {}),
  };
}
