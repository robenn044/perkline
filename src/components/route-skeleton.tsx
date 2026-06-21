import { Skeleton } from "@/components/ui/skeleton";

/**
 * Lightweight, layout-stable skeleton for route `loading.tsx` boundaries.
 * Mirrors the header + content rhythm so there's no shift when data resolves.
 */
export function RouteSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div aria-busy="true" aria-live="polite">
      {/* Header bar */}
      <div className="border-b border-border/60">
        <div className="container flex h-16 items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-xl" />
          <Skeleton className="h-5 w-28" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="container space-y-4 py-6">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: rows * 3 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-2xl" />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading…</span>
    </div>
  );
}
