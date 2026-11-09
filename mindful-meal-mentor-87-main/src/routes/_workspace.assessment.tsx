import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck } from "lucide-react";
import { PageHeader } from "@/components/common";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { foodDataService } from "@/services/food-data-service";
import { clearLegacyAssessmentDraft } from "@/services/assessment-storage";
import { loadLatestAssessment, submitAssessment } from "@/services/user-data-server";
import {
  ASSESSMENT_STEPS,
  createEmptyAssessmentForm,
  getNextAssessmentStep,
  getPreviousAssessmentStep,
  validateAssessmentStep,
} from "@/lib/assessment-validation";
import { cn } from "@/lib/utils";
import { pageMeta } from "@/lib/seo";
import type { AssessmentFormState } from "@/types";

export const Route = createFileRoute("/_workspace/assessment")({
  head: () => pageMeta("Personal Assessment", "Save your goals, routine, measurements, and food preferences."),
  component: AssessmentPage,
});

const GOALS = [
  { value: "weight-loss", label: "Weight loss" },
  { value: "maintenance", label: "Weight maintenance" },
  { value: "weight-gain", label: "Weight gain" },
] as const;

const ACTIVITY_LEVELS = [
  { value: "sedentary", label: "Mostly sitting" },
  { value: "light", label: "Light activity" },
  { value: "moderate", label: "Moderate activity" },
  { value: "high", label: "High activity" },
] as const;

const DIETARY_PATTERNS = [
  { value: "omnivore", label: "Omnivore" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "eggetarian", label: "Eggetarian" },
  { value: "pescatarian", label: "Pescatarian" },
  { value: "vegan", label: "Vegan" },
  { value: "other", label: "Other" },
] as const;

const MEAL_TIMES = ["Early breakfast", "Later breakfast", "Lunch", "Afternoon snack", "Early dinner", "Later dinner"];

function isOptionValue<const Options extends readonly { value: string }[]>(options: Options, value: string): value is Options[number]["value"] {
  return options.some((option) => option.value === value);
}

function FieldLabel({ htmlFor, children, required }: { htmlFor: string; children: ReactNode; required?: boolean }) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center justify-between gap-3 text-sm font-medium text-forest">
      <span>{children}</span>
      <span className={cn("text-xs font-normal", required ? "text-primary" : "text-muted-foreground")}>
        {required ? "Required" : "Optional"}
      </span>
    </Label>
  );
}

function FieldError({ id, children }: { id: string; children: string | undefined }) {
  return children ? <p id={`${id}-error`} role="alert" className="text-xs text-destructive">{children}</p> : null;
}

function ChoiceButtons<Value extends string>({
  label,
  value,
  options,
  onChange,
  error,
}: {
  label: string;
  value: Value | "";
  options: readonly { value: Value; label: string }[];
  onChange: (value: Value) => void;
  error?: string | undefined;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");
  return (
    <fieldset aria-describedby={error ? `${id}-error` : undefined}>
      <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium text-forest">
        {label}<span className="text-xs font-normal text-primary">Required</span>
      </legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "min-h-11 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                selected ? "border-forest bg-forest text-forest-foreground" : "bg-card text-muted-foreground hover:border-primary hover:text-forest",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
      <FieldError id={id}>{error}</FieldError>
    </fieldset>
  );
}

function MultiChoice({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: string[];
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 flex w-full items-center justify-between text-sm font-medium text-forest">
        {label}<span className="text-xs font-normal text-muted-foreground">Optional</span>
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = value.includes(option);
          return (
            <button
              key={option}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(selected ? value.filter((item) => item !== option) : [...value, option])}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm transition-colors",
                selected ? "border-forest bg-forest text-forest-foreground" : "bg-card text-muted-foreground hover:border-primary hover:text-forest",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ReviewItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b py-3 last:border-b-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-forest">{value || "Not provided"}</dd>
    </div>
  );
}

function AssessmentPage() {
  const [form, setForm] = useState<AssessmentFormState>(createEmptyAssessmentForm);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [ready, setReady] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const submissionInFlight = useRef(false);

  useEffect(() => {
    let active = true;
    try {
      clearLegacyAssessmentDraft();
    } catch {
      setPersistenceError("A previous local assessment draft could not be cleared from this browser.");
    }
    void loadLatestAssessment()
      .then((record) => {
        if (active && record) setForm(record.answers);
      })
      .catch((error: unknown) => {
        if (active) setPersistenceError(error instanceof Error ? error.message : "Unable to load your assessment.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, []);

  const update = <K extends keyof AssessmentFormState>(key: K, value: AssessmentFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setPersistenceError(null);
  };

  const continueStep = () => {
    const nextErrors = validateAssessmentStep(step, form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setStep(getNextAssessmentStep(step));
  };

  const skipOptional = () => {
    setErrors({});
    setStep(getNextAssessmentStep(step));
  };

  const goBack = () => {
    setErrors({});
    setStep(getPreviousAssessmentStep(step));
  };

  const completeAssessment = async () => {
    if (submissionInFlight.current) return;
    const requiredErrors = { ...validateAssessmentStep(0, form), ...validateAssessmentStep(1, form) };
    if (Object.keys(requiredErrors).length) {
      setErrors(requiredErrors);
      setStep(Object.keys(validateAssessmentStep(0, form)).length ? 0 : 1);
      return;
    }
    submissionInFlight.current = true;
    setSaving(true);
    setPersistenceError(null);
    try {
      await submitAssessment({ data: form });
      setCompleted(true);
    } catch (error) {
      setPersistenceError(error instanceof Error ? error.message : "Unable to save your assessment.");
    } finally {
      submissionInFlight.current = false;
      setSaving(false);
    }
  };

  if (!ready) return <div role="status" className="mx-auto max-w-4xl py-12 text-center text-sm text-muted-foreground">Loading your assessment…</div>;

  if (completed) {
    return (
      <div className="mx-auto max-w-3xl">
        <div className="border-b pb-8 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-sage text-forest"><CheckCircle2 className="size-7" /></span>
          <p className="eyebrow mt-5">Personal assessment</p>
          <h1 className="mt-2 font-display text-3xl md:text-4xl">Assessment complete</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Your assessment has been saved. You can review it from Daily Progress.
          </p>
        </div>
        <div className="mt-6 flex justify-center">
          <Button variant="forest" asChild><Link to="/dashboard">Go to Daily Progress <ArrowRight /></Link></Button>
        </div>
      </div>
    );
  }

  const currentStep = ASSESSMENT_STEPS[step];
  const cuisines = foodDataService.getCuisines();
  const stepProgress = ((step + 1) / ASSESSMENT_STEPS.length) * 100;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        eyebrow="Getting started"
        title="Personal Assessment"
        description="A few details help us understand your goals, routine, and food preferences. Required questions are marked; everything else is optional. Answers are saved to your account when you complete the assessment."
      />

      <div className="mt-6 rounded-lg border border-dashed bg-sage/40 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
        Assessment answers are not saved in browser storage. Incomplete answers will be cleared if you leave this page before submitting.
      </div>
      {persistenceError && <div role="alert" className="mt-4 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{persistenceError}</div>}

      <div className="mt-8" aria-label="Assessment progress">
        <div className="mb-2 flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-forest">{currentStep}</p>
          <p className="text-xs text-muted-foreground">Step {step + 1} of {ASSESSMENT_STEPS.length}</p>
        </div>
        <Progress value={stepProgress} aria-label={`Step ${step + 1} of ${ASSESSMENT_STEPS.length}`} />
        <ol className="mt-3 hidden grid-cols-5 gap-2 sm:grid">
          {ASSESSMENT_STEPS.map((label, index) => (
            <li key={label} className={cn("text-xs", index <= step ? "font-medium text-forest" : "text-muted-foreground")}>{label}</li>
          ))}
        </ol>
      </div>

      <div className="mt-8 rounded-xl border bg-card p-5 md:p-8">
        {step === 0 && (
          <section aria-labelledby="assessment-step-title">
            <h2 id="assessment-step-title" className="font-display text-2xl">About you</h2>
            <p className="mt-1 text-sm text-muted-foreground">Basic measurements, using metric units for now.</p>
            <div className="mt-6 grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="assessment-age" required>Age</FieldLabel>
                <Input id="assessment-age" type="number" inputMode="numeric" min="1" max="120" step="1" required value={form.age} aria-invalid={!!errors["age"]} aria-describedby={errors["age"] ? "assessment-age-error" : undefined} onChange={(event) => update("age", event.target.value)} />
                <FieldError id="assessment-age">{errors["age"]}</FieldError>
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="assessment-height" required>Height <span className="font-normal text-muted-foreground">cm</span></FieldLabel>
                <Input id="assessment-height" type="number" inputMode="decimal" min="80" max="250" step="0.1" required value={form.heightCm} aria-invalid={!!errors["heightCm"]} aria-describedby={errors["heightCm"] ? "assessment-height-error" : undefined} onChange={(event) => update("heightCm", event.target.value)} />
                <FieldError id="assessment-height">{errors["heightCm"]}</FieldError>
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="assessment-weight" required>Current weight <span className="font-normal text-muted-foreground">kg</span></FieldLabel>
                <Input id="assessment-weight" type="number" inputMode="decimal" min="20" max="500" step="0.1" required value={form.weightKg} aria-invalid={!!errors["weightKg"]} aria-describedby={errors["weightKg"] ? "assessment-weight-error" : undefined} onChange={(event) => update("weightKg", event.target.value)} />
                <FieldError id="assessment-weight">{errors["weightKg"]}</FieldError>
              </div>
            </div>
          </section>
        )}

        {step === 1 && (
          <section aria-labelledby="assessment-step-title" className="space-y-7">
            <div>
              <h2 id="assessment-step-title" className="font-display text-2xl">Goals and routine</h2>
              <p className="mt-1 text-sm text-muted-foreground">These are preferences, not a prescribed nutrition plan.</p>
            </div>
            <ChoiceButtons label="Your goal" value={form.goal} options={GOALS} onChange={(value) => update("goal", value)} error={errors["goal"]} />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="assessment-activity" required>Activity level</FieldLabel>
                <select id="assessment-activity" required value={form.activityLevel} aria-invalid={!!errors["activityLevel"]} aria-describedby={errors["activityLevel"] ? "assessment-activity-error" : undefined} onChange={(event) => { const value = event.currentTarget.value; update("activityLevel", isOptionValue(ACTIVITY_LEVELS, value) ? value : ""); }} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Choose an activity level</option>
                  {ACTIVITY_LEVELS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <FieldError id="assessment-activity">{errors["activityLevel"]}</FieldError>
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="assessment-diet" required>Dietary pattern</FieldLabel>
                <select id="assessment-diet" required value={form.dietaryPattern} aria-invalid={!!errors["dietaryPattern"]} aria-describedby={errors["dietaryPattern"] ? "assessment-diet-error" : undefined} onChange={(event) => { const value = event.currentTarget.value; update("dietaryPattern", isOptionValue(DIETARY_PATTERNS, value) ? value : ""); }} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">Choose a dietary pattern</option>
                  {DIETARY_PATTERNS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
                <FieldError id="assessment-diet">{errors["dietaryPattern"]}</FieldError>
              </div>
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="assessment-step-title" className="space-y-7">
            <div>
              <h2 id="assessment-step-title" className="font-display text-2xl">Food preferences</h2>
              <p className="mt-1 text-sm text-muted-foreground">Share what you enjoy. You can skip this step.</p>
            </div>
            <MultiChoice label="Preferred cuisines" options={cuisines} value={form.preferredCuisines} onChange={(value) => update("preferredCuisines", value)} />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="assessment-favorites">Favourite foods</FieldLabel>
                <Textarea id="assessment-favorites" value={form.favoriteFoods} maxLength={500} placeholder="Add any foods you enjoy" onChange={(event) => update("favoriteFoods", event.target.value)} />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="assessment-dislikes">Foods you dislike</FieldLabel>
                <Textarea id="assessment-dislikes" value={form.dislikedFoods} maxLength={500} placeholder="Add any foods you prefer to avoid" onChange={(event) => update("dislikedFoods", event.target.value)} />
              </div>
            </div>
          </section>
        )}

        {step === 3 && (
          <section aria-labelledby="assessment-step-title" className="space-y-7">
            <div>
              <h2 id="assessment-step-title" className="font-display text-2xl">Everyday needs</h2>
              <p className="mt-1 text-sm text-muted-foreground">Optional details can help shape practical meal ideas. You can skip this step.</p>
            </div>
            <div className="rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
              Allergy, intolerance, and health answers are sent only when you submit this assessment.
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="assessment-allergies">Allergies</FieldLabel>
                <Textarea id="assessment-allergies" value={form.allergies} maxLength={500} placeholder="Only share what you want considered" onChange={(event) => update("allergies", event.target.value)} />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="assessment-intolerances">Intolerances</FieldLabel>
                <Textarea id="assessment-intolerances" value={form.intolerances} maxLength={500} placeholder="Optional" onChange={(event) => update("intolerances", event.target.value)} />
              </div>
            </div>
            <MultiChoice label="Meal timing preferences" options={MEAL_TIMES} value={form.mealTimingPreferences} onChange={(value) => update("mealTimingPreferences", value)} />
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="assessment-budget">Food budget</FieldLabel>
                <Input id="assessment-budget" value={form.budget} maxLength={120} placeholder="Optional, include currency and period" onChange={(event) => update("budget", event.target.value)} />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="assessment-cooking">Cooking preference</FieldLabel>
                <select id="assessment-cooking" value={form.cookingPreference} onChange={(event) => { const value = event.currentTarget.value; update("cookingPreference", isOptionValue([{ value: "home-cooking" }, { value: "quick-meals" }, { value: "minimal-cooking" }, { value: "mix" }] as const, value) ? value : ""); }} className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                  <option value="">No preference</option>
                  <option value="home-cooking">I enjoy cooking at home</option>
                  <option value="quick-meals">Quick meals work best</option>
                  <option value="minimal-cooking">Minimal cooking</option>
                  <option value="mix">A mix of options</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <FieldLabel htmlFor="assessment-health">Health considerations</FieldLabel>
              <Textarea id="assessment-health" value={form.healthConsiderations} maxLength={500} placeholder="Share only what you would like considered; avoid details you do not want to include." onChange={(event) => update("healthConsiderations", event.target.value)} />
              <p className="text-xs text-muted-foreground">Optional. NUTRIFY does not diagnose conditions or provide medical advice.</p>
            </div>
          </section>
        )}

        {step === 4 && (
          <section aria-labelledby="assessment-step-title">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-sage text-forest"><ClipboardCheck className="size-5" /></span>
              <div>
                <h2 id="assessment-step-title" className="font-display text-2xl">Review your answers</h2>
                <p className="mt-1 text-sm text-muted-foreground">Check your details before completing the assessment.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <section className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold text-forest">About you</h3>
                <dl className="mt-2">
                  <ReviewItem label="Age" value={`${form.age} years`} />
                  <ReviewItem label="Height" value={`${form.heightCm} cm`} />
                  <ReviewItem label="Current weight" value={`${form.weightKg} kg`} />
                </dl>
              </section>
              <section className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold text-forest">Goals and routine</h3>
                <dl className="mt-2">
                  <ReviewItem label="Goal" value={GOALS.find((option) => option.value === form.goal)?.label ?? ""} />
                  <ReviewItem label="Activity level" value={ACTIVITY_LEVELS.find((option) => option.value === form.activityLevel)?.label ?? ""} />
                  <ReviewItem label="Dietary pattern" value={DIETARY_PATTERNS.find((option) => option.value === form.dietaryPattern)?.label ?? ""} />
                </dl>
              </section>
              <section className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold text-forest">Food preferences</h3>
                <dl className="mt-2">
                  <ReviewItem label="Preferred cuisines" value={form.preferredCuisines.join(", ")} />
                  <ReviewItem label="Favourite foods" value={form.favoriteFoods} />
                  <ReviewItem label="Foods you dislike" value={form.dislikedFoods} />
                </dl>
              </section>
              <section className="rounded-lg border p-4">
                <h3 className="text-sm font-semibold text-forest">Everyday needs</h3>
                <dl className="mt-2">
                  <ReviewItem label="Allergies" value={form.allergies} />
                  <ReviewItem label="Intolerances" value={form.intolerances} />
                  <ReviewItem label="Meal timing" value={form.mealTimingPreferences.join(", ")} />
                  <ReviewItem label="Food budget" value={form.budget} />
                  <ReviewItem label="Cooking preference" value={form.cookingPreference ? form.cookingPreference.replaceAll("-", " ") : ""} />
                  <ReviewItem label="Health considerations" value={form.healthConsiderations} />
                </dl>
              </section>
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">This assessment saves your preferences; it does not calculate nutrition targets or provide medical advice.</p>
          </section>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5">
          <Button type="button" variant="outline" onClick={goBack} disabled={step === 0}>
            <ArrowLeft /> Back
          </Button>
          <div className="flex flex-wrap gap-2">
            {step === 2 && <Button type="button" variant="ghost" onClick={skipOptional}>Skip optional questions <ArrowRight /></Button>}
            {step < 4 ? (
              <Button type="button" variant="forest" onClick={continueStep}>{step === 3 ? "Review answers" : "Continue"} <ArrowRight /></Button>
            ) : (
              <Button type="button" variant="forest" onClick={completeAssessment} disabled={saving}>
                {saving ? "Saving…" : "Complete assessment"} {!saving && <CheckCircle2 />}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}