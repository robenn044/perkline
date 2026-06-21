import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers, MapPin, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PackageBreakdown } from "@/components/package-breakdown";
import { PolicyBadge } from "@/components/policy-badge";
import { SubmitPackageButton } from "@/components/submit-package-button";
import { CategoryChip } from "@/components/category-chip";
import { Badge } from "@/components/ui/badge";
import { buildCatalogLite } from "@/lib/catalog-lite";
import { formatMoney } from "@/lib/money";
import { requireRole } from "@/lib/auth";
import { evaluatePackage } from "@/lib/policy";
import {
  getDefaultMarket,
  getEmployee,
  getOffers,
  getPackage,
  getPolicy,
  getProviders,
} from "@/lib/store";
import { routeGradient } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PackageDetailPage({ params }: { params: { id: string } }) {
  const pkg = getPackage(params.id);
  if (!pkg) notFound();

  const session = await requireRole("employee");
  const employee = getEmployee(session.employeeId!) ?? getEmployee("emp_elira")!;
  const policy = getPolicy(employee.companyId)!;
  const catalog = buildCatalogLite(getOffers(), getProviders());
  const market = getDefaultMarket();
  const evaln = evaluatePackage(pkg, employee, policy);
  const providerCount = new Set(pkg.items.map((i) => i.providerId)).size;

  return (
    <>
      <SiteHeader
        role="employee"
        marketLabel={`${market.city} · ${market.defaultCurrency}`}
        user={{ name: employee.name, avatarSeed: employee.avatarSeed }}
      />
      <main id="main-content" className="container max-w-3xl space-y-5 py-6">
        <Link href="/employee" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to feed
        </Link>

        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
          <div className="relative h-40 overflow-hidden p-5" style={{ background: routeGradient(pkg.heroSeed) }}>
            {pkg.image && (
              <Image src={pkg.image} alt="" fill sizes="(max-width: 768px) 100vw, 768px" className="object-cover" priority />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            <div className="relative flex h-full flex-col justify-between">
              <Badge className="w-fit bg-white/90 text-foreground">
                {pkg.source === "ai" ? <Sparkles className="h-3.5 w-3.5 text-primary" /> : <Layers className="h-3.5 w-3.5 text-primary" />}
                {pkg.source === "ai" ? "AI package" : "Curated collection"}
              </Badge>
              <div>
                <h1 className="text-3xl font-extrabold text-white drop-shadow">{pkg.title}</h1>
                <p className="text-sm text-white/90">{pkg.tagline}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-5">
            <div className="flex flex-wrap gap-1.5">
              {pkg.categoryTags.map((c) => (
                <CategoryChip key={c} category={c} />
              ))}
              <Badge variant="outline">
                <MapPin className="h-3.5 w-3.5" /> {providerCount} providers
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Why this fits: </span>
              {pkg.reason}
            </p>

            <div>
              <p className="mb-2 text-sm font-semibold">What's included</p>
              <PackageBreakdown pkg={pkg} catalog={catalog} />
            </div>

            <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-3">
              <span className="text-sm font-medium">Package total</span>
              <span className="tabular text-lg font-bold">{formatMoney(pkg.total, pkg.currency)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PolicyBadge status={evaln.status} />
              <Badge variant="outline">{formatMoney(evaln.budgetRemainingAfter)} left after</Badge>
            </div>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {evaln.notes.map((n, i) => (
                <li key={i}>• {n}</li>
              ))}
            </ul>

            <SubmitPackageButton
              pkg={pkg}
              origin="route"
              disabled={evaln.status === "blocked"}
              className="w-full"
            />
          </div>
        </div>
      </main>
    </>
  );
}
