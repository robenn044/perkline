import Link from "next/link";
import { ArrowRight, Inbox, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { CategoryChip } from "@/components/category-chip";
import { formatMoney } from "@/lib/money";
import { requireRole } from "@/lib/auth";
import { getDefaultMarket, getEmployee, getRequestsByEmployee } from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MyRequestsPage() {
  const session = await requireRole("employee");
  const employee = getEmployee(session.employeeId!) ?? getEmployee("emp_elira")!;
  const requests = getRequestsByEmployee(employee.id);
  const market = getDefaultMarket();

  return (
    <>
      <SiteHeader
        role="employee"
        marketLabel={`${market.city} · ${market.defaultCurrency}`}
        user={{ name: employee.name, avatarSeed: employee.avatarSeed }}
      />
      <main id="main-content" className="container max-w-3xl space-y-5 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Benefits</h1>
            <p className="text-sm text-muted-foreground">Track approvals, payments and vouchers.</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/employee/concierge">
              <Sparkles className="h-4 w-4" /> New request
            </Link>
          </Button>
        </div>

        {requests.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
              <Inbox className="h-6 w-6" />
            </span>
            <div>
              <p className="font-semibold">No requests yet</p>
              <p className="text-sm text-muted-foreground">Ask Perkline Match to build your first collection.</p>
            </div>
            <Button asChild>
              <Link href="/employee/concierge">
                <Sparkles className="h-4 w-4" /> Open Perkline Match
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <Link
                key={r.id}
                href={`/employee/requests/${r.id}`}
                className="group flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-glow"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{r.package.title}</p>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {r.package.categoryTags.map((c) => (
                      <CategoryChip key={c} category={c} withIcon={false} />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {formatMoney(r.package.total, r.package.currency)} · {r.package.items.length} experiences · {timeAgo(r.submittedAt)}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
