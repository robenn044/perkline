import { Star } from "lucide-react";
import { CategoryChip } from "@/components/category-chip";
import { ProviderLogo } from "@/components/provider-logo";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import type { Offer, Provider } from "@/lib/types";
import { cn } from "@/lib/utils";

export function OfferCard({
  offer,
  provider,
  className,
}: {
  offer: Offer;
  provider?: Provider;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "group flex w-[248px] shrink-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow",
        className,
      )}
    >
      <div
        className="relative h-24 w-full"
        style={{
          background: `linear-gradient(135deg, hsl(var(--primary) / 0.85), hsl(var(--accent) / 0.85))`,
        }}
      >
        <div className="absolute right-2 top-2 flex gap-1">
          {offer.isFresh && <Badge variant="success">Fresh</Badge>}
          {offer.isFridayDrop && <Badge variant="warning">Friday Drop</Badge>}
        </div>
        <div className="absolute -bottom-4 left-3">
          <ProviderLogo name={provider?.displayName ?? ""} seed={provider?.logoSeed} size={40} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-3 pt-5">
        <div className="flex items-center justify-between gap-2">
          <CategoryChip category={offer.category} />
          {provider && (
            <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-muted-foreground">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {provider.rating.toFixed(1)}
            </span>
          )}
        </div>
        <h3 className="mt-2 text-sm font-semibold leading-tight">{offer.title}</h3>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{offer.description}</p>
        <div className="mt-auto flex items-center justify-between pt-3">
          <div>
            <p className="tabular text-sm font-bold">{formatMoney(offer.price, offer.currency)}</p>
            {offer.durationLabel && (
              <p className="text-[11px] text-muted-foreground">{offer.durationLabel}</p>
            )}
          </div>
          {provider && <span className="text-[11px] text-muted-foreground">{provider.neighborhood}</span>}
        </div>
      </div>
    </article>
  );
}
