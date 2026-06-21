import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Layers, Sparkles } from "lucide-react";
import { CategoryChip } from "@/components/category-chip";
import { formatMoney } from "@/lib/money";
import { routeGradient } from "@/lib/utils";
import type { Package } from "@/lib/types";

export function PackageCard({ pkg, href }: { pkg: Package; href: string }) {
  const providerCount = new Set(pkg.items.map((i) => i.providerId)).size;
  return (
    <Link
      href={href}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-all hover:-translate-y-1 hover:shadow-glow"
    >
      <div className="relative h-28 w-full overflow-hidden" style={{ background: routeGradient(pkg.heroSeed) }}>
        {pkg.image && (
          <Image
            src={pkg.image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
        <div className="absolute left-4 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-foreground">
          {pkg.source === "ai" ? <Sparkles className="h-3 w-3 text-primary" /> : <Layers className="h-3 w-3 text-primary" />}
          {pkg.source === "ai" ? "AI package" : "Curated collection"}
        </div>
        <div className="absolute bottom-3 left-4 right-4">
          <h3 className="text-lg font-bold leading-tight text-white drop-shadow">{pkg.title}</h3>
          <p className="text-xs text-white/85">{pkg.tagline}</p>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex flex-wrap gap-1.5">
          {pkg.categoryTags.map((c) => (
            <CategoryChip key={c} category={c} />
          ))}
        </div>
        <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{pkg.reason}</p>
        <div className="mt-auto flex items-center justify-between pt-4">
          <div>
            <p className="tabular text-lg font-bold">{formatMoney(pkg.total, pkg.currency)}</p>
            <p className="text-[11px] text-muted-foreground">
              {pkg.items.length} experiences · {providerCount} providers
            </p>
          </div>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary transition-transform group-hover:translate-x-0.5">
            View <ArrowRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}
