import { Link } from "@tanstack/react-router";
import { Leaf } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, compact }: { className?: string; compact?: boolean }) {
  return (
    <Link to="/" className={cn("group inline-flex items-center gap-2", className)} aria-label="NUTRIFY home">
      <span className="grid size-8 place-items-center rounded-full bg-forest text-lime transition-transform duration-500 group-hover:rotate-12">
        <Leaf className="size-4" />
      </span>
      {!compact && (
        <span className="font-display text-xl text-forest">
          NUTRIFY
        </span>
      )}
    </Link>
  );
}
