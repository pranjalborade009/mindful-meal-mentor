import type { Food, FoodCategory, FoodPreparationState, MicronutrientAmount, SourceFoodIngredient } from "../types/index.ts";

export const FNDDS_RELEASE = "2021-2023 (2024-10-31)";
export const FNDDS_SOURCE_NAME = "USDA Food and Nutrient Database for Dietary Studies (FNDDS)";

export const FNDDS_SELECTED_FDC_IDS = [
  2706538, 2708730,
] as const;

const FNDDS_FOOD_IMAGES: Readonly<Record<number, {
  image: string;
  credit: string;
  sourceUrl: string;
}>> = {
  2706538: {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5b/Chicken_biriyani-_My_cafe_restaurant_-_Meghalaya_DSC_009.jpg/960px-Chicken_biriyani-_My_cafe_restaurant_-_Meghalaya_DSC_009.jpg",
    credit: "Gitika Gayan / Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Chicken_biriyani-_My_cafe_restaurant_-_Meghalaya_DSC_009.jpg",
  },
  2708730: {
    image: "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d9/Samosa_and_Tamoto_Chilli_Ketchup_%E2%80%93_Kolkata.jpg/960px-Samosa_and_Tamoto_Chilli_Ketchup_%E2%80%93_Kolkata.jpg",
    credit: "TAPAS KUMAR HALDER / Wikimedia Commons",
    sourceUrl: "https://commons.wikimedia.org/wiki/File:Samosa_and_Tamoto_Chilli_Ketchup_%E2%80%93_Kolkata.jpg",
  },
};

export interface FnddsImportReport {
  sourceRecordCount: number;
  validFoodCount: number;
  skippedMissingIdCount: number;
  skippedInvalidCount: number;
  duplicateFdcIdCount: number;
  unavailableSelectedIds: number[];
}

export interface FnddsImportResult {
  foods: Food[];
  report: FnddsImportReport;
}

interface NutrientValue {
  amount: number | null;
  unit: string;
}

const CORE_NUTRIENT_UNITS: Readonly<Record<number, string>> = {
  1003: "g",
  1004: "g",
  1005: "g",
  1008: "kcal",
  1079: "g",
  2033: "g",
};

const MICRONUTRIENTS: { id: number; key: string }[] = [
  { id: 1087, key: "calcium" }, { id: 1089, key: "iron" }, { id: 1090, key: "magnesium" },
  { id: 1091, key: "phosphorus" }, { id: 1092, key: "potassium" }, { id: 1093, key: "sodium" },
  { id: 1095, key: "zinc" }, { id: 1098, key: "copper" }, { id: 1103, key: "selenium" },
  { id: 1106, key: "vitaminA" }, { id: 1109, key: "vitaminE" }, { id: 1114, key: "vitaminD" },
  { id: 1162, key: "vitaminC" }, { id: 1165, key: "thiamin" }, { id: 1166, key: "riboflavin" },
  { id: 1167, key: "niacin" }, { id: 1175, key: "vitaminB6" }, { id: 1177, key: "folate" },
  { id: 1178, key: "vitaminB12" }, { id: 1185, key: "vitaminK" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function textValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function getNutrient(raw: Record<string, unknown>, ids: readonly number[]): NutrientValue | null {
  const nutrients = raw["foodNutrients"];
  if (!Array.isArray(nutrients)) return null;

  for (const id of ids) {
    const record = nutrients.find((item) => {
      if (!isRecord(item)) return false;
      const nutrient = isRecord(item["nutrient"]) ? item["nutrient"] : undefined;
      return nutrient?.["id"] === id || item["nutrientId"] === id;
    });
    if (!isRecord(record)) continue;

    const nutrient = isRecord(record["nutrient"]) ? record["nutrient"] : undefined;
    const amount = finiteNumber(record["amount"] ?? record["value"]);
    const unit = textValue(nutrient?.["unitName"]) ?? textValue(record["unitName"]) ?? "";
    const expectedUnit = CORE_NUTRIENT_UNITS[id];
    return { amount: expectedUnit && unit.toLocaleLowerCase() !== expectedUnit ? null : amount, unit };
  }
  return null;
}

function additionalDescriptions(raw: Record<string, unknown>): string[] {
  const attributes = Array.isArray(raw["foodAttributes"]) ? raw["foodAttributes"] : [];
  const descriptions = attributes.flatMap((attribute) => {
    if (!isRecord(attribute)) return [];
    const type = isRecord(attribute["foodAttributeType"]) ? attribute["foodAttributeType"] : undefined;
    const name = textValue(type?.["name"]);
    const value = textValue(attribute["value"]);
    return name === "Additional Description" && value ? [value] : [];
  });
  return [...new Set(descriptions)];
}

function mapCategory(description: string | undefined, name: string): FoodCategory {
  const sourceCategory = description?.toLocaleLowerCase() ?? "";
  if (/\btea\b/.test(sourceCategory)) return "beverage";
  if (/samosa|papad|barfi|burfi|ladoo/i.test(name)) return "snack";
  if (/cheese/.test(sourceCategory)) return "ingredient";
  if (/mixed dishes|vegetable dishes|pudding|turnovers|pancakes|yeast breads|candy|cereals|grits/.test(sourceCategory)) return "dish";
  return "other";
}

function preparationState(name: string): FoodPreparationState {
  if (/\braw\b/i.test(name)) return "raw";
  if (/\bcooked\b|\bboiled\b|\broasted\b|\bbaked\b|\bfried\b|\bsteamed\b|\bgrilled\b/i.test(name)) return "cooked";
  return "prepared";
}

function parsePortions(raw: Record<string, unknown>) {
  const portions = Array.isArray(raw["foodPortions"]) ? raw["foodPortions"] : [];
  const servingOptions: NonNullable<Food["servingOptions"]> = [];
  for (const portion of portions) {
    if (!isRecord(portion)) continue;
    const weightGrams = finiteNumber(portion["gramWeight"]);
    if (weightGrams === null || weightGrams <= 0) continue;
    const description = textValue(portion["portionDescription"]);
    if (!description) continue;
    servingOptions.push({ quantity: 1, unit: "serving", description, weightGrams });
  }
  return servingOptions.filter((option, index, options) => options.findIndex((other) => other.description === option.description && other.weightGrams === option.weightGrams) === index);
}

function parseSourceIngredients(raw: Record<string, unknown>): SourceFoodIngredient[] {
  const inputs = Array.isArray(raw["inputFoods"]) ? raw["inputFoods"] : [];
  return inputs.flatMap((input) => {
    if (!isRecord(input)) return [];
    const description = textValue(input["ingredientDescription"]) ?? textValue(input["foodDescription"]);
    if (!description) return [];
    const unit = textValue(input["unit"]);
    const portionDescription = textValue(input["portionDescription"]);
    return [{
      description,
      weightGrams: finiteNumber(input["ingredientWeight"]),
      sourceCode: finiteNumber(input["ingredientCode"]),
      quantity: finiteNumber(input["amount"]),
      ...(unit ? { unit } : {}),
      ...(portionDescription ? { portionDescription } : {}),
    }];
  }).sort((a, b) => (a.sourceCode ?? 0) - (b.sourceCode ?? 0));
}

function normalizeFood(raw: Record<string, unknown>): Food | null {
  const fdcId = finiteNumber(raw["fdcId"]);
  const name = textValue(raw["description"]);
  if (fdcId === null || !Number.isInteger(fdcId) || fdcId <= 0 || !name || raw["dataType"] !== "Survey (FNDDS)") return null;

  const aliases = additionalDescriptions(raw);
  const cuisineEvidence = [name, ...aliases].some((value) => /\bindian\b/i.test(value));
  const energy = getNutrient(raw, [1008]);
  const protein = getNutrient(raw, [1003]);
  const carbohydrate = getNutrient(raw, [1005]);
  const fat = getNutrient(raw, [1004]);
  const fiber = getNutrient(raw, [1079, 2033]);
  const micronutrients: Record<string, MicronutrientAmount> = {};
  for (const item of MICRONUTRIENTS) {
    const nutrient = getNutrient(raw, [item.id]);
    if (nutrient) micronutrients[item.key] = { value: nutrient.amount, unit: nutrient.unit };
  }

  const values = [energy?.amount, protein?.amount, carbohydrate?.amount, fat?.amount, fiber?.amount, ...Object.values(micronutrients).map((item) => item.value)];
  if (!values.some((value) => value !== null && value !== undefined)) return null;

  const foodCategory = isRecord(raw["wweiaFoodCategory"])
    ? textValue(raw["wweiaFoodCategory"]["wweiaFoodCategoryDescription"])
    : undefined;
  const portions = parsePortions(raw);
  const sourceIngredients = parseSourceIngredients(raw);
  const calorieDerivation = getNutrient(raw, [1008]);
  const publicationDate = textValue(raw["publicationDate"]) ?? "2024-10-31";
  const servingDescription = portions[0]?.description ?? "100 g";
  const cuisine = cuisineEvidence ? "Indian" : "Unspecified";
  const image = FNDDS_FOOD_IMAGES[fdcId];

  return {
    id: `usda-fdc-${fdcId}`,
    name,
    ...(aliases.length ? { alternativeNames: aliases } : {}),
    cuisine,
    category: mapCategory(foodCategory, name),
    meal: null,
    diet: "Unspecified",
    dietaryLabels: [],
    allergens: null,
    allergenDataStatus: "unknown",
    ...(image ? {
      image: image.image,
      imageAttribution: {
        credit: image.credit,
        sourceUrl: image.sourceUrl,
        licenseName: "CC BY-SA 4.0",
        licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
      },
    } : {}),
    source: "usda-fooddata-central",
    nutrition: {
      servingSize: { quantity: 100, unit: "g", description: "100 g edible portion" },
      basis: "per-100g",
      caloriesKcal: energy?.amount ?? null,
      proteinG: protein?.amount ?? null,
      carbohydrateG: carbohydrate?.amount ?? null,
      fatG: fat?.amount ?? null,
      fiberG: fiber?.amount ?? null,
      ...(Object.keys(micronutrients).length ? { micronutrients } : {}),
    },
    nutritionDataQuality: "estimated",
    nutritionProvenance: {
      sourceName: "USDA FoodData Central FNDDS 2021-2023",
      sourceType: "database",
      reference: `https://fdc.nal.usda.gov/food-details/${fdcId}/nutrients`,
      note: `FNDDS survey food published ${publicationDate}; nutrients are per 100 g. This standardized survey representation is not a restaurant-specific recipe. Energy derivation: ${calorieDerivation?.unit ? "USDA-provided FDC value" : "unavailable"}. Cuisine is assigned only where the source explicitly says Indian.`,
    },
    externalDataId: { source: "usda-fooddata-central", id: fdcId, release: "FNDDS 2021-2023 (2024-10-31)" },
    preparationState: preparationState(name),
    servingOptions: portions,
    ...(sourceIngredients.length ? { sourceIngredients } : {}),
    ...(sourceIngredients.length ? { ingredients: [...new Set(sourceIngredients.map((item) => item.description))] } : {}),
  };
}

/** Normalizes only the explicitly selected FNDDS food records; unknown fields remain unknown. */
export function normalizeFnddsFoods(input: unknown): FnddsImportResult {
  const sourceFoods = Array.isArray(input)
    ? input
    : isRecord(input) && Array.isArray(input["SurveyFoods"])
      ? input["SurveyFoods"]
      : [];
  const allowedIds = new Set<number>(FNDDS_SELECTED_FDC_IDS);
  const selectedFoods = sourceFoods.filter((item) => isRecord(item) && allowedIds.has(finiteNumber(item["fdcId"]) ?? -1));
  const byId = new Map<number, Food>();
  let skippedInvalidCount = 0;
  let duplicateFdcIdCount = 0;
  for (const item of selectedFoods) {
    if (!isRecord(item)) continue;
    const id = finiteNumber(item["fdcId"]);
    const food = normalizeFood(item);
    if (id === null || !food) {
      skippedInvalidCount += 1;
      continue;
    }
    if (byId.has(id)) {
      duplicateFdcIdCount += 1;
      continue;
    }
    byId.set(id, food);
  }
  const foods = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name) || (a.externalDataId?.id ?? 0) - (b.externalDataId?.id ?? 0));
  return {
    foods,
    report: {
      sourceRecordCount: selectedFoods.length,
      validFoodCount: foods.length,
      skippedMissingIdCount: 0,
      skippedInvalidCount,
      duplicateFdcIdCount,
      unavailableSelectedIds: FNDDS_SELECTED_FDC_IDS.filter((id) => !byId.has(id)),
    },
  };
}