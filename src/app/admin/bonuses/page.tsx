import Link from "next/link";
import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BonusComposer, type Recipient } from "@/components/bonus-composer";
import { PayoutStatusBadge } from "@/components/payout-status-badge";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { rewardsPayoutsEnabled } from "@/lib/feature-flags";
import { formatMoney } from "@/lib/money";
import {
  getBonusPayouts,
  getDefaultMarket,
  getDefaultPayoutMethod,
  getEmployee,
  getEmployees,
} from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminBonusesPage() {
  // Optional rewards module — hidden from the default welfare demo.
  if (!rewardsPayoutsEnabled()) redirect("/admin");
  const session = await requireRole("company_admin");
  const employees = getEmployees().filter((e) => e.companyId === session.companyId);
  const payouts = getBonusPayouts(session.companyId);
  const market = getDefaultMarket();

  const recipients: Recipient[] = employees.map((e) => {
    const m = getDefaultPayoutMethod(e.id);
    return {
      employeeId: e.id,
      name: e.name,
      avatarSeed: e.avatarSeed,
      department: e.department,
      hasVerified: !!m,
      methodType: m?.type,
      methodMask: m?.mask,
    };
  });

  return (
    <>
      <SiteHeader role="admin" marketLabel={`${market.city} · ${market.defaultCurrency}`} user={{ name: session.name, avatarSeed: session.avatarSeed }} />
      <main id="main-content" className="container max-w-4xl space-y-6 py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Gift className="h-6 w-6 text-primary" /> Bonuses &amp; Payouts
            </h1>
            <p className="text-sm text-muted-foreground">
              Create employer-funded rewards. Finance reviews & settles them to employees' verified destinations.
            </p>
          </div>
          <BonusComposer recipients={recipients} />
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight">Created payouts</h2>
          {payouts.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                No bonuses yet. Use a <strong>Team Challenge Reward</strong> or <strong>Recognition Bonus</strong> template to start.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {payouts.map((p) => {
                const emp = getEmployee(p.employeeId);
                return (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 text-sm shadow-soft">
                    <Avatar name={emp?.name ?? "?"} seed={emp?.avatarSeed} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {emp?.name} <span className="text-muted-foreground">· {p.reason}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {p.destinationType} · {p.destinationMask} · {timeAgo(p.createdAt)}
                      </p>
                    </div>
                    <span className="tabular font-bold">{formatMoney(p.amount, p.currency)}</span>
                    <PayoutStatusBadge status={p.status} />
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Approvals happen in the Finance console (separation of duties). Sign in as <span className="font-mono">finance@perkline.demo</span> to settle.
          </p>
        </section>
      </main>
    </>
  );
}
