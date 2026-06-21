import Link from "next/link";
import { ArrowRight, Building2, CheckCircle2, Clock, Lightbulb, Wallet } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ApprovalQueue, type QueueItem } from "@/components/approval-queue";
import { StatusBadge } from "@/components/status-badge";
import { BudgetRing } from "@/components/budget-ring";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { buildCatalogLite } from "@/lib/catalog-lite";
import { buildInsight } from "@/lib/insights";
import { formatMoney } from "@/lib/money";
import {
  getCompany,
  getDefaultMarket,
  getEmployee,
  getEmployees,
  getOffers,
  getPendingRequests,
  getPolicy,
  getProviders,
  getRequestsByCompany,
  getRequestsByStatus,
} from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import type { RequestStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const FILTERS: { key: RequestStatus | "all"; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "voucher_ready", label: "Approved & paid" },
  { key: "rejected", label: "Rejected" },
  { key: "all", label: "All" },
];

export default async function AdminDashboard({ searchParams }: { searchParams: { status?: string } }) {
  const session = await requireRole("company_admin");
  const company = getCompany(session.companyId)!;
  const policy = getPolicy(session.companyId)!;
  const employees = getEmployees().filter((e) => e.companyId === session.companyId);
  const allRequests = getRequestsByCompany(session.companyId);
  const pending = getPendingRequests(session.companyId);
  const market = getDefaultMarket();
  const insight = buildInsight(company.name, employees, allRequests);

  const catalog = buildCatalogLite(getOffers(), getProviders());
  const providerSeeds = Object.fromEntries(getProviders().map((p) => [p.id, p.logoSeed]));

  const queueItems: QueueItem[] = pending.map((r) => {
    const emp = getEmployee(r.employeeId);
    return { request: r, employeeName: emp?.name ?? "Employee", employeeSeed: emp?.avatarSeed ?? r.employeeId };
  });

  const activeFilter = (FILTERS.find((f) => f.key === searchParams.status)?.key ?? "all") as RequestStatus | "all";
  const filtered = getRequestsByStatus(session.companyId, activeFilter);

  const totalBudget = employees.reduce((s, e) => s + e.monthlyBudget, 0);
  const remaining = employees.reduce((s, e) => s + e.budgetRemaining, 0);

  return (
    <>
      <SiteHeader
        role="admin"
        marketLabel={`${market.city} · ${market.defaultCurrency}`}
        user={{ name: session.name, avatarSeed: session.avatarSeed }}
      />
      <main id="main-content" className="container space-y-6 py-6">
        {/* Company header */}
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 flex items-center gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
              <Building2 className="h-7 w-7" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold leading-tight">{company.name}</h1>
              <p className="text-sm text-muted-foreground">
                {session.name} · {employees.length} employees · {market.city}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Badge variant="outline">
                  <Wallet className="h-3.5 w-3.5" /> {formatMoney(policy.monthlyLimit)} / employee
                </Badge>
                <Badge variant="outline">Auto-clear under {formatMoney(policy.approvalThreshold)}</Badge>
                {pending.length > 0 ? (
                  <Badge variant="warning">
                    <Clock className="h-3.5 w-3.5" /> {pending.length} awaiting you
                  </Badge>
                ) : (
                  <Badge variant="success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Queue clear
                  </Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-center gap-4 rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
            <BudgetRing remaining={remaining} total={totalBudget} size={104} stroke={10} />
            <div>
              <p className="text-xs text-muted-foreground">Team budget left</p>
              <p className="tabular text-lg font-bold">{formatMoney(remaining)}</p>
              <p className="text-xs text-muted-foreground">of {formatMoney(totalBudget)}</p>
            </div>
          </div>
        </section>

        {/* Insight teaser */}
        <Link
          href="/admin/insights"
          className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm transition-colors hover:bg-primary/10"
        >
          <span className="flex items-start gap-2">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <span className="font-semibold">AI insight: </span>
              {insight.summary}
            </span>
          </span>
          <span className="hidden shrink-0 items-center gap-1 font-semibold text-primary sm:inline-flex">
            View analytics <ArrowRight className="h-4 w-4" />
          </span>
        </Link>

        {/* Approval queue */}
        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight">
            Approval queue {pending.length > 0 && <span className="text-muted-foreground">· {pending.length}</span>}
          </h2>
          <ApprovalQueue items={queueItems} catalog={catalog} providerSeeds={providerSeeds} />
        </section>

        {/* All requests, filterable */}
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold tracking-tight">All requests</h2>
            <div className="flex flex-wrap gap-1.5">
              {FILTERS.map((f) => (
                <Link
                  key={f.key}
                  href={`/admin?status=${f.key}`}
                  className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                    activeFilter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                  }`}
                >
                  {f.label}
                </Link>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                No requests in this view yet.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => {
                const emp = getEmployee(r.employeeId);
                return (
                  <Link
                    key={r.id}
                    href={`/admin/requests/${r.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3 text-sm shadow-soft transition-colors hover:bg-secondary/40"
                  >
                    <Avatar name={emp?.name ?? "?"} seed={emp?.avatarSeed} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {emp?.name} <span className="text-muted-foreground">· {r.package.title}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatMoney(r.package.total, r.package.currency)} · {timeAgo(r.submittedAt)}
                        {r.origin === "concierge" ? " · via AI" : ""}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
