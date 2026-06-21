import Link from "next/link";
import { ArrowRight, Flame, Sparkles, Star, TrendingUp } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { BudgetRing } from "@/components/budget-ring";
import { OfferCard } from "@/components/offer-card";
import { PackageCard } from "@/components/package-card";
import { CategoryChip } from "@/components/category-chip";
import { NotificationsStrip } from "@/components/notifications-strip";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { categoryLabel } from "@/lib/catalog";
import { formatMoney, pct } from "@/lib/money";
import { requireRole } from "@/lib/auth";
import {
  getActivity,
  getCuratedPackages,
  getDefaultMarket,
  getEmployee,
  getNotifications,
  getOffers,
  getProviders,
  getQuestionnaire,
} from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import type { Category } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EmployeeFeed() {
  const session = await requireRole("employee");
  const employee = getEmployee(session.employeeId!) ?? getEmployee("emp_elira")!;
  const questionnaire = getQuestionnaire(employee.id);
  const offers = getOffers();
  const providers = getProviders();
  const providersById = new Map(providers.map((p) => [p.id, p]));
  const market = getDefaultMarket();

  // Personalize curated packages by preference overlap.
  const packages = [...getCuratedPackages()].sort((a, b) => {
    const score = (cats: Category[]) => cats.filter((c) => employee.preferences.includes(c)).length;
    return score(b.categoryTags) - score(a.categoryTags);
  });

  const fresh = offers.filter((o) => o.isFresh);
  const fridayDrops = offers.filter((o) => o.isFridayDrop);
  const usedPct = 100 - pct(employee.budgetRemaining, employee.monthlyBudget);
  const firstName = employee.name.split(" ")[0];
  const activity = getActivity(6);
  const notifications = getNotifications(session.sub, 3);

  return (
    <>
      <SiteHeader
        role="employee"
        marketLabel={`${market.city} · ${market.defaultCurrency}`}
        user={{ name: employee.name, avatarSeed: employee.avatarSeed }}
      />
      <main id="main-content" className="container space-y-8 py-6">
        <NotificationsStrip notifications={notifications} />
        {!questionnaire?.completedAt && (
          <Link
            href="/employee/onboarding"
            className="flex items-center justify-between gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-sm"
          >
            <span>
              <span className="font-semibold">Personalize Perkline Match</span> — take the 60-second
              questionnaire so Perkline tailors every recommendation to you.
            </span>
            <span className="shrink-0 font-semibold text-primary">Start →</span>
          </Link>
        )}

        {/* Greeting + budget */}
        <section className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2 flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <Avatar name={employee.name} seed={employee.avatarSeed} size={48} />
              <div>
                <p className="text-sm text-muted-foreground">Welcome back,</p>
                <h1 className="text-xl font-bold leading-tight">{firstName}</h1>
              </div>
              <Badge variant="primary" className="ml-auto hidden sm:inline-flex">
                {employee.role}
              </Badge>
            </div>
            <p className="text-balance mt-4 text-lg font-medium">
              You have <span className="text-primary">{formatMoney(employee.budgetRemaining)}</span> of
              benefit budget left this month.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Stat icon={<Flame className="h-4 w-4 text-orange-500" />} value={`${employee.streakWeeks}-week`} label="wellness streak" />
              <Stat icon={<Star className="h-4 w-4 text-amber-500" />} value={`${employee.points}`} label="Perkline points" />
              <Stat icon={<TrendingUp className="h-4 w-4 text-success" />} value={`${usedPct}%`} label="budget used" />
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
            <BudgetRing remaining={employee.budgetRemaining} total={employee.monthlyBudget} currency={market.defaultCurrency} />
            <p className="text-center text-xs text-muted-foreground">
              {formatMoney(employee.monthlyBudget - employee.budgetRemaining)} used of {formatMoney(employee.monthlyBudget)}
            </p>
          </div>
        </section>

        {/* Perkline Match — a quiet assistive entry, not the centerpiece */}
        <section>
          <Link
            href="/employee/concierge"
            className="group flex flex-col items-start gap-4 rounded-xl border border-border bg-card p-5 shadow-soft transition-colors hover:border-primary/40 sm:flex-row sm:items-center"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" aria-hidden />
            </span>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-semibold">Find it with Perkline Match</h2>
                <Badge variant="outline">Assistant</Badge>
              </div>
              <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                Describe what you need — “something relaxing under 12,000 ALL this weekend” — and Perkline
                Match suggests catalog options within your allowance and your company&apos;s policy.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-primary">
              Open Perkline Match
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </span>
          </Link>
        </section>

        {/* Recommended routes */}
        <Section title="Recommended collections" subtitle={`Curated for your love of ${employee.preferences.map((p) => categoryLabel(p).toLowerCase()).join(", ")}`}>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {packages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} href={`/employee/package/${pkg.id}`} />
            ))}
          </div>
        </Section>

        {/* Fresh in Tirana */}
        <Section title="Fresh in Tirana" subtitle="New offers worth checking">
          <Rail>
            {fresh.map((o) => (
              <OfferCard key={o.id} offer={o} provider={providersById.get(o.providerId)} />
            ))}
          </Rail>
        </Section>

        {/* Friday Drops */}
        <Section title="Friday Drops" subtitle="Limited-time picks, refreshed weekly">
          <Rail>
            {fridayDrops.map((o) => (
              <OfferCard key={o.id} offer={o} provider={providersById.get(o.providerId)} />
            ))}
          </Rail>
        </Section>

        {/* Categories */}
        <Section title="Browse by category">
          <div className="flex flex-wrap gap-2">
            {market.categories.map((c) => (
              <CategoryChip key={c} category={c} className="px-3.5 py-2 text-sm" />
            ))}
          </div>
        </Section>

        {/* Activity ribbon */}
        <Section title="Happening now" subtitle="Why this marketplace feels alive">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activity.map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-xl border border-border/70 bg-card p-3 text-sm">
                <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
                <div className="min-w-0">
                  <p className="leading-snug">{a.message}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{timeAgo(a.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </Section>
      </main>
    </>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-secondary/50 px-3 py-2">
      {icon}
      <span className="text-sm font-bold">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-end justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Rail({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2 no-scrollbar">{children}</div>
  );
}
