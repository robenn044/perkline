import { Dumbbell, Flower2, GraduationCap, Plane, Signal, Stethoscope, UtensilsCrossed, type LucideIcon } from "lucide-react";
import { categoryLabel } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { Category, LocaleCode } from "@/lib/types";

/** Intentional, consistent iconography per category (no emoji). */
export const CATEGORY_ICON: Record<Category, LucideIcon> = {
  wellness: Flower2,
  food: UtensilsCrossed,
  learning: GraduationCap,
  health: Stethoscope,
  fitness: Dumbbell,
  travel: Plane,
  telecom: Signal,
};

export function CategoryChip({
  category,
  locale = "en-AL",
  className,
  withIcon = true,
}: {
  category: Category;
  locale?: LocaleCode;
  className?: string;
  withIcon?: boolean;
}) {
  const Icon = CATEGORY_ICON[category];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/60 px-2 py-0.5 text-xs font-medium text-secondary-foreground",
        className,
      )}
    >
      {withIcon && <Icon className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />}
      {categoryLabel(category, locale)}
    </span>
  );
}
