import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { BookOpen, CalendarDays, Check, Pencil, Plus, Search, SearchX, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, PageHeader } from "@/components/common";
import { FoodImage } from "@/components/food/FoodCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { foodDataService, filterFoods } from "@/services/food-data-service";
import { aggregateIntakeByMeal, aggregateIntakeNutrition } from "@/services/intake-nutrition-service";
import {
  addDiaryEntry as persistDiaryEntry,
  deleteDiaryEntry as deletePersistedDiaryEntry,
  listDiaryEntries,
  updateDiaryEntry as updatePersistedDiaryEntry,
} from "@/services/user-data-server";
import { formatNutrient } from "@/lib/portion-calculations";
import { pageMeta } from "@/lib/seo";
import type { FoodDiaryEntry, MealType, NutrientKey, ServingSize } from "@/types";

export const Route = createFileRoute("/_workspace/diary")({
  head: () => pageMeta("Food Diary", "Log foods by meal and review daily nutrition totals."),
  component: FoodDiaryPage,
});

const MEALS: { value: MealType; label: string }[] = [
  { value: "Breakfast", label: "Breakfast" },
  { value: "Lunch", label: "Lunch" },
  { value: "Dinner", label: "Dinner" },
  { value: "Snack", label: "Snacks" },
];

const NUTRIENTS: { key: NutrientKey; label: string; unit: string }[] = [
  { key: "caloriesKcal", label: "Calories", unit: " kcal" },
  { key: "proteinG", label: "Protein", unit: " g" },
  { key: "carbohydrateG", label: "Carbohydrates", unit: " g" },
  { key: "fatG", label: "Fat", unit: " g" },
  { key: "fiberG", label: "Fibre", unit: " g" },
];

function localToday(): string {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
}

function createEntryId(): string {
  if (!globalThis.crypto?.randomUUID) throw new Error("Secure diary entry IDs are unavailable in this browser.");
  return globalThis.crypto.randomUUID();
}

function portionWithQuantity(reference: ServingSize, quantity: number): ServingSize {
  return {
    ...reference,
    quantity,
    ...(reference.weightGrams !== undefined
      ? { weightGrams: reference.weightGrams * (quantity / reference.quantity) }
      : {}),
  };
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "The diary could not be saved.";
}

function NutritionMetrics({
  totals,
}: {
  totals: ReturnType<typeof aggregateIntakeNutrition>;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {NUTRIENTS.map(({ key, label, unit }) => {
        return (
          <div key={key} className="min-w-0 border-l-2 border-sage pl-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 truncate text-sm font-semibold text-forest">{formatNutrient(totals.nutrition[key], unit)}</p>
          </div>
        );
      })}
    </div>
  );
}

function FoodDiaryPage() {
  const [selectedDate, setSelectedDate] = useState("");
  const [entries, setEntries] = useState<FoodDiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedFoodId, setSelectedFoodId] = useState("");
  const [selectedMeal, setSelectedMeal] = useState<MealType>("Breakfast");
  const [selectedServingIndex, setSelectedServingIndex] = useState("0");
  const [portionQuantity, setPortionQuantity] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState("");
  const [editingMeal, setEditingMeal] = useState<MealType>("Breakfast");
  const [mutating, setMutating] = useState(false);
  const mutationInFlight = useRef(false);

  useEffect(() => setSelectedDate(localToday()), []);

  useEffect(() => {
    if (!selectedDate) return;
    let active = true;
    setLoading(true);
    setStorageError(null);
    void listDiaryEntries({ data: { date: selectedDate } })
      .then((loadedEntries) => {
        if (active) setEntries(loadedEntries);
      })
      .catch((error: unknown) => {
        if (active) {
          setStorageError(errorMessage(error));
          setEntries([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [selectedDate, reloadKey]);

  const foods = foodDataService.getAll().filter((food) => food.source === "usda-fooddata-central");
  const searchResults = filterFoods(foods, { query: search });
  const selectedFood = selectedFoodId ? foodDataService.getById(selectedFoodId) : undefined;
  const selectedPortionOptions = selectedFood ? [selectedFood.nutrition.servingSize, ...(selectedFood.servingOptions ?? [])] : [];
  const selectedServing = selectedPortionOptions[Number(selectedServingIndex)] ?? selectedFood?.nutrition.servingSize;

  const calculatedEntries = entries.flatMap((entry) => {
    const snapshot = entry.nutritionSnapshot;
    return snapshot ? [{
      id: entry.id,
      loggedAt: `${entry.date}T12:00:00.000Z`,
      meal: entry.meal,
      portion: entry.portion,
      foodId: entry.foodId,
      foodName: snapshot.foodName,
      nutrition: snapshot.nutrition,
      completeness: snapshot.completeness,
      missingNutrients: snapshot.missingNutrients,
      dataQuality: snapshot.dataQuality,
      provenance: snapshot.provenance,
    }] : [];
  });
  const dailyTotals = aggregateIntakeNutrition(calculatedEntries);
  const mealTotals = aggregateIntakeByMeal(calculatedEntries);

  const addFood = async () => {
    if (!selectedFood || !selectedDate) return;
    if (mutationInFlight.current) return;
    const quantity = Number(portionQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setStorageError("Enter a portion quantity greater than zero.");
      return;
    }
    mutationInFlight.current = true;
    setMutating(true);
    try {
      const entry: FoodDiaryEntry = {
        id: createEntryId(),
        foodId: selectedFood.id,
        date: selectedDate,
        meal: selectedMeal,
        portion: portionWithQuantity(selectedServing ?? selectedFood.nutrition.servingSize, quantity),
      };
      const savedEntry = await persistDiaryEntry({ data: entry });
      setEntries((current) => [...current, savedEntry]);
      setSelectedFoodId("");
      setSelectedServingIndex("0");
      setPortionQuantity("");
      setStorageError(null);
      toast.success(`${selectedFood.name} added to ${selectedMeal.toLowerCase()}.`);
    } catch (error) {
      setStorageError(errorMessage(error));
      toast.error("Food could not be added to the diary.");
    } finally {
      mutationInFlight.current = false;
      setMutating(false);
    }
  };

  const startEditing = (entry: FoodDiaryEntry) => {
    setEditingId(entry.id);
    setEditingQuantity(String(entry.portion.quantity));
    setEditingMeal(entry.meal);
  };

  const saveEdit = async (entry: FoodDiaryEntry) => {
    if (mutationInFlight.current) return;
    const quantity = Number(editingQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setStorageError("Enter a portion quantity greater than zero.");
      return;
    }
    mutationInFlight.current = true;
    setMutating(true);
    try {
      const updatedEntry = await updatePersistedDiaryEntry({ data: {
        id: entry.id,
        changes: {
          meal: editingMeal,
          portion: portionWithQuantity(entry.portion, quantity),
        },
      } });
      setEntries((current) => current.map((currentEntry) =>
        currentEntry.id === updatedEntry.id ? updatedEntry : currentEntry,
      ));
      setEditingId(null);
      setStorageError(null);
      toast.success("Diary entry updated.");
    } catch (error) {
      setStorageError(errorMessage(error));
      toast.error("Diary entry could not be updated.");
    } finally {
      mutationInFlight.current = false;
      setMutating(false);
    }
  };

  const removeEntry = async (entry: FoodDiaryEntry) => {
    if (mutationInFlight.current) return;
    mutationInFlight.current = true;
    setMutating(true);
    try {
      await deletePersistedDiaryEntry({ data: { id: entry.id } });
      setEntries((current) => current.filter((currentEntry) => currentEntry.id !== entry.id));
      setStorageError(null);
      toast.success("Food removed from the diary.");
    } catch (error) {
      setStorageError(errorMessage(error));
      toast.error("Food could not be removed from the diary.");
    } finally {
      mutationInFlight.current = false;
      setMutating(false);
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Daily nutrition"
        title="Food Diary"
        description="Log foods by meal and review the nutrition available for your selected day."
      />

      {storageError && (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span>{storageError}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>Retry</Button>
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-end gap-4 border-b pb-4">
            <label className="grid gap-1.5 text-sm font-medium text-forest">
              <span className="inline-flex items-center gap-2"><CalendarDays className="size-4" /> Diary date</span>
              <Input type="date" value={selectedDate} disabled={mutating} onChange={(event) => setSelectedDate(event.target.value)} className="w-52 bg-card" />
            </label>
            <p className="pb-2 text-xs text-muted-foreground">Choose a date to view or add that day’s entries.</p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search foods to add" aria-label="Search foods to add to diary" className="h-10 rounded-full bg-card pl-9" />
          </div>

          {searchResults.length ? (
            <ul className="divide-y rounded-lg border bg-card">
              {searchResults.map((food) => (
                <li key={food.id} className="flex items-center gap-3 px-4 py-3">
                  <FoodImage food={food} className="size-12 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-forest">{food.name}</p>
                    <p className="text-xs text-muted-foreground">{[food.cuisine !== "Unspecified" ? food.cuisine : undefined, food.category === "dish" ? "Prepared dish" : food.category].filter(Boolean).join(" · ")} · {food.nutrition.basis === "per-100g" ? "per 100 g" : food.nutrition.servingSize.description ?? `${food.nutrition.servingSize.quantity} ${food.nutrition.servingSize.unit}`}</p>
                  </div>
                  <Button type="button" size="sm" variant={selectedFoodId === food.id ? "outline" : "forest"} onClick={() => { setSelectedFoodId(food.id); setSelectedServingIndex("0"); setPortionQuantity(String(food.nutrition.servingSize.quantity)); setStorageError(null); }}>
                    {selectedFoodId === food.id ? "Selected" : <><Plus /> Add</>}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={SearchX} title="No foods found" description="Try another food name or alternative name." />
          )}
        </div>

        <aside className="surface h-fit space-y-4 p-5">
          <div>
            <h2 className="text-base font-semibold text-forest">Add to your diary</h2>
            <p className="mt-1 text-xs text-muted-foreground">Entries use the food’s reference serving unit.</p>
          </div>
          {selectedFood && selectedServing ? (
            <>
              <p className="text-sm font-medium text-forest">{selectedFood.name}</p>
              <label className="grid gap-1.5 text-sm font-medium text-forest" htmlFor="diary-meal">Meal
                <select id="diary-meal" value={selectedMeal} onChange={(event) => { const option = MEALS.find((meal) => meal.value === event.target.value); if (option) setSelectedMeal(option.value); }} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm">
                  {MEALS.map((meal) => <option key={meal.value} value={meal.value}>{meal.label}</option>)}
                </select>
              </label>
              {selectedPortionOptions.length > 1 && (
                <label className="grid gap-1.5 text-sm font-medium text-forest" htmlFor="diary-standard-portion">Standard portion
                  <select id="diary-standard-portion" value={selectedServingIndex} onChange={(event) => {
                    const index = Number(event.target.value);
                    const option = selectedPortionOptions[index];
                    if (option) {
                      setSelectedServingIndex(event.target.value);
                      setPortionQuantity(String(option.quantity));
                    }
                  }} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm">
                    {selectedPortionOptions.map((option, index) => <option key={`${option.description ?? option.unit}-${index}`} value={index}>{option.description ?? `${option.quantity} ${option.unit}`}</option>)}
                  </select>
                </label>
              )}
              <label className="grid gap-1.5 text-sm font-medium text-forest" htmlFor="diary-portion">Portion quantity
                <span className="flex items-center gap-2">
                  <Input id="diary-portion" type="number" min="0.1" step="0.1" value={portionQuantity} onChange={(event) => setPortionQuantity(event.target.value)} className="bg-card" />
                  <span className="shrink-0 text-xs text-muted-foreground">{selectedServing.unit}</span>
                </span>
              </label>
              <p className="text-xs text-muted-foreground">Reference: {selectedServing.quantity} {selectedServing.unit}{selectedServing.description ? ` · ${selectedServing.description}` : ""}</p>
              <Button type="button" variant="forest" className="w-full" onClick={addFood} disabled={!selectedDate || mutating}><Plus /> {mutating ? "Saving…" : "Add food"}</Button>
            </>
          ) : (
            <p className="rounded-md border border-dashed px-3 py-5 text-center text-sm text-muted-foreground">Search the catalogue and select a food to choose its meal and portion.</p>
          )}
        </aside>
      </section>

      {loading ? (
        <div role="status" className="rounded-lg border bg-card px-5 py-8 text-center text-sm text-muted-foreground">Loading diary entries…</div>
      ) : (
        <>
          <section className="space-y-4 border-t pt-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-forest">Daily nutrition</h2>
                <p className="mt-1 text-sm text-muted-foreground">{entries.length} {entries.length === 1 ? "food" : "foods"} logged</p>
              </div>
            </div>
            <NutritionMetrics totals={dailyTotals} />
          </section>

          {entries.length === 0 && <EmptyState icon={BookOpen} title="No foods logged for this date" description="Search the catalogue above to add your first meal." />}

          <div className="divide-y border-t">
            {MEALS.map((meal) => {
              const mealEntries = entries.filter((entry) => entry.meal === meal.value);
              const totals = mealTotals[meal.value] ?? aggregateIntakeNutrition([]);
              return (
                <section key={meal.value} className="py-6" aria-labelledby={`meal-${meal.value}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 id={`meal-${meal.value}`} className="font-display text-xl text-forest">{meal.label}</h2>
                      <p className="text-xs text-muted-foreground">{mealEntries.length} {mealEntries.length === 1 ? "entry" : "entries"}</p>
                    </div>
                  </div>
                  <div className="mt-4"><NutritionMetrics totals={totals} /></div>
                  {mealEntries.length === 0 ? (
                    <p className="mt-4 text-sm text-muted-foreground">Nothing logged for {meal.label.toLowerCase()}.</p>
                  ) : (
                    <ul className="mt-4 divide-y rounded-lg border bg-card">
                      {mealEntries.map((entry) => {
                        const food = foodDataService.getById(entry.foodId);
                        const foodName = entry.nutritionSnapshot?.foodName ?? food?.name ?? "Unavailable food";
                        const editing = editingId === entry.id;
                        return (
                          <li key={entry.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                            {food ? <FoodImage food={food} className="size-12 shrink-0 rounded-md" /> : <span className="size-12 shrink-0 rounded-md bg-sage" aria-hidden="true" />}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-forest">{foodName}</p>
                              {editing ? (
                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                  <Input type="number" min="0.1" step="0.1" value={editingQuantity} onChange={(event) => setEditingQuantity(event.target.value)} aria-label={`Quantity for ${foodName}`} className="h-8 w-28 bg-background" />
                                  <span className="text-xs text-muted-foreground">{entry.portion.unit}</span>
                                  <select aria-label={`Meal for ${foodName}`} value={editingMeal} onChange={(event) => { const option = MEALS.find((candidate) => candidate.value === event.target.value); if (option) setEditingMeal(option.value); }} className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                                    {MEALS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                  </select>
                                  <Button type="button" size="icon" variant="forest" aria-label={`Save changes for ${foodName}`} disabled={mutating} onClick={() => saveEdit(entry)}><Check /></Button>
                                  <Button type="button" size="icon" variant="ghost" aria-label="Cancel edit" onClick={() => setEditingId(null)}><X /></Button>
                                </div>
                              ) : (
                                <p className="mt-1 text-xs text-muted-foreground">{entry.portion.quantity} {entry.portion.unit}</p>
                              )}
                            </div>
                            {!editing && <>
                              <Button type="button" size="icon" variant="ghost" aria-label={`Edit ${foodName}`} disabled={mutating || !food} onClick={() => startEditing(entry)}><Pencil /></Button>
                              <Button type="button" size="icon" variant="ghost" aria-label={`Remove ${foodName}`} disabled={mutating} onClick={() => removeEntry(entry)}><Trash2 /></Button>
                            </>}
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}