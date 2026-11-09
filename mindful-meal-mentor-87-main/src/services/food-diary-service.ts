import type { FoodDiaryEntry, MealType, ServingSize, ServingUnit } from "@/types";

const STORAGE_KEY = "nutrify-food-diary-v1";
const VERSION = 1;
const MEALS = ["Breakfast", "Lunch", "Dinner", "Snack"] as const satisfies readonly MealType[];
const SERVING_UNITS = ["g", "ml", "piece", "serving"] as const satisfies readonly ServingUnit[];

export interface DiaryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export class BrowserDiaryStorage implements DiaryStorage {
  getItem(key: string): string | null {
    if (typeof window === "undefined") throw new Error("Browser storage is unavailable.");
    return window.localStorage.getItem(key);
  }

  setItem(key: string, value: string): void {
    if (typeof window === "undefined") throw new Error("Browser storage is unavailable.");
    window.localStorage.setItem(key, value);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDateOnly(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function isMeal(value: unknown): value is MealType {
  return typeof value === "string" && MEALS.some((meal) => meal === value);
}

function isServingSize(value: unknown): value is ServingSize {
  if (!isRecord(value)) return false;
  if (typeof value["quantity"] !== "number" || !Number.isFinite(value["quantity"]) || value["quantity"] <= 0 || value["quantity"] > 100_000) return false;
  if (typeof value["unit"] !== "string" || !SERVING_UNITS.some((unit) => unit === value["unit"])) return false;
  if (value["weightGrams"] !== undefined && (typeof value["weightGrams"] !== "number" || !Number.isFinite(value["weightGrams"]) || value["weightGrams"] <= 0)) return false;
  if (value["description"] !== undefined && typeof value["description"] !== "string") return false;
  return true;
}

function parseEntry(value: unknown, isKnownFood: (foodId: string) => boolean): FoodDiaryEntry | null {
  if (!isRecord(value)) return null;
  const { id, foodId, date, meal, portion } = value;
  if (typeof id !== "string" || !id.trim() || id.length > 120) return null;
  if (typeof foodId !== "string" || !foodId.trim() || !isKnownFood(foodId)) return null;
  if (!isDateOnly(date) || !isMeal(meal) || !isServingSize(portion)) return null;

  return {
    id,
    foodId,
    date,
    meal,
    portion: {
      quantity: portion.quantity,
      unit: portion.unit,
      ...(portion.description !== undefined ? { description: portion.description } : {}),
      ...(portion.weightGrams !== undefined ? { weightGrams: portion.weightGrams } : {}),
    },
  };
}

export class FoodDiaryService {
  constructor(
    private readonly storage: DiaryStorage,
    private readonly isKnownFood: (foodId: string) => boolean,
  ) {}

  getEntries(): FoodDiaryEntry[] {
    const stored = this.storage.getItem(STORAGE_KEY);
    if (!stored) return [];

    let parsed: unknown;
    try {
      parsed = JSON.parse(stored);
    } catch {
      return [];
    }
    if (!isRecord(parsed) || parsed["version"] !== VERSION || !Array.isArray(parsed["entries"])) return [];

    const entries = parsed["entries"].map((value) => parseEntry(value, this.isKnownFood)).filter((entry) => entry !== null);
    const ids = new Set<string>();
    return entries.filter((entry) => {
      if (ids.has(entry.id)) return false;
      ids.add(entry.id);
      return true;
    });
  }

  getEntriesForDate(date: string): FoodDiaryEntry[] {
    if (!isDateOnly(date)) throw new RangeError("Diary date must be a valid YYYY-MM-DD date.");
    return this.getEntries().filter((entry) => entry.date === date);
  }

  addEntry(entry: FoodDiaryEntry): FoodDiaryEntry[] {
    const validEntry = parseEntry(entry, this.isKnownFood);
    if (!validEntry) throw new TypeError("Diary entry is invalid or references an unavailable food.");

    const entries = this.getEntries();
    if (entries.some((existing) => existing.id === validEntry.id)) throw new Error("Diary entry id already exists.");
    return this.writeEntries([...entries, validEntry]);
  }

  updateEntry(id: string, changes: Pick<FoodDiaryEntry, "meal" | "portion">): FoodDiaryEntry[] {
    const entries = this.getEntries();
    const index = entries.findIndex((entry) => entry.id === id);
    if (index < 0) throw new Error("Diary entry was not found.");

    const updated = parseEntry({ ...entries[index], ...changes }, this.isKnownFood);
    if (!updated) throw new TypeError("Updated diary entry is invalid.");
    const next = [...entries];
    next[index] = updated;
    return this.writeEntries(next);
  }

  removeEntry(id: string): FoodDiaryEntry[] {
    const entries = this.getEntries();
    const next = entries.filter((entry) => entry.id !== id);
    if (next.length === entries.length) return entries;
    return this.writeEntries(next);
  }

  private writeEntries(entries: FoodDiaryEntry[]): FoodDiaryEntry[] {
    this.storage.setItem(STORAGE_KEY, JSON.stringify({ version: VERSION, entries }));
    return entries;
  }
}