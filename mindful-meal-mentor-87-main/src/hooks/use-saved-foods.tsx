import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { foodDataService } from "@/services/food-data-service";

/** Local demo state only — replace with API persistence later. */
interface SavedCtx {
  saved: string[];
  isSaved: (id: string) => boolean;
  toggle: (id: string) => void;
  remove: (id: string) => void;
}

const Ctx = createContext<SavedCtx | null>(null);

export function SavedFoodsProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<string[]>([]);

  const toggle = useCallback((id: string) => {
    setSaved((s) => {
      const has = s.includes(id);
      const name = foodDataService.getById(id)?.name ?? "Food";
      toast(has ? `${name} removed` : `${name} saved`, {
        ...(!has ? { description: "Saved for this session only." } : {}),
      });
      return has ? s.filter((x) => x !== id) : [...s, id];
    });
  }, []);
  const remove = useCallback((id: string) => setSaved((s) => s.filter((x) => x !== id)), []);

  const value = useMemo(() => ({ saved, isSaved: (id: string) => saved.includes(id), toggle, remove }), [saved, toggle, remove]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSavedFoods() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useSavedFoods must be used within SavedFoodsProvider");
  return c;
}
