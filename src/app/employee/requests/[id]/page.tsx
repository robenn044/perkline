import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Clock, Wallet } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { RequestTimeline } from "@/components/request-timeline";
import { VoucherCard } from "@/components/voucher-card";
import { StatusBadge } from "@/components/status-badge";
import { PolicyBadge } from "@/components/policy-badge";
import { CategoryChip } from "@/components/category-chip";
import { PackageBreakdown } from "@/components/package-breakdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildCatalogLite } from "@/lib/catalog-lite";
import { formatMoney } from "@/lib/money";
import { requireRole } from "@/lib/auth";
import {
  getDefaultMarket,
  getEmployee,
  getOffers,
  getProvider,
  getProviders,
  getRequest,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function RequestDetailPage({ params }: { params: { id: string } }) {
  const session = await requireRole("employee");
  const request = getRequest(params.id);
  // Authorization: an employee can only view their own request.
  if (!request || request.employeeId !== session.employeeId) notFound();

  const employee = getEmployee(session.employeeId!) ?? getEmployee("emp_elira")!;
  const catalog = buildCatalogLite(getOffers(), getProviders());
  const market = getDefaultMarket();
  const ready = request.status === "voucher_ready";

  return (
    <>
      <SiteHeader
        role="employee"
        marketLabel={`${market.city} · ${market.defaultCurrency}`}
        user={{ name: employee.name, avatarSeed: employee.avatarSeed }}
      />
      <main id="main-content" className="container max-w-4xl space-y-5 py-6">
        <Link href="/employee/requests" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> My benefits
        </Link>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{request.package.title}</h1>
              <StatusBadge status={request.status} />
            </div>
            <p className="text-sm text-muted-foreground">{request.package.tagline}</p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {request.package.categoryTags.map((c) => (
              <CategoryChip key={c} category={c} />
            ))}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-5">
          {/* Timeline + summary */}
          <div className="space-y-5 md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status timeline</CardTitle>
              </CardHeader>
              <CardContent>
                <RequestTimeline request={request} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Total</span>
                  <span className="tabular font-bold">{formatMoney(request.package.total, request.package.currency)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Wallet className="h-3.5 w-3.5" /> Budget after
                  </span>
                  <span className="tabular font-medium">{formatMoney(request.budgetRemainingAfter)}</span>
                </div>
                <PolicyBadge status={request.policyStatus} />
                <div className="rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
                    <Building2 className="h-3.5 w-3.5" /> HR summary
                  </span>
                  <p className="mt-1">{request.employerSummary}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vouchers / pending state */}
          <div className="space-y-5 md:col-span-3">
            {request.status === "pending" && (
              <Card>
                <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                    <Clock className="h-6 w-6" />
                  </span>
                  <div>
                    <p className="font-semibold">Awaiting HR approval</p>
                    <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                      AlbaTech HR will review this against budget and policy. Once approved, payment
                      routes directly to the providers and your vouchers appear here.
                    </p>
                  </div>
                  <Badge variant="outline">Funds route directly to providers — never through you</Badge>
                </CardContent>
              </Card>
            )}

            {request.status === "rejected" && (
              <Card>
                <CardContent className="py-10 text-center">
                  <p className="font-semibold text-destructive">This request was not approved</p>
                  <p className="mt-1 text-sm text-muted-foreground">{request.decisionReason}</p>
                </CardContent>
              </Card>
            )}

            {ready && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Payment routed to providers</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {request.paymentSplits.map((s) => {
                      const provider = getProvider(s.providerId);
                      return (
                        <div key={s.id} className="flex items-center justify-between rounded-xl border border-border/70 bg-card p-3 text-sm">
                          <span className="font-medium">{provider?.displayName ?? s.providerName}</span>
                          <span className="flex items-center gap-2">
                            <Badge variant="success">Paid</Badge>
                            <span className="tabular font-bold">{formatMoney(s.amount, s.currency)}</span>
                          </span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>

                <div>
                  <p className="mb-2 text-sm font-semibold">Your vouchers</p>
                  <div className="space-y-3">
                    {request.vouchers.map((v) => (
                      <VoucherCard key={v.id} voucher={v} providerSeed={getProvider(v.providerId)?.logoSeed} />
                    ))}
                  </div>
                </div>
              </>
            )}

            {(request.status === "pending" || request.status === "rejected") && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">What's included</CardTitle>
                </CardHeader>
                <CardContent>
                  <PackageBreakdown pkg={request.package} catalog={catalog} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
