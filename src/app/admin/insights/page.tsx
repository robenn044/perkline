import { Flame, Star, TrendingUp, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { InsightCard } from "@/components/insight-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProviderLogo } from "@/components/provider-logo";
import { requireRole } from "@/lib/auth";
import { buildInsight } from "@/lib/insights";
import { formatMoney } from "@/lib/money";
import {
  getCompany,
  getDefaultMarket,
  getEmployees,
  getOffer,
  getProvider,
  getRequestsByCompany,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminInsights() {
  const session = await requireRole("company_admin");
  const company = getCompany(session.companyId)!;
  const employees = getEmployees().filter((e) => e.companyId === session.companyId);
  const requests = getRequestsByCompany(session.companyId);
  const market = getDefaultMarket();
  const insight = buildInsight(company.name, employees, requests);

  // Most-requested offers across non-rejected requests.
  const offerCounts = new Map<string, number>();
  for (const r of requests) {
    if (r.status === "rejected") continue;
    for (const item of r.package.items) offerCounts.set(item.offerId, (offerCounts.get(item.offerId) ?? 0) + 1);
  }
  const popular = Array.from(offerCounts.entries())
    .map(([offerId, count]) => ({ offer: getOffer(offerId), count }))
    .filter((x) => x.offer)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Engagement.
  const avgStreak = employees.length
    ? Math.round((employees.reduce((s, e) => s + e.streakWeeks, 0) / employees.length) * 10) / 10
    : 0;
  const totalPoints = employees.reduce((s, e) => s + e.points, 0);
  const activeEmployees = new Set(requests.map((r) => r.employeeId)).size;

  return (
    <>
      <SiteHeader
        role="admin"
        marketLabel={`${market.city} · ${market.defaultCurrency}`}
        user={{ name: session.name, avatarSeed: session.avatarSeed }}
      />
      <main id="main-content" className="container max-w-5xl space-y-6 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Insights</h1>
          <p className="text-sm text-muted-foreground">What your people value, what goes unused, and what to add next.</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <InsightCard insight={insight} />

          <div className="space-y-5">
            {/* Engagement */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4 text-primary" /> Engagement
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-2">
                <Metric icon={<Users className="h-4 w-4 text-primary" />} value={`${activeEmployees}/${employees.length}`} label="active" />
                <Metric icon={<Flame className="h-4 w-4 text-orange-500" />} value={`${avgStreak}`} label="avg streak" />
                <Metric icon={<Star className="h-4 w-4 text-amber-500" />} value={`${totalPoints}`} label="points" />
              </CardContent>
            </Card>

            {/* Popular perks */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base inline-flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-success" /> Most-requested perks
                </CardTitle>
              </CardHeader>
              <CardContent>
                {popular.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No requests yet — approvals will populate this.</p>
                ) : (
                  <div className="space-y-2">
                    {popular.map(({ offer, count }) => {
                      const provider = getProvider(offer!.providerId);
                      return (
                        <div key={offer!.id} className="flex items-center gap-3">
                          <ProviderLogo name={provider?.displayName ?? ""} seed={provider?.logoSeed} size={32} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{offer!.title}</p>
                            <p className="truncate text-xs text-muted-foreground">{provider?.displayName}</p>
                          </div>
                          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold">×{count}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
}

function Metric({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-border/70 bg-secondary/40 p-2.5 text-center">
      {icon}
      <span className="tabular mt-0.5 text-sm font-bold">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </div>
  );
}
