import { Boxes, MapPin, Route, Store } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ProviderLogo } from "@/components/provider-logo";
import { ProviderStatusControl } from "@/components/provider-status-control";
import { CategoryChip } from "@/components/category-chip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import {
  getCompany,
  getCuratedPackages,
  getDefaultMarket,
  getOffers,
  getOffersByProvider,
  getProviderPaymentDestination,
  getProviders,
} from "@/lib/store";
import { paymentDestinationDisplay } from "@/lib/payment-destination";

export const dynamic = "force-dynamic";

export default async function CatalogPage() {
  const session = await requireRole("company_admin");
  const company = getCompany(session.companyId)!;
  const market = getDefaultMarket();
  const providers = getProviders().filter((provider) => provider.marketId === company.marketId);
  const offerById = new Map(getOffers().map((offer) => [offer.id, offer]));
  const routes = getCuratedPackages();

  return (
    <>
      <SiteHeader
        role="admin"
        marketLabel={`${market.city} · ${market.defaultCurrency}`}
        user={{ name: session.name, avatarSeed: session.avatarSeed }}
      />
      <main id="main-content" className="container space-y-6 py-6">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Boxes className="h-6 w-6 text-primary" aria-hidden /> Catalog & providers
          </h1>
          <p className="text-sm text-muted-foreground">
            Control which Tirana partners can appear in discovery, policy checks and Perkline Match.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
            <Store className="h-5 w-5 text-primary" aria-hidden /> Providers
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {providers.map((provider) => {
              const offers = getOffersByProvider(provider.id);
              const destination = getProviderPaymentDestination(provider.id);
              return (
                <Card key={provider.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <ProviderLogo name={provider.displayName} seed={provider.logoSeed} size={42} />
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base">{provider.displayName}</CardTitle>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" aria-hidden /> {provider.neighborhood} · {offers.length} offers
                        </p>
                      </div>
                      <ProviderStatusControl providerId={provider.id} status={provider.status} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex flex-wrap gap-1.5">
                      <CategoryChip category={provider.category} />
                      <Badge variant={destination ? "success" : "warning"}>
                        {destination ? paymentDestinationDisplay(destination) : "Settlement missing"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{provider.blurb}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
            <Route className="h-5 w-5 text-primary" aria-hidden /> Curated Collections
          </h2>
          <div className="grid gap-3 lg:grid-cols-2">
            {routes.map((route) => (
              <Card key={route.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">{route.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">{route.tagline}</p>
                    </div>
                    <span className="tabular text-sm font-bold">{formatMoney(route.total, route.currency)}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-xs text-muted-foreground">
                    {route.items.map((item) => (
                      <p key={item.offerId}>
                        {offerById.get(item.offerId)?.title ?? "Missing offer"} ·{" "}
                        {formatMoney(offerById.get(item.offerId)?.price ?? 0, route.currency)}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}
