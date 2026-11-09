import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { calculateLoggedFoodPortion } from "@/services/intake-nutrition-service";
import { foodDataService } from "@/services/food-data-service";
import { getRequestAuthenticatedUser } from "@/services/auth-server";
import {
  assertAssessmentFormState,
  assertDiaryNutritionSnapshot,
  createDiarySnapshot,
  createUserDataService,
  type DiaryRecord,
  type UserDataAdapter,
} from "@/services/user-data-service";
import type { DiaryNutritionSnapshot, FoodDiaryEntry, MealType, ServingSize } from "@/types";

function raiseDatabaseError(error: { message?: string } | null, operation: string): void {
  if (error) {
    console.error(`Supabase ${operation} failed.`);
    throw new Error(`Unable to ${operation}. Please try again.`);
  }
}

function readSnapshot(value: unknown): DiaryNutritionSnapshot {
  assertDiaryNutritionSnapshot(value);
  return value;
}

function mapDiaryRow(row: Record<string, unknown>): DiaryRecord {
  const metadata = row["portion_metadata"];
  if (typeof metadata !== "object" || metadata === null || Array.isArray(metadata)) {
    throw new Error("A saved diary entry has invalid portion data.");
  }
  const portionData = metadata as Record<string, unknown>;
  if (typeof row["quantity"] !== "number" || typeof row["unit"] !== "string") {
    throw new Error("A saved diary entry has invalid portion data.");
  }
  return {
    id: String(row["id"]),
    foodId: String(row["food_id"]),
    date: String(row["consumption_date"]),
    meal: row["meal_type"] as MealType,
    portion: {
      quantity: row["quantity"],
      unit: row["unit"] as ServingSize["unit"],
      ...(typeof portionData["description"] === "string" ? { description: portionData["description"] } : {}),
      ...(typeof portionData["weightGrams"] === "number" ? { weightGrams: portionData["weightGrams"] } : {}),
    },
    nutritionSnapshot: readSnapshot(row["nutrition_snapshot"]),
    sourceIdentifier: String(row["source_identifier"]),
    sourceName: String(row["source_name"]),
    sourceType: String(row["source_type"]),
    sourceReference: typeof row["source_reference"] === "string" ? row["source_reference"] : null,
    externalSource: typeof row["external_source"] === "string" ? row["external_source"] : null,
    externalFoodId: typeof row["external_food_id"] === "string" ? row["external_food_id"] : null,
  };
}

function createSupabaseAdapter(supabase: SupabaseClient, getCurrentUser: UserDataAdapter["getCurrentUser"]): UserDataAdapter {
  return {
    getCurrentUser,
    async loadProfile(userId) {
      const { data, error } = await supabase.from("user_profiles")
        .select("id,display_name").eq("id", userId).maybeSingle();
      raiseDatabaseError(error, "load your profile");
      return data ? { id: data.id, displayName: data.display_name } : null;
    },
    async updateProfile(userId, displayName) {
      const { data, error } = await supabase.from("user_profiles")
        .update({ display_name: displayName })
        .eq("id", userId)
        .select("id,display_name")
        .maybeSingle();
      raiseDatabaseError(error, "save your display name");
      if (!data) throw new Error("Your profile could not be found.");
      return { id: data.id, displayName: data.display_name };
    },
    async loadLatestAssessment(userId) {
      const { data, error } = await supabase.from("assessment_history")
        .select("id,answers,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      raiseDatabaseError(error, "load your assessment");
      if (!data) return null;
      assertAssessmentFormState(data.answers);
      return { id: data.id, answers: data.answers, createdAt: data.created_at };
    },
    async insertAssessment(userId, answers) {
      const { data, error } = await supabase.from("assessment_history")
        .insert({ user_id: userId, answers })
        .select("id,answers,created_at")
        .single();
      raiseDatabaseError(error, "save your assessment");
      if (!data) throw new Error("The assessment was not saved. Please try again.");
      assertAssessmentFormState(data.answers);
      return { id: data.id, answers: data.answers, createdAt: data.created_at };
    },
    async listDiaryEntries(userId, date) {
      const { data, error } = await supabase.from("food_diary")
        .select("id,food_id,consumption_date,meal_type,quantity,unit,portion_metadata,nutrition_snapshot,source_identifier,source_name,source_type,source_reference,external_source,external_food_id")
        .eq("user_id", userId)
        .eq("consumption_date", date)
        .order("created_at", { ascending: true });
      raiseDatabaseError(error, "load your diary entries");
      return (data ?? []).map((row: Record<string, unknown>) => mapDiaryRow(row));
    },
    async insertDiaryEntry(userId, entry, snapshot) {
      const externalId = snapshot.externalDataId;
      const { data, error } = await supabase.from("food_diary").insert({
        id: entry.id,
        user_id: userId,
        food_id: entry.foodId,
        consumption_date: entry.date,
        meal_type: entry.meal,
        quantity: entry.portion.quantity,
        unit: entry.portion.unit,
        portion_metadata: {
          ...(entry.portion.description ? { description: entry.portion.description } : {}),
          ...(entry.portion.weightGrams !== undefined ? { weightGrams: entry.portion.weightGrams } : {}),
        },
        nutrition_snapshot: snapshot,
        source_identifier: entry.foodId,
        source_name: snapshot.provenance.sourceName,
        source_type: snapshot.provenance.sourceType,
        source_reference: snapshot.provenance.reference ?? null,
        external_source: externalId?.source ?? null,
        external_food_id: externalId ? String(externalId.id) : null,
      }).select("id,food_id,consumption_date,meal_type,quantity,unit,portion_metadata,nutrition_snapshot,source_identifier,source_name,source_type,source_reference,external_source,external_food_id")
        .single();
      raiseDatabaseError(error, "add food to your diary");
      if (!data) throw new Error("The diary entry was not saved. Please try again.");
      return mapDiaryRow(data);
    },
    async updateDiaryEntry(userId, id, changes, snapshot) {
      const { data, error } = await supabase.from("food_diary")
        .update({
          meal_type: changes.meal,
          quantity: changes.portion.quantity,
          unit: changes.portion.unit,
          portion_metadata: {
            ...(changes.portion.description ? { description: changes.portion.description } : {}),
            ...(changes.portion.weightGrams !== undefined ? { weightGrams: changes.portion.weightGrams } : {}),
          },
          nutrition_snapshot: snapshot,
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select("id,food_id,consumption_date,meal_type,quantity,unit,portion_metadata,nutrition_snapshot,source_identifier,source_name,source_type,source_reference,external_source,external_food_id")
        .maybeSingle();
      raiseDatabaseError(error, "update your diary entry");
      if (!data) throw new Error("Diary entry was not found.");
      return mapDiaryRow(data);
    },
    async deleteDiaryEntry(userId, id) {
      const { data, error } = await supabase.from("food_diary")
        .delete()
        .eq("id", id)
        .eq("user_id", userId)
        .select("id")
        .maybeSingle();
      raiseDatabaseError(error, "remove your diary entry");
      if (!data) throw new Error("Diary entry was not found.");
    },
  };
}

async function createRequestUserDataService() {
  const { supabase, user } = await getRequestAuthenticatedUser();
  if (!user) throw new Error("Your session has expired. Please sign in again.");
  const adapter = createSupabaseAdapter(supabase, async () => ({ id: user.id }));
  return createUserDataService(adapter);
}

function requireObject(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new TypeError("The request data is invalid.");
  }
  return value as Record<string, unknown>;
}

function requireEntry(value: unknown): FoodDiaryEntry {
  const input = requireObject(value);
  const portion = requireObject(input["portion"]);
  if (
    typeof input["id"] !== "string" ||
    typeof input["foodId"] !== "string" ||
    typeof input["date"] !== "string" ||
    typeof input["meal"] !== "string" ||
    typeof portion["quantity"] !== "number" ||
    typeof portion["unit"] !== "string"
  ) throw new TypeError("The diary entry is invalid.");
  return {
    id: input["id"],
    foodId: input["foodId"],
    date: input["date"],
    meal: input["meal"] as MealType,
    portion: {
      quantity: portion["quantity"],
      unit: portion["unit"] as ServingSize["unit"],
      ...(typeof portion["description"] === "string" ? { description: portion["description"] } : {}),
      ...(typeof portion["weightGrams"] === "number" ? { weightGrams: portion["weightGrams"] } : {}),
    },
  };
}

export const loadUserProfile = createServerFn({ method: "GET" }).handler(async () => {
  return (await createRequestUserDataService()).getProfile();
});

export const saveUserDisplayName = createServerFn({ method: "POST" })
  .validator((value: unknown) => {
    const input = requireObject(value);
    if (typeof input["displayName"] !== "string") throw new TypeError("Display name is required.");
    return input["displayName"];
  })
  .handler(async ({ data }) => (await createRequestUserDataService()).updateDisplayName(data));

export const loadLatestAssessment = createServerFn({ method: "GET" }).handler(async () => {
  return (await createRequestUserDataService()).getLatestAssessment();
});

export const loadDashboardData = createServerFn({ method: "GET" }).handler(async () => {
  const { supabase, user } = await getRequestAuthenticatedUser();
  if (!user) throw new Error("Your session has expired. Please sign in again.");
  const service = createUserDataService(createSupabaseAdapter(supabase, async () => ({ id: user.id })));
  const [profile, assessment] = await Promise.all([
    service.getProfile(),
    service.getLatestAssessment(),
  ]);
  return {
    displayName: profile.displayName,
    email: user.email ?? null,
    assessment,
  };
});

export const submitAssessment = createServerFn({ method: "POST" })
  .validator((value: unknown) => {
    assertAssessmentFormState(value);
    return value;
  })
  .handler(async ({ data }) => (await createRequestUserDataService()).submitAssessment(data));

export const listDiaryEntries = createServerFn({ method: "GET" })
  .validator((value: unknown) => {
    const input = requireObject(value);
    if (typeof input["date"] !== "string") throw new TypeError("Diary date is required.");
    return input["date"];
  })
  .handler(async ({ data }) => (await createRequestUserDataService()).listDiaryEntries(data));

export const addDiaryEntry = createServerFn({ method: "POST" })
  .validator((value: unknown) => {
    const entry = requireEntry(value);
    return entry;
  })
  .handler(async ({ data }) => {
    const food = foodDataService.getById(data.foodId);
    if (!food) throw new TypeError("The selected food is not available.");
    const calculated = calculateLoggedFoodPortion(food, {
      id: data.id,
      loggedAt: `${data.date}T12:00:00.000Z`,
      meal: data.meal,
      portion: data.portion,
    });
    const snapshot = createDiarySnapshot(food, calculated);
    return (await createRequestUserDataService()).addDiaryEntry(data, snapshot);
  });

export const updateDiaryEntry = createServerFn({ method: "POST" })
  .validator((value: unknown) => {
    const input = requireObject(value);
    const changes = requireObject(input["changes"]);
    const portion = requireObject(changes["portion"]);
    if (
      typeof input["id"] !== "string" ||
      typeof changes["meal"] !== "string" ||
      typeof portion["quantity"] !== "number" ||
      typeof portion["unit"] !== "string"
    ) throw new TypeError("The diary update is invalid.");
    return {
      id: input["id"],
      changes: {
        meal: changes["meal"] as MealType,
        portion: {
          quantity: portion["quantity"],
          unit: portion["unit"] as ServingSize["unit"],
          ...(typeof portion["description"] === "string" ? { description: portion["description"] } : {}),
          ...(typeof portion["weightGrams"] === "number" ? { weightGrams: portion["weightGrams"] } : {}),
        },
      },
    };
  })
  .handler(async ({ data }) => {
    const { supabase, user } = await getRequestAuthenticatedUser();
    if (!user) throw new Error("Your session has expired. Please sign in again.");
    const { data: row, error } = await supabase.from("food_diary")
      .select("food_id,consumption_date")
      .eq("id", data.id)
      .eq("user_id", user.id)
      .maybeSingle();
    raiseDatabaseError(error, "load your diary entry");
    if (!row) throw new Error("Diary entry was not found.");
    const food = foodDataService.getById(row.food_id);
    if (!food) throw new Error("The food associated with this entry is no longer available.");
    const snapshot = createDiarySnapshot(food, calculateLoggedFoodPortion(food, {
      id: data.id,
      loggedAt: `${row.consumption_date}T12:00:00.000Z`,
      meal: data.changes.meal,
      portion: data.changes.portion,
    }));
    return createUserDataService(createSupabaseAdapter(supabase, async () => ({ id: user.id })))
      .updateDiaryEntry(data.id, data.changes, snapshot);
  });

export const deleteDiaryEntry = createServerFn({ method: "POST" })
  .validator((value: unknown) => {
    const input = requireObject(value);
    if (typeof input["id"] !== "string") throw new TypeError("Diary entry ID is required.");
    return input["id"];
  })
  .handler(async ({ data }) => (await createRequestUserDataService()).deleteDiaryEntry(data));
