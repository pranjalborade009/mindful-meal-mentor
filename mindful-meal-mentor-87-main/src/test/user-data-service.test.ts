import { describe, expect, it, vi } from "vitest";
import { createEmptyAssessmentForm } from "@/lib/assessment-validation";
import { createUserDataService, type AssessmentRecord, type DiaryRecord, type UserDataAdapter } from "@/services/user-data-service";
import type { DiaryNutritionSnapshot, FoodDiaryEntry } from "@/types";

function createAdapter(currentUser: { id: string } | null = { id: "user-1" }) {
  let profile = { id: "user-1", displayName: "Asha" };
  let latestAssessment: AssessmentRecord | null = null;
  const diary = new Map<string, DiaryRecord>();

  const adapter: UserDataAdapter = {
    getCurrentUser: vi.fn(async () => currentUser),
    loadProfile: vi.fn(async (id) => id === profile.id ? profile : null),
    updateProfile: vi.fn(async (id, displayName) => {
      if (id !== profile.id) throw new Error("Not found");
      profile = { ...profile, displayName };
      return profile;
    }),
    loadLatestAssessment: vi.fn(async () => latestAssessment),
    insertAssessment: vi.fn(async (_id, answers) => {
      latestAssessment = { id: "assessment-1", answers, createdAt: "2026-10-19T12:00:00.000Z" };
      return latestAssessment;
    }),
    listDiaryEntries: vi.fn(async (id, date) =>
      [...diary.values()].filter((entry) => entry.date === date && id === "user-1"),
    ),
    insertDiaryEntry: vi.fn(async (_id, entry, nutritionSnapshot) => {
      if (diary.has(entry.id)) throw new Error("Duplicate diary entry.");
      const saved: DiaryRecord = {
        ...entry,
        nutritionSnapshot,
        sourceIdentifier: entry.foodId,
        sourceName: "Test source",
        sourceType: "database",
        sourceReference: null,
        externalSource: null,
        externalFoodId: null,
      };
      diary.set(entry.id, saved);
      return saved;
    }),
    updateDiaryEntry: vi.fn(async (_id, id, changes, nutritionSnapshot) => {
      const previous = diary.get(id);
      if (!previous) throw new Error("Diary entry was not found.");
      const updated = { ...previous, ...changes, nutritionSnapshot };
      diary.set(id, updated);
      return updated;
    }),
    deleteDiaryEntry: vi.fn(async (_id, id) => {
      if (!diary.delete(id)) throw new Error("Diary entry was not found.");
    }),
  };
  return { adapter, service: createUserDataService(adapter) };
}

const validAssessment = {
  ...createEmptyAssessmentForm(),
  age: "32",
  heightCm: "172",
  weightKg: "74.5",
  goal: "maintenance" as const,
  activityLevel: "moderate" as const,
  dietaryPattern: "vegetarian" as const,
};

const snapshot: DiaryNutritionSnapshot = {
  foodName: "Test food",
  nutrition: {
    servingSize: { quantity: 100, unit: "g" },
    basis: "per-serving",
    caloriesKcal: 120,
    proteinG: null,
    carbohydrateG: 20,
    fatG: 3,
    fiberG: null,
  },
  completeness: "partial",
  missingNutrients: ["proteinG", "fiberG"],
  dataQuality: "estimated",
  provenance: { sourceName: "Demo catalogue", sourceType: "demo" },
};

const diaryEntry: FoodDiaryEntry = {
  id: "1371de55-0a00-42a4-9f9e-31926c055290",
  foodId: "food-1",
  date: "2026-10-19",
  meal: "Breakfast",
  portion: { quantity: 100, unit: "g", weightGrams: 100 },
};

describe("authenticated user data service", () => {
  it("loads and updates only the authenticated user's profile display name", async () => {
    const { adapter, service } = createAdapter();
    expect(await service.getProfile()).toEqual({ id: "user-1", displayName: "Asha" });
    expect(await service.updateDisplayName("Asha Patel")).toEqual({ id: "user-1", displayName: "Asha Patel" });
    expect(adapter.loadProfile).toHaveBeenCalledWith("user-1");
    expect(adapter.updateProfile).toHaveBeenCalledWith("user-1", "Asha Patel");
  });

  it("persists validated assessment answers and can load the saved record", async () => {
    const { adapter, service } = createAdapter();
    const saved = await service.submitAssessment(validAssessment);
    expect(saved.answers).toEqual(validAssessment);
    expect(await service.getLatestAssessment()).toEqual(saved);
    expect(adapter.insertAssessment).toHaveBeenCalledWith("user-1", validAssessment);
  });

  it("supports date-scoped diary create, read, update, and delete", async () => {
    const { adapter, service } = createAdapter();
    const created = await service.addDiaryEntry(diaryEntry, snapshot);
    expect(created.nutritionSnapshot).toEqual(snapshot);
    expect(await service.listDiaryEntries(diaryEntry.date)).toEqual([created]);

    const changes = { meal: "Lunch" as const, portion: { quantity: 150, unit: "g" as const, weightGrams: 150 } };
    const updated = await service.updateDiaryEntry(diaryEntry.id, changes, snapshot);
    expect(updated).toMatchObject(changes);
    expect(adapter.updateDiaryEntry).toHaveBeenCalledWith("user-1", diaryEntry.id, changes, snapshot);

    await service.deleteDiaryEntry(diaryEntry.id);
    expect(await service.listDiaryEntries(diaryEntry.date)).toEqual([]);
  });

  it("keeps unknown nutrient amounts null when persisting diary snapshots", async () => {
    const { service } = createAdapter();
    const saved = await service.addDiaryEntry(diaryEntry, snapshot);
    expect(saved.nutritionSnapshot.nutrition.proteinG).toBeNull();
    expect(saved.nutritionSnapshot.nutrition.fiberG).toBeNull();
  });

  it("rejects unauthenticated access before calling user-owned storage", async () => {
    const { adapter, service } = createAdapter(null);
    await expect(service.getProfile()).rejects.toThrow("session has expired");
    await expect(service.updateDisplayName("New name")).rejects.toThrow("session has expired");
    await expect(service.getLatestAssessment()).rejects.toThrow("session has expired");
    await expect(service.submitAssessment(validAssessment)).rejects.toThrow("session has expired");
    await expect(service.listDiaryEntries(diaryEntry.date)).rejects.toThrow("session has expired");
    await expect(service.addDiaryEntry(diaryEntry, snapshot)).rejects.toThrow("session has expired");
    await expect(service.updateDiaryEntry(diaryEntry.id, {
      meal: diaryEntry.meal,
      portion: diaryEntry.portion,
    }, snapshot)).rejects.toThrow("session has expired");
    await expect(service.deleteDiaryEntry(diaryEntry.id)).rejects.toThrow("session has expired");
    expect(adapter.loadProfile).not.toHaveBeenCalled();
    expect(adapter.updateProfile).not.toHaveBeenCalled();
    expect(adapter.loadLatestAssessment).not.toHaveBeenCalled();
    expect(adapter.insertAssessment).not.toHaveBeenCalled();
    expect(adapter.listDiaryEntries).not.toHaveBeenCalled();
    expect(adapter.insertDiaryEntry).not.toHaveBeenCalled();
    expect(adapter.updateDiaryEntry).not.toHaveBeenCalled();
    expect(adapter.deleteDiaryEntry).not.toHaveBeenCalled();
  });

  it("surfaces persistence errors without reporting a successful operation", async () => {
    const { adapter, service } = createAdapter();
    vi.mocked(adapter.loadProfile).mockRejectedValueOnce(new Error("database unavailable"));
    await expect(service.getProfile()).rejects.toThrow("database unavailable");
    vi.mocked(adapter.updateProfile).mockRejectedValueOnce(new Error("write failed"));
    await expect(service.updateDisplayName("Asha Patel")).rejects.toThrow("write failed");
    vi.mocked(adapter.insertAssessment).mockRejectedValueOnce(new Error("insert failed"));
    await expect(service.submitAssessment(validAssessment)).rejects.toThrow("insert failed");
    vi.mocked(adapter.insertDiaryEntry).mockRejectedValueOnce(new Error("diary insert failed"));
    await expect(service.addDiaryEntry(diaryEntry, snapshot)).rejects.toThrow("diary insert failed");
    vi.mocked(adapter.updateDiaryEntry).mockRejectedValueOnce(new Error("diary update failed"));
    await expect(service.updateDiaryEntry(diaryEntry.id, {
      meal: diaryEntry.meal,
      portion: diaryEntry.portion,
    }, snapshot)).rejects.toThrow("diary update failed");
    vi.mocked(adapter.deleteDiaryEntry).mockRejectedValueOnce(new Error("diary delete failed"));
    await expect(service.deleteDiaryEntry(diaryEntry.id)).rejects.toThrow("diary delete failed");
    await expect(service.submitAssessment({ ...validAssessment, age: "0" })).rejects.toThrow("valid age");
  });
});
