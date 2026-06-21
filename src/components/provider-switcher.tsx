import Link from "next/link";
import { ProviderLogo } from "@/components/provider-logo";
import { cn } from "@/lib/utils";

interface Opt {
  id: string;
  displayName: string;
  logoSeed: string;
}

/** Switch the active provider in the public portal via a query param. */
export function ProviderSwitcher({ providers, activeId }: { providers: Opt[]; activeId: string }) {
  return (
    <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
      {providers.map((p) => (
        <Link
          key={p.id}
          href={`/provider?p=${p.id}`}
          scroll={false}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs font-medium transition-all",
            p.id === activeId ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border bg-card hover:bg-secondary",
          )}
        >
          <ProviderLogo name={p.displayName} seed={p.logoSeed} size={22} rounded="rounded-lg" />
          {p.displayName}
        </Link>
      ))}
    </div>
  );
}
