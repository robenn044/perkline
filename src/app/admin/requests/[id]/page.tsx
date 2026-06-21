import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Wallet } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { RequestTimeline } from "@/components/request-timeline";
import { StatusBadge } from "@/components/status-badge";
import { PolicyBadge } from "@/components/policy-badge";
import { CategoryChip } from "@/components/category-chip";
import { PackageBreakdown } from "@/components/package-breakdown";
import { AdminDecisionPanel } from "@/components/admin-decision-panel";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { buildCatalogLite } from "@/lib/catalog-lite";
import { formatMoney } from "@/lib/money";
import {
  getDefaultMarket,
  getEmployee,
  getOffers,
  getProviders,
  getRequest,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminRequestDetail({ params }: { params: { id: string } }) {
  const session = await requireRole("company_admin");
  const request = getRequest(params.id);
  // Authorization: only requests inside the admin's company.
  if (!request || request.companyId !== session.companyId) notFound();

  const employee = getEmployee(request.employeeId);
  const catalog = buildCatalogLite(getOffers(), getProviders());
  const providerSeeds = Object.fromEntries(getProviders().map((p) => [p.id, p.logoSeed]));
  const market = getDefaultMarket();

  return (
    <>
      <SiteHeader
        role="admin"
        marketLabel={`${market.city} · ${market.defaultCurrency}`}
        user={{ name: session.name, avatarSeed: session.avatarSeed }}
      />
      <main id="main-content" className="container max-w-4xl space-y-5 py-6">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Approval queue
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">{request.package.title}</h1>
            <StatusBadge status={request.status} />
          </div>
          <PolicyBadge status={request.policyStatus} />
        </div>

        <div className="grid gap-5 md:grid-cols-5">
          <div className="space-y-5 md:col-span-3">
            {/* Employee profile */}
            {employee && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Employee</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-3">
                  <Avatar name={employee.name} seed={employee.avatarSeed} size={44} />
                  <div className="flex-1">
                    <p className="font-semibold">{employee.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {employee.role} · {employee.department}
                    </p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground">
                    <p className="tabular font-semibold text-foreground">{formatMoney(employee.budgetRemaining)}</p>
                    <p>of {formatMoney(employee.monthlyBudget)} left</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI + policy reasoning */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">AI + policy summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{request.employerSummary}</p>
                <div className="flex flex-wrap items-center gap-2">
                  {request.package.categoryTags.map((c) => (
                    <CategoryChip key={c} category={c} />
                  ))}
                  <Badge variant="outline">
                    <Wallet className="h-3.5 w-3.5" /> {formatMoney(request.budgetRemainingAfter)} left after
                  </Badge>
                  {request.origin === "concierge" && <Badge variant="primary">Created via Perkline Match</Badge>}
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {request.policyNotes.map((n, i) => (
                    <li key={i}>• {n}</li>
                  ))}
                </ul>
                {request.package.reason && (
                  <p className="rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Why this package: </span>
                    {request.package.reason}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Breakdown */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Provider breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <PackageBreakdown pkg={request.package} catalog={catalog} />
                <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-3">
                  <span className="text-sm font-medium">Total</span>
                  <span className="tabular text-lg font-bold">{formatMoney(request.package.total, request.package.currency)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Decision / status side */}
          <div className="space-y-5 md:col-span-2">
            {request.status === "pending" ? (
              <AdminDecisionPanel requestId={request.id} packageTitle={request.package.title} providerSeeds={providerSeeds} />
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Decision</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <StatusBadge status={request.status} />
                  {request.decidedByName && (
                    <p className="text-xs text-muted-foreground">By {request.decidedByName}</p>
                  )}
                  {request.decisionComment && (
                    <p className="rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">“{request.decisionComment}”</p>
                  )}
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Status timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <RequestTimeline request={request} />
              </CardContent>
            </Card>

            {request.paymentSplits.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base inline-flex items-center gap-1.5">
                    <Building2 className="h-4 w-4" /> Provider payouts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {request.paymentSplits.map((s) => (
                    <div key={s.id} className="flex items-center justify-between rounded-xl border border-border/70 p-2.5 text-sm">
                      <span className="font-medium">{s.providerName}</span>
                      <span className="flex items-center gap-2">
                        <Badge variant="success">Paid</Badge>
                        <span className="tabular font-bold">{formatMoney(s.amount, s.currency)}</span>
                      </span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
