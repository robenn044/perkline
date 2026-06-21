import { SiteHeader } from "@/components/site-header";
import { ConciergePanel } from "@/components/concierge-panel";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";
import { buildCatalogLite } from "@/lib/catalog-lite";
import { requireRole } from "@/lib/auth";
import { isClaudeEnabled } from "@/lib/ai-client";
import { getDefaultMarket, getEmployee, getOffers, getProviders, getQuestionnaire } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ConciergePage() {
  const session = await requireRole("employee");
  const employee = getEmployee(session.employeeId!) ?? getEmployee("emp_elira")!;
  const catalog = buildCatalogLite(getOffers(), getProviders());
  const market = getDefaultMarket();
  const claude = isClaudeEnabled();
  const hasQuestionnaire = Boolean(getQuestionnaire(employee.id)?.completedAt);

  return (
    <>
      <SiteHeader
        role="employee"
        marketLabel={`${market.city} · ${market.defaultCurrency}`}
        user={{ name: employee.name, avatarSeed: employee.avatarSeed }}
      />
      <main id="main-content" className="container max-w-3xl space-y-5 py-6">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Perkline Match</h1>
            <Badge variant={claude ? "primary" : "accent"}>
              <Sparkles className="h-3.5 w-3.5" />
              {claude ? "Claude live" : "Smart engine"}
            </Badge>
            {hasQuestionnaire ? (
              <Badge variant="success">Personalized to your profile</Badge>
            ) : (
              <Badge variant="outline">Complete your profile for sharper picks</Badge>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask in plain language. Perkline Match reads your intent, budget and timing — and your onboarding
            profile — then bundles a multi-provider package from the Tirana catalog, always within
            your company's policy.
            {claude
              ? " Claude is composing; results are validated server-side against the catalog."
              : " Running the built-in smart engine — every result is grounded in real seeded offers."}
          </p>
        </div>

        <ConciergePanel
          employeeId={employee.id}
          budgetRemaining={employee.budgetRemaining}
          catalog={catalog}
        />
      </main>
    </>
  );
}
