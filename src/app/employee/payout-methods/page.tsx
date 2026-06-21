import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Wallet } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { PayoutMethodsManager } from "@/components/payout-methods-manager";
import { PayoutStatusBadge } from "@/components/payout-status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { rewardsPayoutsEnabled } from "@/lib/feature-flags";
import { getAllRailStatuses } from "@/lib/finance-config";
import { formatMoney } from "@/lib/money";
import { getDefaultMarket, getEmployee, getPayoutMethods, getPayoutsForEmployee } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PayoutMethodsPage() {
  // Optional rewards module — hidden from the default welfare demo.
  if (!rewardsPayoutsEnabled()) redirect("/employee");
  const session = await requireRole("employee");
  const employee = getEmployee(session.employeeId!) ?? getEmployee("emp_elira")!;
  const methods = getPayoutMethods(employee.id);
  const payouts = getPayoutsForEmployee(employee.id);
  const railStatuses = getAllRailStatuses();
  const market = getDefaultMarket();

  return (
    <>
      <SiteHeader role="employee" marketLabel={`${market.city} · ${market.defaultCurrency}`} user={{ name: employee.name, avatarSeed: employee.avatarSeed }} />
      <main id="main-content" className="container max-w-3xl space-y-6 py-6">
        <Link href="/employee/settings" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Settings
        </Link>
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Wallet className="h-6 w-6 text-primary" /> Payout methods
          </h1>
          <p className="text-sm text-muted-foreground">
            Where employer <strong>Perkline Bonuses</strong> are paid. Separate from how vouchers are delivered.
          </p>
        </div>

        <PayoutMethodsManager initial={methods} railStatuses={railStatuses} />

        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight">Payout history</h2>
          {payouts.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No bonuses yet. When your company sends one, it appears here.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {payouts.map((p) => (
                <Link
                  key={p.id}
                  href="/employee/bonuses"
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3 text-sm shadow-soft transition-colors hover:bg-secondary/40"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{p.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.destinationType} · {p.destinationMask} · {timeAgo(p.updatedAt)}
                    </p>
                  </div>
                  <span className="flex items-center gap-2">
                    <span className="tabular font-bold">{formatMoney(p.amount, p.currency)}</span>
                    <PayoutStatusBadge status={p.status} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
