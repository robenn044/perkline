import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { QuestionnaireForm } from "@/components/questionnaire-form";
import { Badge } from "@/components/ui/badge";
import { requireRole } from "@/lib/auth";
import { getDefaultMarket, getEmployee, getQuestionnaire } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await requireRole("employee");
  const employee = getEmployee(session.employeeId!) ?? getEmployee("emp_elira")!;
  const existing = getQuestionnaire(employee.id) ?? null;
  const market = getDefaultMarket();

  return (
    <>
      <SiteHeader
        role="employee"
        marketLabel={`${market.city} · ${market.defaultCurrency}`}
        user={{ name: employee.name, avatarSeed: employee.avatarSeed }}
      />
      <main id="main-content" className="container max-w-2xl space-y-5 py-6">
        <Link href="/employee" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Feed
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Personalize Perkline Match</h1>
            <Badge variant="primary">
              <Sparkles className="h-3.5 w-3.5" /> 60 seconds
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            Five quick answers help Perkline Match rank real offers that fit you — your
            goals, stress, timing and priorities. You can change them anytime.
          </p>
        </div>
        <QuestionnaireForm initial={existing} />
      </main>
    </>
  );
}
