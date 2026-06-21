import { ArrowRight, Landmark, ShieldCheck, Split } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ProviderSettlementManager } from "@/components/provider-settlement-manager";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { formatMoney } from "@/lib/money";
import {
  getCompany,
  getDefaultMarket,
  getProviderPaymentDestinations,
  getProviders,
  getRequestsByCompany,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  const session = await requireRole("company_admin");
  const company = getCompany(session.companyId)!;
  const market = getDefaultMarket();
  const providers = getProviders().filter((provider) => provider.marketId === company.marketId);
  const destinations = getProviderPaymentDestinations().filter((destination) =>
    providers.some((provider) => provider.id === destination.ownerId),
  );
  const providerById = new Map(providers.map((provider) => [provider.id, provider]));
  const splits = getRequestsByCompany(session.companyId).flatMap((request) =>
    request.paymentSplits.map((split) => ({ request, split })),
  );

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
            <Landmark className="h-6 w-6 text-primary" aria-hidden /> Provider settlements
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure valid provider destinations and trace every employer-to-provider split.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">How payments work</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 text-sm md:grid-cols-4">
              {[
                ["1", "Employee selects", "An eligible offer or multi-provider Collection."],
                ["2", "Policy approves", "Rules or a manager authorize employer spend."],
                ["3", "Perkline splits", "One simulated settlement per provider."],
                ["4", "Voucher unlocks", "The employee receives access, never cash."],
              ].map(([number, title, body], index) => (
                <div key={number} className="relative rounded-xl bg-secondary/45 p-3">
                  <Badge variant="primary">{number}</Badge>
                  <p className="mt-2 font-semibold">{title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{body}</p>
                  {index < 3 && (
                    <ArrowRight className="absolute -right-2 top-1/2 hidden h-4 w-4 text-muted-foreground md:block" aria-hidden />
                  )}
                </div>
              ))}
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-success" aria-hidden />
              Demo-only simulated money. Bank details are masked; PayPal and processor flows are hosted/tokenized.
            </p>
          </CardContent>
        </Card>

        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight">Settlement destination setup</h2>
          <ProviderSettlementManager providers={providers} destinations={destinations} />
        </section>

        <section className="space-y-3">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
            <Split className="h-5 w-5 text-primary" aria-hidden /> Settlement ledger
          </h2>
          {splits.length === 0 ? (
            <Card>
              <CardContent className="py-9 text-center text-sm text-muted-foreground">
                No provider splits yet. Approve a benefit request to populate the ledger.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {splits.map(({ request, split }) => (
                <div
                  key={split.id}
                  className="grid gap-2 rounded-xl border border-border/70 bg-card p-3 text-sm shadow-soft sm:grid-cols-[1fr_auto]"
                >
                  <div>
                    <p className="font-medium">
                      {providerById.get(split.providerId)?.displayName ?? split.providerName}
                      <span className="text-muted-foreground"> · {request.package.title}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {split.destinationDisplay}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="tabular font-bold">{formatMoney(split.amount, split.currency)}</p>
                    <Badge variant="success">{split.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
