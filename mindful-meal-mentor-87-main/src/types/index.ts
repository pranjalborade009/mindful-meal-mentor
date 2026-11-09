export type DietType = "Vegetarian" | "Non-vegetarian" | "Vegan" | "Unspecified";
export type MealType = "Breakfast" | "Lunch" | "Dinner" | "Snack";
export type FoodPreparationState = "raw" | "cooked" | "prepared" | "not-specified";
export type FoodCategory = "dish" | "ingredient" | "beverage" | "snack" | "other";
export type KnownRegionalCuisine =
  "Maharashtrian" | "Gujarati" | "Bengali" | "Punjabi" | "South Indian" | "Other Indian";
export type RegionalCuisine = KnownRegionalCuisine | (string & {});
export type ServingUnit = "g" | "ml" | "piece" | "serving";
export type NutritionBasis = "per-serving" | "per-100g";
export type NutritionDataQuality = "verified" | "estimated" | "user-entered";
export type NutrientKey = "caloriesKcal" | "proteinG" | "carbohydrateG" | "fatG" | "fiberG";

export interface ServingSize {
  quantity: number;
  unit: ServingUnit;
  description?: string;
  /** Total gram weight for the quantity above; required for cross-unit mass calculations. */
  weightGrams?: number;
}

export interface NutritionInfo {
  /** Reference portion for per-serving data, or an informational serving size for per-100g data. */
  servingSize: ServingSize;
  basis: NutritionBasis;
  caloriesKcal: number | null;
  proteinG: number | null;
  carbohydrateG: number | null;
  fatG: number | null;
  fiberG: number | null;
  micronutrients?: Record<string, MicronutrientAmount>;
}

export interface MicronutrientAmount {
  value: number | null;
  unit: string;
}

export interface SourceFoodIngredient {
  description: string;
  weightGrams: number | null;
  sourceCode: number | null;
  quantity: number | null;
  unit?: string;
  portionDescription?: string;
}

export interface NutritionProvenance {
  sourceName: string;
  sourceType: "demo" | "database" | "food-label" | "user" | "calculated";
  reference?: string;
  note?: string;
}

export interface ImageAttribution {
  credit: string;
  sourceUrl: string;
  licenseName: string;
  licenseUrl: string;
}

export interface SourceFoodIngredient {
  description: string;
  weightGrams: number | null;
  sourceCode: number | null;
  quantity: number | null;
  unit?: string;
  portionDescription?: string;
}

export type AssessmentGoal = "weight-loss" | "weight-gain" | "maintenance";
export type AssessmentActivityLevel = "sedentary" | "light" | "moderate" | "high";
export type AssessmentDietaryPattern =
  "omnivore" | "vegetarian" | "eggetarian" | "pescatarian" | "vegan" | "other";
export type AssessmentCookingPreference =
  "home-cooking" | "quick-meals" | "minimal-cooking" | "mix";
export type HeightUnit = "cm" | "ft-in";
export type WeightUnit = "kg" | "lb";

export interface AssessmentMeasurement<Unit extends string> {
  value: number;
  unit: Unit;
}

export interface PersonalAssessment {
  age: number;
  height: AssessmentMeasurement<HeightUnit>;
  currentWeight: AssessmentMeasurement<WeightUnit>;
  goal: AssessmentGoal;
  activityLevel: AssessmentActivityLevel;
  dietaryPattern: AssessmentDietaryPattern;
  preferredCuisines: string[];
  favoriteFoods?: string;
  dislikedFoods?: string;
  allergies?: string;
  intolerances?: string;
  mealTimingPreferences: string[];
  budget?: string;
  cookingPreference?: AssessmentCookingPreference;
  healthConsiderations?: string;
}

export interface AssessmentFormState {
  age: string;
  heightCm: string;
  weightKg: string;
  goal: AssessmentGoal | "";
  activityLevel: AssessmentActivityLevel | "";
  dietaryPattern: AssessmentDietaryPattern | "";
  preferredCuisines: string[];
  favoriteFoods: string;
  dislikedFoods: string;
  allergies: string;
  intolerances: string;
  mealTimingPreferences: string[];
  budget: string;
  cookingPreference: AssessmentCookingPreference | "";
  healthConsiderations: string;
}

export interface Food {
  id: string;
  name: string;
  alternativeNames?: string[];
  cuisine: string;
  regionalOrigin?: RegionalCuisine;
  category: FoodCategory;
  meal: MealType | null;
  diet: DietType;
  dietaryLabels: string[];
  allergens: string[] | null;
  allergenDataStatus: "complete" | "incomplete" | "unknown";
  image?: string;
  imageAttribution?: ImageAttribution;
  source: "demo" | "api" | "user-entered" | "calculated" | "usda-fooddata-central";
  nutrition: NutritionInfo;
  nutritionDataQuality: NutritionDataQuality;
  nutritionProvenance: NutritionProvenance;
  externalDataId?: { source: "usda-fooddata-central"; id: number; release: string };
  preparationState?: FoodPreparationState;
  servingOptions?: ServingSize[];
  sourceIngredients?: SourceFoodIngredient[];
  priceInr?: number;
  ingredients?: string[];
  preparationMethod?: string;
}

export type CustomFood = Food & { source: "user-entered" };

export type CustomFoodInput = Omit<Food, "source" | "nutritionDataQuality" | "nutritionProvenance">;

export interface RecipeIngredient {
  foodId: string;
  quantity: ServingSize;
}

export interface Recipe {
  id: string;
  name: string;
  cuisine: string;
  regionalOrigin?: RegionalCuisine;
  meal: MealType;
  ingredients: RecipeIngredient[];
  preparationMethod?: string;
  servings: number;
}

export interface RecipeNutritionResult {
  nutrition: NutritionInfo;
  dataQuality: "estimated";
  completeness: "complete" | "partial" | "unavailable";
  missingIngredientIds: string[];
}

export interface FoodDiaryEntry {
  id: string;
  foodId: string;
  date: string;
  meal: MealType;
  portion: ServingSize;
  nutritionSnapshot?: DiaryNutritionSnapshot;
}

export interface DiaryNutritionSnapshot {
  foodName: string;
  nutrition: NutritionInfo;
  completeness: "complete" | "partial" | "unavailable";
  missingNutrients: string[];
  dataQuality: NutritionDataQuality;
  provenance: NutritionProvenance;
  externalDataId?: { source: string; id: number; release: string } | null;
}
