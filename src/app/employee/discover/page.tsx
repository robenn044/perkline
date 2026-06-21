import { Compass, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PackageCard } from "@/components/package-card";
import { OfferCard } from "@/components/offer-card";
import { CategoryChip } from "@/components/category-chip";
import { requireRole } from "@/lib/auth";
import {
  getCuratedPackages,
  getDefaultMarket,
  getEmployee,
  getOffers,
  getProviders,
} from "@/lib/store";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const session = await requireRole("employee");
  const employee = getEmployee(session.employeeId!) ?? getEmployee("emp_elira")!;
  const market = getDefaultMarket();
  const offers = getOffers();
  const providers = getProviders();
  const providerById = new Map(providers.map((provider) => [provider.id, provider]));
  const routes = [...getCuratedPackages()].sort((a, b) => {
    const score = (categories: Category[]) =>
      categories.filter((category) => employee.preferences.includes(category)).length;
    return score(b.categoryTags) - score(a.categoryTags);
  });

  return (
    <>
      <SiteHeader
        role="employee"
        marketLabel={`${market.city} · ${market.defaultCurrency}`}
        user={{ name: employee.name, avatarSeed: employee.avatarSeed }}
      />
      <main id="main-content" className="container space-y-7 py-6">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Compass className="h-6 w-6 text-primary" aria-hidden /> Discover Tirana
          </h1>
          <p className="text-sm text-muted-foreground">
            Useful benefits, limited drops and collections grounded in your employer policy.
          </p>
        </div>

        <section className="space-y-3">
          <div>
            <h2 className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden /> Collections for you
            </h2>
            <p className="text-sm text-muted-foreground">
              Multi-provider plans ranked by your preferences and remaining allowance.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {routes.map((route) => (
              <PackageCard key={route.id} pkg={route} href={`/employee/package/${route.id}`} />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {market.categories.map((category) => (
              <CategoryChip key={category} category={category} className="px-3.5 py-2 text-sm" />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                provider={providerById.get(offer.providerId)}
              />
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
