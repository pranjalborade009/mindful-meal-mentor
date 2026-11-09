import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bookmark, BookmarkCheck, ArrowUpRight, Leaf } from "lucide-react";
import type { Food } from "@/types";
import { useSavedFoods } from "@/hooks/use-saved-foods";
import { formatNutrient } from "@/lib/portion-calculations";
import { cn } from "@/lib/utils";

export function Macro({ label, value, unit = "g" }: { label: string; value: number | null; unit?: string }) {
  return (
    <div className="text-center">
      <p className="text-xs font-semibold text-forest sm:text-sm">{value === null ? "Not available" : formatNutrient(value, unit)}</p>
      <p className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

export function FoodImage({ food, className }: { food: Food; className?: string }) {
  const [failedImage, setFailedImage] = useState<string | null>(null);
  const image = food.image?.trim();
  const safeImage = image && (/^https?:\/\//i.test(image) || (image.startsWith("/") && !image.startsWith("//")));

  if (safeImage && failedImage !== image) {
    return (
      <img
        src={image}
        alt={food.name}
        loading="lazy"
        decoding="async"
        width={912}
        height={736}
        onError={() => setFailedImage(image)}
        className={cn("size-full object-cover", className)}
      />
    );
  }

  return (
    <div role="img" aria-label={`Photo unavailable for ${food.name}`} className={cn("grid size-full place-items-center bg-sage/75 text-forest", className)}>
      <span className="grid size-11 place-items-center rounded-full border border-forest/15 bg-card/75">
        <Leaf className="size-5" aria-hidden="true" />
      </span>
    </div>
  );
}

export function FoodImageCredit({ food }: { food: Food }) {
  const attribution = food.imageAttribution;
  if (!attribution) return null;

  return (
    <p className="mt-1 text-xs text-muted-foreground">
      Photo: <a href={attribution.sourceUrl} target="_blank" rel="noreferrer" className="underline">{attribution.credit}</a>
      {" · "}
      <a href={attribution.licenseUrl} target="_blank" rel="noreferrer" className="underline">{attribution.licenseName}</a>
    </p>
  );
}

export function FoodCard({
  food,
  onRemove,
}: {
  food: Food;
  onRemove?: () => void;
}) {
  const { isSaved, toggle } = useSavedFoods();
  const saved = isSaved(food.id);
  const categoryLabel = {
    dish: "Prepared dish",
    ingredient: "Ingredient",
    beverage: "Beverage",
    snack: "Snack",
    other: "Other food",
  }[food.category];
  const metadata = [
    food.regionalOrigin ?? (food.cuisine !== "Unspecified" ? food.cuisine : undefined),
    categoryLabel,
  ].filter((value): value is string => value !== undefined);
  const servingLabel = food.nutrition.basis === "per-100g"
    ? "Per 100 g"
    : `Per ${food.nutrition.servingSize.description ?? `${food.nutrition.servingSize.quantity} ${food.nutrition.servingSize.unit}`}`;
  return (
    <article className="surface lift group flex flex-col overflow-hidden">
      <div className="relative aspect-[5/4] overflow-hidden bg-muted">
        <FoodImage food={food} className="transition-transform duration-700 group-hover:scale-105" />
        <button
          type="button"
          onClick={onRemove ?? (() => toggle(food.id))}
          aria-label={onRemove ? `Remove ${food.name}` : saved ? `Unsave ${food.name}` : `Save ${food.name}`}
          className={cn("absolute right-3 top-3 grid size-9 place-items-center rounded-full backdrop-blur transition-colors", saved ? "bg-lime text-lime-foreground" : "bg-card/90 text-forest hover:bg-lime")}
        >
          {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        </button>
      </div>
      <div className="flex flex-1 flex-col p-4">
        {metadata.length > 0 && <p className="text-[0.7rem] uppercase tracking-wider text-muted-foreground">{metadata.join(" · ")}</p>}
        <h3 className="mt-1 font-display text-xl leading-tight">{food.name}</h3>
        <p className="mt-1 text-xs text-muted-foreground">Nutrition {servingLabel.toLowerCase()}</p>
        <FoodImageCredit food={food} />
        <div className="mt-4 grid grid-cols-5 gap-1 rounded-lg bg-muted/70 py-2.5">
          <Macro label="Calories" value={food.nutrition.caloriesKcal} unit=" kcal" />
          <Macro label="Protein" value={food.nutrition.proteinG} />
          <Macro label="Carbs" value={food.nutrition.carbohydrateG} />
          <Macro label="Fat" value={food.nutrition.fatG} />
          <Macro label="Fibre" value={food.nutrition.fiberG} />
        </div>
        <Link to="/foods/$foodId" params={{ foodId: food.id }} className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:text-forest">
          View details <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
      </div>
    </article>
  );
}
