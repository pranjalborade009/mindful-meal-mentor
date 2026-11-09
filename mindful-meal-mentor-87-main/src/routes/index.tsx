import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Search, BookOpen, ClipboardCheck, UserRound, BarChart3, ListOrdered } from "lucide-react";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteChrome";
import { Button } from "@/components/ui/button";
import { FoodCard } from "@/components/food/FoodCard";
import { foodDataService } from "@/services/food-data-service";
import hero from "@/assets/hero-meal.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NUTRIFY — Smarter nutrition for everyday life." },
      { name: "description", content: "Discover foods, keep a daily food diary, and review nutrition for the portions you choose." },
      { property: "og:title", content: "NUTRIFY — Smarter nutrition for everyday life." },
      { property: "og:description", content: "Discover foods, keep a daily food diary, and review nutrition for the portions you choose." },
    ],
  }),
  component: HomePage,
});

const pillars = [
  { icon: Search, title: "Food Discovery", text: "Browse prepared foods, compare nutrition, and save favourites." },
  { icon: BookOpen, title: "Food Diary", text: "Log portions by meal and review daily nutrition totals." },
  { icon: ClipboardCheck, title: "Personal Assessment", text: "Keep your goals, routine, measurements, and food preferences in one place." },
];

const steps = [
  { n: "01", icon: UserRound, title: "Share Your Preferences", text: "Record your goals, routine, measurements, and food preferences." },
  { n: "02", icon: BarChart3, title: "Explore Your Food Options", text: "Search the catalogue and compare nutrition for foods you enjoy." },
  { n: "03", icon: ListOrdered, title: "Track Daily Progress", text: "Log meals and review your nutrition totals for the day." },
];

function HomePage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 pt-12 md:px-8 lg:grid-cols-[1.05fr_1fr] lg:pt-20">
          <div className="fade-up">
            <p className="eyebrow">Food discovery • daily nutrition</p>
            <h1 className="mt-6 font-display text-[3.4rem] leading-[0.98] sm:text-7xl lg:text-[5.6rem]">
              Better meals.<br />
              <span className="italic text-primary">Clearer progress.</span>
            </h1>
            <p className="mt-7 max-w-md text-base leading-relaxed text-muted-foreground md:text-lg">
              Explore foods, log meals, and review daily nutrition based on the portions you choose.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button variant="forest" size="lg" asChild>
                <Link to="/dashboard">Explore NUTRIFY <ArrowRight /></Link>
              </Button>
              <Button variant="outline" size="lg" asChild><Link to="/explorer">Explore foods</Link></Button>
            </div>
            <div className="mt-12 flex items-center gap-3 text-[0.7rem] font-medium uppercase tracking-[0.2em] text-muted-foreground">
              <span className="h-px w-10 bg-primary/40" /> Everyday food discovery
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg fade-up [animation-delay:150ms]">
            <div className="absolute -right-6 -top-6 size-40 rounded-full bg-lime/50 blur-2xl" aria-hidden />
            <div className="absolute -bottom-8 -left-8 size-56 rounded-full bg-sage" aria-hidden />
            <div className="relative overflow-hidden rounded-[2.5rem_2.5rem_2.5rem_9rem] border-8 border-card shadow-[var(--shadow-soft)]">
              <img src={hero} alt="Balanced salmon, quinoa and avocado bowl" width={1280} height={1536} className="aspect-[5/6] w-full object-cover" />
            </div>
          </div>
        </div>

        <div className="border-y bg-card/60">
          <div className="mx-auto grid max-w-7xl divide-y px-5 md:grid-cols-3 md:divide-x md:divide-y-0 md:px-8">
            {pillars.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-4 py-7 md:px-8 first:md:pl-0">
                <Icon className="mt-1 size-5 shrink-0 text-primary" />
                <div>
                  <p className="font-display text-xl text-forest">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 md:px-8">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_2fr]">
          <div>
            <p className="eyebrow">How it works</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">From profile to plate, in three steps.</h2>
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border bg-border md:grid-cols-3">
            {steps.map(({ n, icon: Icon, title, text }) => (
              <div key={n} className="group bg-card p-7 transition-colors hover:bg-sage/40">
                <div className="flex items-center justify-between">
                  <span className="font-display text-5xl text-primary/30 transition-colors group-hover:text-primary">{n}</span>
                  <Icon className="size-5 text-forest" />
                </div>
                <h3 className="mt-10 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Food discovery */}
      <section className="mx-auto max-w-7xl px-5 py-24 md:px-8">
        <div>
          <div>
            <p className="eyebrow">Food discovery</p>
            <h2 className="mt-4 font-display text-4xl md:text-5xl">A taste of the catalogue.</h2>
          </div>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {foodDataService.getExplorerFoods().slice(0, 4).map((f) => <FoodCard key={f.id} food={f} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-24 md:px-8">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-sage px-8 py-16 text-center md:py-20">
          <div className="absolute inset-0 dot-grid opacity-60" aria-hidden />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-4xl md:text-6xl">Make more informed food choices.</h2>
            <p className="mx-auto mt-4 max-w-md text-muted-foreground">Explore nutrition, record meals, and review your food preferences in one place.</p>
            <Button variant="forest" size="lg" className="mt-8" asChild><Link to="/register">Get Started <ArrowRight /></Link></Button>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
