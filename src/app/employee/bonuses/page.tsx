import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift, Receipt, Wallet } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PayoutStatusBadge } from "@/components/payout-status-badge";
import { PayoutEventTimeline } from "@/components/payout-event-timeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { rewardsPayoutsEnabled } from "@/lib/feature-flags";
import { formatMoney } from "@/lib/money";
import { getDefaultMarket, getEmployee, getPayoutEvents, getPayoutsForEmployee, getVerifiedPayoutMethods } from "@/lib/store";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TEMPLATE_LABEL: Record<string, string> = {
  team_challenge: "Team Challenge Reward",
  recognition: "Recognition Bonus",
  custom: "Bonus",
};

export default async function EmployeeBonusesPage() {
  // Optional rewards module — hidden from the default welfare demo.
  if (!rewardsPayoutsEnabled()) redirect("/employee");
  const session = await requireRole("employee");
  const employee = getEmployee(session.employeeId!) ?? getEmployee("emp_elira")!;
  const payouts = getPayoutsForEmployee(employee.id);
  const hasVerified = getVerifiedPayoutMethods(employee.id).length > 0;
  const market = getDefaultMarket();

  const totalReceived = payouts.filter((p) => p.status === "confirmed").reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <SiteHeader role="employee" marketLabel={`${market.city} · ${market.defaultCurrency}`} user={{ name: employee.name, avatarSeed: employee.avatarSeed }} />
      <main id="main-content" className="container max-w-3xl space-y-6 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Gift className="h-6 w-6 text-primary" /> My Bonuses
            </h1>
            <p className="text-sm text-muted-foreground">Employer rewards paid to your verified destination.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/employee/payout-methods">
              <Wallet className="h-4 w-4" /> Payout methods
            </Link>
          </Button>
        </div>

        {!hasVerified && (
          <Link href="/employee/payout-methods" className="block rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <strong>Add &amp; verify a payout method</strong> so your company can send you bonuses. →
          </Link>
        )}

        {payouts.length > 0 && (
          <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
            <p className="text-sm text-muted-foreground">Total received</p>
            <p className="tabular text-2xl font-extrabold text-primary">{formatMoney(totalReceived, employee.currency)}</p>
          </div>
        )}

        {payouts.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No bonuses yet. When HR sends a Team Challenge Reward or Recognition Bonus, the receipt shows here.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {payouts.map((p) => (
              <Card key={p.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Receipt className="h-4 w-4 text-primary" />
                      {p.reason}
                    </CardTitle>
                    <PayoutStatusBadge status={p.status} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="primary">{TEMPLATE_LABEL[p.template]}</Badge>
                    <span className="tabular text-lg font-bold">{formatMoney(p.amount, p.currency)}</span>
                    <Badge variant="outline">{p.destinationType} · {p.destinationMask}</Badge>
                  </div>
                  {p.status === "confirmed" && (
                    <div className="grid gap-1 rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground sm:grid-cols-2">
                      <span><span className="font-medium text-foreground">Reference:</span> {p.transactionRef}</span>
                      <span><span className="font-medium text-foreground">Settled:</span> {formatDate(p.updatedAt)}</span>
                      <span><span className="font-medium text-foreground">Destination:</span> {p.destinationMask}</span>
                      {p.destinationNetwork && <span><span className="font-medium text-foreground">Network:</span> {p.destinationNetwork}</span>}
                    </div>
                  )}
                  {p.status === "failed" && p.failureReason && (
                    <p className="rounded-xl bg-destructive/5 p-3 text-xs text-destructive">{p.failureReason}</p>
                  )}
                  <details className="text-sm">
                    <summary className="cursor-pointer text-xs font-medium text-primary">View signed event trail</summary>
                    <div className="mt-3">
                      <PayoutEventTimeline events={getPayoutEvents(p.id)} />
                    </div>
                  </details>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
