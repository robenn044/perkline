import { Banknote, MapPin, Star, Tag, Ticket, TrendingUp } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ProviderSwitcher } from "@/components/provider-switcher";
import { ProviderLogo } from "@/components/provider-logo";
import { RedeemButton } from "@/components/redeem-button";
import { CategoryChip } from "@/components/category-chip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import {
  getDefaultMarket,
  getOffersByProvider,
  getProvider,
  getProviderPaymentDestination,
  getProviders,
  getSplitsForProvider,
  getVouchersForProvider,
} from "@/lib/store";
import { paymentDestinationDisplay } from "@/lib/payment-destination";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function ProviderConsole({ searchParams }: { searchParams: { p?: string } }) {
  const provider = getProvider(searchParams.p ?? "") ?? getProviders()[0];
  const market = getDefaultMarket();

  const offers = getOffersByProvider(provider.id);
  const splits = getSplitsForProvider(provider.id);
  const vouchers = getVouchersForProvider(provider.id);
  const settlementDestination = getProviderPaymentDestination(provider.id);
  const earned = splits.reduce((s, x) => s + x.split.amount, 0);
  const pendingVouchers = vouchers.filter((v) => v.voucher.status !== "redeemed").length;

  const switchers = getProviders().map((p) => ({ id: p.id, displayName: p.displayName, logoSeed: p.logoSeed }));

  return (
    <>
      <SiteHeader role="provider" marketLabel={`${market.city} · ${market.defaultCurrency}`} />
      <main id="main-content" className="container space-y-6 py-6">
        <ProviderSwitcher providers={switchers} activeId={provider.id} />

        {/* Provider header */}
        <section className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-soft sm:flex-row sm:items-center">
          <ProviderLogo name={provider.displayName} seed={provider.logoSeed} size={56} />
          <div className="flex-1">
            <h1 className="text-xl font-bold leading-tight">{provider.displayName}</h1>
            <p className="text-sm text-muted-foreground">{provider.blurb}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <CategoryChip category={provider.category} />
              <Badge variant="outline">
                <MapPin className="h-3.5 w-3.5" /> {provider.neighborhood}
              </Badge>
              <Badge variant="outline">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {provider.rating.toFixed(1)}
              </Badge>
              <Badge variant="outline">
                {settlementDestination
                  ? paymentDestinationDisplay(settlementDestination)
                  : "Settlement setup required"}
              </Badge>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:w-auto">
            <Stat icon={<Banknote className="h-4 w-4 text-success" />} value={formatMoney(earned)} label="received" />
            <Stat icon={<Ticket className="h-4 w-4 text-primary" />} value={`${vouchers.length}`} label="vouchers" />
            <Stat icon={<TrendingUp className="h-4 w-4 text-accent" />} value={`${offers.length}`} label="live offers" />
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Incoming payments */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">Incoming payments</h2>
              {splits.length > 0 && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                </span>
              )}
            </div>
            {splits.length === 0 ? (
              <EmptyState icon={<Banknote className="h-5 w-5" />} text="No payments yet. Approved packages route here automatically." />
            ) : (
              <div className="space-y-2">
                {splits.map(({ split, request }) => (
                  <div key={split.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3.5 shadow-soft">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{formatMoney(split.amount, split.currency)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        From “{request.package.title}” · {split.paidAt ? timeAgo(split.paidAt) : "scheduled"}
                      </p>
                    </div>
                    <Badge variant="success">Received</Badge>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Vouchers */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight">Vouchers to confirm</h2>
              {pendingVouchers > 0 && <Badge variant="primary">{pendingVouchers} new</Badge>}
            </div>
            {vouchers.length === 0 ? (
              <EmptyState icon={<Ticket className="h-5 w-5" />} text="Vouchers appear here once a customer's package is approved." />
            ) : (
              <div className="space-y-2">
                {vouchers.map(({ voucher }) => (
                  <div key={voucher.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-card p-3.5 shadow-soft">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{voucher.offerTitle}</p>
                      <p className="font-mono text-xs text-muted-foreground">{voucher.code}</p>
                    </div>
                    <RedeemButton voucherId={voucher.id} redeemed={voucher.status === "redeemed"} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Offer catalog */}
        <section className="space-y-3">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
            <Tag className="h-5 w-5 text-primary" /> Your offers
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {offers.map((o) => (
              <Card key={o.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CategoryChip category={o.category} />
                    <span className="tabular text-sm font-bold">{formatMoney(o.price, o.currency)}</span>
                  </div>
                  <CardTitle className="pt-1 text-sm">{o.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-2 text-xs text-muted-foreground">{o.description}</p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {o.tags.slice(0, 3).map((t) => (
                      <span key={t} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {t}
                      </span>
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

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border/70 bg-secondary/40 p-2 text-center">
      {icon}
      <span className="tabular mt-0.5 text-sm font-bold leading-tight">{value}</span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

function EmptyState({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-5 text-sm text-muted-foreground">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">{icon}</span>
      {text}
    </div>
  );
}
