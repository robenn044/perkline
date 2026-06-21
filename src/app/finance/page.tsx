import { redirect } from "next/navigation";
import { Banknote, CheckCircle2, Clock, Landmark, ShieldCheck, XCircle } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PayoutConsole } from "@/components/payout-console";
import { NotificationsStrip } from "@/components/notifications-strip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { rewardsPayoutsEnabled } from "@/lib/feature-flags";
import { getAllRailStatuses, livePayoutsEnabled } from "@/lib/finance-config";
import { formatMoney } from "@/lib/money";
import {
  getBonusPayouts,
  getCompanyBalance,
  getComplianceCase,
  getDefaultMarket,
  getEmployee,
  getFundingSources,
  getLedger,
  getNotifications,
  getWebhookEvents,
} from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import type { CurrencyCode } from "@/lib/types";

export const dynamic = "force-dynamic";

const CURRENCIES: CurrencyCode[] = ["ALL", "EUR", "USD"];

export default async function FinanceConsole() {
  // Finance exists only to settle the optional rewards module — gate the whole route.
  if (!rewardsPayoutsEnabled()) redirect("/");
  const session = await requireRole("finance_admin");
  const companyId = session.companyId;
  const payouts = getBonusPayouts(companyId).map((p) => ({
    ...p,
    avatarSeed: getEmployee(p.employeeId)?.avatarSeed ?? p.employeeId,
  }));
  const market = getDefaultMarket();

  const pending = payouts.filter((p) => p.status === "pending_review").length;
  const confirmed = payouts.filter((p) => p.status === "confirmed");
  const failed = payouts.filter((p) => p.status === "failed").length;
  const settled = confirmed.reduce((s, p) => s + p.amount, 0);
  const notifications = getNotifications(session.sub, 3);

  const rails = getAllRailStatuses();
  const live = livePayoutsEnabled();
  const compliance = getComplianceCase("company", companyId);
  const funding = getFundingSources(companyId);
  const ledger = getLedger(companyId, 8);
  const webhooks = getWebhookEvents(6);

  return (
    <>
      <SiteHeader role="finance" marketLabel={`${market.city} · ${market.defaultCurrency}`} user={{ name: session.name, avatarSeed: session.avatarSeed }} />
      <main id="main-content" className="container max-w-5xl space-y-6 py-6">
        <NotificationsStrip notifications={notifications} />
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Banknote className="h-6 w-6 text-primary" /> Company Finance
          </h1>
          <p className="text-sm text-muted-foreground">
            Fund, approve and settle employer bonuses to verified employee destinations — with dual
            approval, idempotent provider calls and signed settlement.
          </p>
        </div>

        {/* Compliance + rails banner */}
        <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={live ? "success" : "warning"}>
              {live ? "Live payouts ENABLED" : "Live payouts OFF (sandbox)"}
            </Badge>
            {compliance && (
              <>
                <Badge variant={compliance.kyc === "cleared" ? "success" : "warning"}>KYC {compliance.kyc}</Badge>
                <Badge variant={compliance.aml === "cleared" ? "success" : "warning"}>AML {compliance.aml}</Badge>
                <Badge variant={compliance.sanctions === "cleared" ? "success" : "warning"}>Sanctions {compliance.sanctions}</Badge>
              </>
            )}
            {rails.map((r) => (
              <Badge key={r.rail} variant={r.mode === "live" ? "success" : r.mode === "sandbox" ? "primary" : "outline"}>
                {r.rail}: {r.provider} · {r.mode}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Live money moves only when a rail is configured for <code>live</code> and{" "}
            <code>LIVE_PAYOUTS_ENABLED=true</code>. Otherwise payouts settle in a clearly-labelled sandbox.
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric icon={<Clock className="h-4 w-4 text-amber-500" />} value={`${pending}`} label="Pending review" />
          <Metric icon={<CheckCircle2 className="h-4 w-4 text-success" />} value={`${confirmed.length}`} label="Confirmed" />
          <Metric icon={<XCircle className="h-4 w-4 text-destructive" />} value={`${failed}`} label="Failed" />
          <Metric icon={<ShieldCheck className="h-4 w-4 text-primary" />} value={formatMoney(settled)} label="Settled" />
        </div>

        {/* Treasury: funding + balances + ledger */}
        <div className="grid gap-5 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="inline-flex items-center gap-1.5 text-base">
                <Landmark className="h-4 w-4 text-primary" /> Treasury balance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {CURRENCIES.map((c) => (
                  <div key={c} className="rounded-xl border border-border/70 bg-secondary/40 p-2.5 text-center">
                    <p className="tabular text-sm font-bold">{getCompanyBalance(companyId, c).toLocaleString("en-US")}</p>
                    <p className="text-[11px] text-muted-foreground">{c} cleared</p>
                  </div>
                ))}
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Funding sources (provider-hosted)</p>
                {funding.map((f) => (
                  <div key={f.id} className="flex items-center justify-between rounded-lg border border-border/60 p-2 text-xs">
                    <span>{f.label}</span>
                    <span className="font-mono text-muted-foreground">{f.mask}</span>
                  </div>
                ))}
                <p className="mt-1 text-[11px] text-muted-foreground">Tokenized — we never capture raw bank/card details.</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Balance ledger</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1.5">
                {ledger.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-xs">
                    <span className="min-w-0 truncate text-muted-foreground">{l.memo}</span>
                    <span className={`tabular shrink-0 font-semibold ${l.amount < 0 ? "text-destructive" : "text-success"}`}>
                      {l.amount < 0 ? "" : "+"}
                      {l.amount.toLocaleString("en-US")} {l.currency}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Approval queue + reconciliation */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight">Approval queue &amp; ledger</h2>
          {payouts.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No payouts yet. When a company admin creates a bonus, it lands here for review.
              </CardContent>
            </Card>
          ) : (
            <PayoutConsole payouts={payouts} />
          )}
        </section>

        {/* Reconciliation */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Reconciliation — provider webhooks</CardTitle>
          </CardHeader>
          <CardContent>
            {webhooks.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No live webhooks yet. Sandbox settlements use internal signed events; live settlements
                are confirmed here from verified provider webhooks.
              </p>
            ) : (
              <div className="space-y-1.5">
                {webhooks.map((w) => (
                  <div key={w.id} className="flex items-center justify-between text-xs">
                    <span className="truncate">{w.provider} · {w.eventType}</span>
                    <span className="flex items-center gap-2">
                      <Badge variant={w.signatureValid ? "success" : "destructive"}>{w.signatureValid ? "verified" : "rejected"}</Badge>
                      <span className="text-muted-foreground">{timeAgo(w.createdAt)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="rounded-xl border border-border/60 bg-card/60 p-3 text-xs text-muted-foreground">
          <strong>Separation of duties:</strong> company admins authorize bonuses; finance approves &amp;
          settles. Payouts ≥ {formatMoney(50000)} require two distinct approvers. Every transition is in
          the immutable audit log.
        </p>
      </main>
    </>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border/70 bg-card p-3 text-center shadow-soft">
      {icon}
      <span className="tabular mt-1 text-base font-bold">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
