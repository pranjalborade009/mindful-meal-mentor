import type { Food, FoodCategory, FoodPreparationState, MicronutrientAmount } from "../types/index.ts";

export const USDA_FDC_RELEASE = "2026-04-30";
export const USDA_FDC_SOURCE_NAME = "USDA FoodData Central Foundation Foods";

export interface UsdaImportReport {
  sourceRecordCount: number;
  validFoodCount: number;
  skippedMissingIdCount: number;
  skippedInvalidCount: number;
  duplicateFdcIdCount: number;
}

export interface UsdaImportResult {
  foods: Food[];
  report: UsdaImportReport;
}

interface NutrientValue {
  amount: number | null;
  unit: string;
  derivation?: string;
  unitMismatch?: boolean;
}

const CORE_NUTRIENT_UNITS: Readonly<Record<number, string>> = {
  1003: "g",
  1004: "g",
  1005: "g",
  1008: "kcal",
  1079: "g",
  2033: "g",
  2047: "kcal",
  2048: "kcal",
};

const MICRONUTRIENTS: { id: number; key: string }[] = [
  { id: 1087, key: "calcium" },
  { id: 1089, key: "iron" },
  { id: 1090, key: "magnesium" },
  { id: 1091, key: "phosphorus" },
  { id: 1092, key: "potassium" },
  { id: 1093, key: "sodium" },
  { id: 1095, key: "zinc" },
  { id: 1098, key: "copper" },
  { id: 1101, key: "manganese" },
  { id: 1103, key: "selenium" },
  { id: 1106, key: "vitaminA" },
  { id: 1109, key: "vitaminE" },
  { id: 1114, key: "vitaminD" },
  { id: 1162, key: "vitaminC" },
  { id: 1165, key: "thiamin" },
  { id: 1166, key: "riboflavin" },
  { id: 1167, key: "niacin" },
  { id: 1175, key: "vitaminB6" },
  { id: 1177, key: "folate" },
  { id: 1178, key: "vitaminB12" },
  { id: 1185, key: "vitaminK" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getNutrientDetails(raw: Record<string, unknown>, ids: readonly number[]): NutrientValue | null {
  const nutrients = raw["foodNutrients"];
  if (!Array.isArray(nutrients)) return null;

  for (const id of ids) {
    const match = nutrients.find((item) => {
      if (!isRecord(item)) return false;
      const nutrient = isRecord(item["nutrient"]) ? item["nutrient"] : undefined;
      return nutrient?.["id"] === id || item["nutrientId"] === id;
    });
    if (!isRecord(match)) continue;

    const nutrient = isRecord(match["nutrient"]) ? match["nutrient"] : undefined;
    const amount = finiteNumber(match["amount"] ?? match["value"]);
    const loq = finiteNumber(match["loq"] ?? match["limitOfQuantification"]);
    const unit = typeof nutrient?.["unitName"] === "string"
      ? nutrient["unitName"]
      : typeof match["unitName"] === "string"
        ? match["unitName"]
        : "";
    const derivation = isRecord(match["foodNutrientDerivation"]) && typeof match["foodNutrientDerivation"]["description"] === "string"
      ? match["foodNutrientDerivation"]["description"]
      : undefined;
    const expectedUnit = CORE_NUTRIENT_UNITS[id];
    const unitMismatch = expectedUnit !== undefined && unit.trim().toLocaleLowerCase() !== expectedUnit;

    return {
      amount: unitMismatch || (amount === 0 && loq !== null && loq > 0) ? null : amount,
      unit,
      ...(derivation ? { derivation } : {}),
      ...(unitMismatch ? { unitMismatch: true } : {}),
    };
  }

  return null;
}

function textValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function mapCategory(description: string | undefined): FoodCategory {
  const category = description?.toLocaleLowerCase() ?? "";
  if (/beverage|juice|drink/.test(category)) return "beverage";
  if (/snack/.test(category)) return "snack";
  if (/restaurant|fast food|meal|entree|side dish/.test(category)) return "dish";
  if (/vegetable|fruit|cereal|grain|legume|bean|nut|seed|spice|herb|dairy|egg|poultry|beef|pork|fish|shellfish|oil/.test(category)) return "ingredient";
  return "other";
}

function mapPreparationState(description: string): FoodPreparationState {
  if (/\braw\b/i.test(description)) return "raw";
  if (/\bcooked\b|\bboiled\b|\broasted\b|\bbaked\b|\bfried\b|\bsteamed\b|\bgrilled\b|\bheated in oven\b/i.test(description)) return "cooked";
  if (/\bprepared\b|\bcommercial\b/i.test(description)) return "prepared";
  return "not-specified";
}

function parseAliases(value: unknown): string[] | undefined {
  const aliases = Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : typeof value === "string"
      ? value.split(/[;,]/)
      : [];
  const normalized = [...new Set(aliases.map((alias) => alias.trim()).filter(Boolean))];
  return normalized.length ? normalized : undefined;
}

function parseServingOptions(raw: Record<string, unknown>): NonNullable<Food["servingOptions"]> {
  const portions = raw["foodPortions"];
  if (!Array.isArray(portions)) return [];
  const options: NonNullable<Food["servingOptions"]> = [];

  for (const portion of portions) {
    if (!isRecord(portion)) continue;
    const weightGrams = finiteNumber(portion["gramWeight"]);
    if (weightGrams === null || weightGrams <= 0) continue;
    const quantity = finiteNumber(portion["amount"] ?? portion["value"]) ?? 1;
    if (quantity <= 0) continue;
    const measure = isRecord(portion["measureUnit"]) ? portion["measureUnit"] : undefined;
    const measureName = textValue(measure?.["abbreviation"]) ?? textValue(measure?.["name"]);
    const modifier = textValue(portion["modifier"]);
    const description = [String(quantity), modifier, measureName].filter(Boolean).join(" ") || `${quantity} serving`;
    if (options.some((option) => option.description === description && option.weightGrams === weightGrams)) continue;
    options.push({ quantity, unit: "serving", description, weightGrams });
  }

  return options;
}

function parseFood(raw: Record<string, unknown>): Food | null {
  const fdcId = finiteNumber(raw["fdcId"]);
  const name = textValue(raw["description"]);
  if (fdcId === null || !Number.isInteger(fdcId) || fdcId <= 0 || !name) return null;

  const energy = getNutrientDetails(raw, [2048, 2047, 1008]);
  const protein = getNutrientDetails(raw, [1003]);
  const carbohydrate = getNutrientDetails(raw, [1005]);
  const fat = getNutrientDetails(raw, [1004]);
  const fiber = getNutrientDetails(raw, [1079, 2033]);
  const micronutrients: Record<string, MicronutrientAmount> = {};
  for (const nutrient of MICRONUTRIENTS) {
    const value = getNutrientDetails(raw, [nutrient.id]);
    if (value) micronutrients[nutrient.key] = { value: value.amount, unit: value.unit };
  }

  const nutrientValues = [energy?.amount, protein?.amount, carbohydrate?.amount, fat?.amount, fiber?.amount, ...Object.values(micronutrients).map((value) => value.value)];
  if (!nutrientValues.some((value) => value !== null && value !== undefined)) return null;

  const category = isRecord(raw["foodCategory"]) ? textValue(raw["foodCategory"]["description"]) : undefined;
  const commonNames = parseAliases(raw["commonNames"]);
  const inputs = Array.isArray(raw["inputFoods"]) ? raw["inputFoods"] : [];
  const ingredients = [...new Set(inputs.flatMap((input) => {
    if (!isRecord(input)) return [];
    const ingredient = textValue(input["ingredientDescription"]) ?? textValue(input["description"]);
    return ingredient ? [ingredient] : [];
  }))];
  const releaseDate = textValue(raw["publicationDate"]) ?? USDA_FDC_RELEASE;
  const nutrientMethods = [...new Set([energy?.derivation, protein?.derivation, carbohydrate?.derivation, fat?.derivation].filter((value): value is string => Boolean(value)))];
  const provenanceNote = [
    `Foundation Foods release ${USDA_FDC_RELEASE}; source values are per 100 g edible portion.`,
    "Sample-based measurements vary; missing or below-quantification values remain unknown.",
    ...(nutrientMethods.length ? [`Selected nutrient derivations: ${nutrientMethods.join(", ")}.`] : []),
    ...([energy, protein, carbohydrate, fat, fiber].some((value) => value?.unitMismatch)
      ? ["A core nutrient with an unexpected unit was left unavailable."]
      : []),
  ].join(" ");
  const servingOptions = parseServingOptions(raw);

  return {
    id: `usda-fdc-${fdcId}`,
    name,
    ...(commonNames ? { alternativeNames: commonNames } : {}),
    cuisine: "Unspecified",
    category: mapCategory(category),
    meal: null,
    diet: "Unspecified",
    dietaryLabels: [],
    allergens: null,
    allergenDataStatus: "unknown",
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
      sourceName: USDA_FDC_SOURCE_NAME,
      sourceType: "database",
      reference: `https://fdc.nal.usda.gov/food-details/${fdcId}/nutrients`,
      note: provenanceNote,
    },
    externalDataId: { source: "usda-fooddata-central", id: fdcId, release: releaseDate },
    preparationState: mapPreparationState(name),
    ...(ingredients.length ? { ingredients } : {}),
    ...(servingOptions.length ? { servingOptions } : {}),
  };
}

/** Normalizes the official FoundationFoods JSON while retaining missing values and stable FDC IDs. */
export function normalizeUsdaFoundationFoods(input: unknown): UsdaImportResult {
  const sourceFoods = Array.isArray(input)
    ? input
    : isRecord(input) && Array.isArray(input["FoundationFoods"])
      ? input["FoundationFoods"]
      : [];
  const byId = new Map<number, Food>();
  let skippedMissingIdCount = 0;
  let skippedInvalidCount = 0;
  let duplicateFdcIdCount = 0;

  for (const item of sourceFoods) {
    if (!isRecord(item)) {
      skippedInvalidCount += 1;
      continue;
    }
    const fdcId = finiteNumber(item["fdcId"]);
    if (fdcId === null || !Number.isInteger(fdcId) || fdcId <= 0) {
      skippedMissingIdCount += 1;
      continue;
    }
    const food = parseFood(item);
    if (!food) {
      skippedInvalidCount += 1;
      continue;
    }
    if (byId.has(fdcId)) {
      duplicateFdcIdCount += 1;
      continue;
    }
    byId.set(fdcId, food);
  }

  const foods = [...byId.values()].sort((a, b) => a.name.localeCompare(b.name) || (a.externalDataId?.id ?? 0) - (b.externalDataId?.id ?? 0));
  return {
    foods,
    report: {
      sourceRecordCount: sourceFoods.length,
      validFoodCount: foods.length,
      skippedMissingIdCount,
      skippedInvalidCount,
      duplicateFdcIdCount,
    },
  };
}