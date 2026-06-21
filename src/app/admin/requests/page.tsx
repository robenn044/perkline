import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ApprovalQueue, type QueueItem } from "@/components/approval-queue";
import { StatusBadge } from "@/components/status-badge";
import { BulkTriage } from "@/components/bulk-triage";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { buildCatalogLite } from "@/lib/catalog-lite";
import { formatMoney } from "@/lib/money";
import {
  getDefaultMarket,
  getEmployee,
  getOffers,
  getPendingRequests,
  getProviders,
  getRequestsByCompany,
} from "@/lib/store";
import { timeAgo } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminRequestsPage() {
  const session = await requireRole("company_admin");
  const market = getDefaultMarket();
  const providers = getProviders();
  const pending = getPendingRequests(session.companyId);
  const requests = getRequestsByCompany(session.companyId);
  const catalog = buildCatalogLite(getOffers(), providers);
  const providerSeeds = Object.fromEntries(providers.map((provider) => [provider.id, provider.logoSeed]));
  const queueItems: QueueItem[] = pending.map((request) => {
    const employee = getEmployee(request.employeeId);
    return {
      request,
      employeeName: employee?.name ?? "Employee",
      employeeSeed: employee?.avatarSeed ?? request.employeeId,
    };
  });

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
            <Inbox className="h-6 w-6 text-primary" aria-hidden /> Requests
          </h1>
          <p className="text-sm text-muted-foreground">
            Policy checks, provider splits and manager decisions in one queue.
          </p>
        </div>

        <ApprovalQueue items={queueItems} catalog={catalog} providerSeeds={providerSeeds} />
        <BulkTriage
          items={queueItems.map((item) => ({
            id: item.request.id,
            employeeName: item.employeeName,
            title: item.request.package.title,
          }))}
        />

        <section className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight">Request history</h2>
          {requests.length === 0 ? (
            <Card>
              <CardContent className="py-9 text-center text-sm text-muted-foreground">
                No requests yet. Employee submissions appear here immediately.
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <caption className="sr-only">All benefit requests for your company</caption>
                  <thead>
                    <tr className="border-b border-border bg-secondary/40 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <th scope="col" className="px-4 py-2.5 font-medium">Employee</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Benefit</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">Amount</th>
                      <th scope="col" className="hidden px-4 py-2.5 font-medium sm:table-cell">Submitted</th>
                      <th scope="col" className="px-4 py-2.5 font-medium">Status</th>
                      <th scope="col" className="px-4 py-2.5 text-right font-medium">
                        <span className="sr-only">Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {requests.map((request) => {
                      const employee = getEmployee(request.employeeId);
                      return (
                        <tr
                          key={request.id}
                          className="border-b border-border/60 transition-colors last:border-0 hover:bg-secondary/40"
                        >
                          <td className="px-4 py-2.5">
                            <Link
                              href={`/admin/requests/${request.id}`}
                              className="flex items-center gap-2.5 font-medium hover:text-primary"
                            >
                              <Avatar name={employee?.name ?? "Employee"} seed={employee?.avatarSeed} size={28} />
                              <span className="truncate">{employee?.name ?? "Employee"}</span>
                            </Link>
                          </td>
                          <td className="max-w-[220px] truncate px-4 py-2.5 text-muted-foreground">
                            {request.package.title}
                            <span className="text-muted-foreground/70"> · {request.package.items.length} offers</span>
                          </td>
                          <td className="tabular whitespace-nowrap px-4 py-2.5 text-right font-medium">
                            {formatMoney(request.package.total, request.package.currency)}
                          </td>
                          <td className="hidden whitespace-nowrap px-4 py-2.5 text-muted-foreground sm:table-cell">
                            {timeAgo(request.submittedAt)}
                          </td>
                          <td className="px-4 py-2.5">
                            <StatusBadge status={request.status} />
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <Link
                              href={`/admin/requests/${request.id}`}
                              className="inline-flex items-center text-muted-foreground hover:text-primary"
                              aria-label={`Open request from ${employee?.name ?? "employee"}`}
                            >
                              <ArrowRight className="h-4 w-4" aria-hidden />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </section>
      </main>
    </>
  );
}
