"use client";

import { motion } from "framer-motion";
import { CategoryChip } from "@/components/category-chip";
import { ProviderLogo } from "@/components/provider-logo";
import { formatMoney } from "@/lib/money";
import type { CatalogLite } from "@/lib/catalog-lite";
import type { Package } from "@/lib/types";

/**
 * Renders a package's per-provider, per-offer price breakdown. `animate` enables
 * the staged reveal used in the concierge result sheet.
 */
export function PackageBreakdown({
  pkg,
  catalog,
  animate = false,
}: {
  pkg: Package;
  catalog: CatalogLite;
  animate?: boolean;
}) {
  const items = [...pkg.items].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const meta = catalog[item.offerId];
        const Row = (
          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3">
            <ProviderLogo name={meta?.providerName ?? ""} seed={meta?.providerSeed} size={42} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold">{meta?.title ?? item.offerId}</p>
                {meta && <CategoryChip category={meta.category} withIcon={false} className="hidden sm:inline-flex" />}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {meta?.providerName}
                {meta?.neighborhood ? ` · ${meta.neighborhood}` : ""}
                {meta?.durationLabel ? ` · ${meta.durationLabel}` : ""}
              </p>
            </div>
            <p className="tabular shrink-0 text-sm font-bold">{formatMoney(item.price, pkg.currency)}</p>
          </div>
        );
        return animate ? (
          <motion.div
            key={item.offerId}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 * i + 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            {Row}
          </motion.div>
        ) : (
          <div key={item.offerId}>{Row}</div>
        );
      })}
    </div>
  );
}
