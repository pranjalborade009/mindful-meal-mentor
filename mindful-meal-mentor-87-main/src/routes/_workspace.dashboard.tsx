import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Target, Activity, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionCard, EmptyState } from "@/components/common";
import { foodDataService } from "@/services/food-data-service";
import { loadDashboardData } from "@/services/user-data-server";
import { getDashboardAssessmentSummary } from "@/services/dashboard-service";
import { useSavedFoods } from "@/hooks/use-saved-foods";
import { pageMeta } from "@/lib/seo";
import { formatNutrient } from "@/lib/portion-calculations";

export const Route = createFileRoute("/_workspace/dashboard")({
  head: () => pageMeta("Overview", "Review your saved assessment and favourite foods."),
  component: Dashboard,
});

function Dashboard() {
  const { saved } = useSavedFoods();
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof loadDashboardData>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setDashboard(null);
    void loadDashboardData()
      .then((data) => {
        if (active) setDashboard(data);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load your dashboard.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadKey]);

  const summary = getDashboardAssessmentSummary(dashboard?.assessment?.answers ?? null);
  const assessment = dashboard?.assessment;
  const summaryRows = summary
    ? [
        ["Age", summary.age],
        ["Height", summary.height],
        ["Weight", summary.weight],
        ["Goal", summary.goal],
        ["Activity level", summary.activity],
        ["Dietary pattern", summary.diet],
        ["Preferred cuisines", summary.cuisines],
        ["Food budget", summary.budget],
      ]
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title={dashboard?.displayName ? `Welcome, ${dashboard.displayName}` : "Overview"}
        description="Your saved assessment and favourite foods."
      />

      {loading ? (
        <div role="status" className="surface px-5 py-8 text-center text-sm text-muted-foreground">
          Loading your profile and assessment…
        </div>
      ) : error ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <span>{error}</span>
          <Button type="button" variant="outline" size="sm" onClick={() => setReloadKey((key) => key + 1)}>Retry</Button>
        </div>
      ) : dashboard && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Target, label: "Current goal", value: summary?.goal ?? "Not set" },
              { icon: Activity, label: "Activity level", value: summary?.activity ?? "Not set" },
              { icon: Bookmark, label: "Saved foods", value: String(saved.length) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="surface p-5">
                <Icon className="size-4 text-primary" />
                <p className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="mt-1 font-display text-2xl text-forest">{value}</p>
              </div>
            ))}
          </div>

          <SectionCard title="Assessment summary" subtitle="From your latest saved assessment">
            {summary && assessment ? (
              <>
                <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
                  {summaryRows.map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-muted-foreground">{label}</dt>
                      <dd className="mt-0.5 font-medium text-forest">{value || "Not provided"}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-4 text-xs text-muted-foreground">
                  Assessment saved {new Date(assessment.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}.
                </p>
                <Button variant="outline" size="sm" className="mt-4" asChild><Link to="/assessment">Review assessment</Link></Button>
              </>
            ) : (
              <EmptyState
                icon={Target}
                title="No completed assessment yet"
                description="Complete your assessment to see your saved goals, measurements, activity level, and dietary preferences here."
                action={<Button variant="forest" size="sm" asChild><Link to="/assessment">Complete assessment <ArrowRight /></Link></Button>}
              />
            )}
          </SectionCard>

          <SectionCard title="Saved foods">
            {saved.length === 0 ? (
              <EmptyState icon={Bookmark} title="No saved foods" description="Save foods you like to find them here." action={<Button variant="outline" size="sm" asChild><Link to="/explorer">Browse foods</Link></Button>} />
            ) : (
              <ul className="divide-y">
                {saved.slice(0, 4).map((id) => {
                  const food = foodDataService.getById(id);
                  return food && (
                    <li key={id} className="flex items-center gap-3 py-3">
                      {food.image && <img src={food.image} alt="" className="size-11 rounded-lg object-cover" loading="lazy" />}
                      <div className="flex-1">
                        <p className="text-sm font-medium text-forest">{food.name}</p>
                        <p className="text-xs text-muted-foreground">{formatNutrient(food.nutrition.caloriesKcal, " kcal")} · {formatNutrient(food.nutrition.proteinG, " g protein")}</p>
                      </div>
                      <Link to="/foods/$foodId" params={{ foodId: food.id }} className="text-xs text-primary">View</Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </>
      )}
    </div>
  );
}
