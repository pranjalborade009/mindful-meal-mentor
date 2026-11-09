const LEGACY_DRAFT_KEY = "nutrify-assessment-draft-v1";

export function clearLegacyAssessmentDraft(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LEGACY_DRAFT_KEY);
}
