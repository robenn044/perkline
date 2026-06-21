import Link from "next/link";
import { Sparkles, User as UserIcon, WalletCards } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { ProfileForm } from "@/components/profile-form";
import { PerxWalletCard } from "@/components/perx-wallet-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryChip } from "@/components/category-chip";
import { requireRole } from "@/lib/auth";
import {
  getDefaultMarket,
  getEmployee,
  getEmployeePerxWallet,
  getQuestionnaire,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await requireRole("employee");
  const employee = getEmployee(session.employeeId!) ?? getEmployee("emp_elira")!;
  const questionnaire = getQuestionnaire(employee.id);
  const wallet = getEmployeePerxWallet(employee.id);
  const market = getDefaultMarket();

  return (
    <>
      <SiteHeader
        role="employee"
        marketLabel={`${market.city} · ${market.defaultCurrency}`}
        user={{ name: employee.name, avatarSeed: employee.avatarSeed }}
      />
      <main id="main-content" className="container max-w-3xl space-y-8 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="text-sm text-muted-foreground">
            Personalization, language and your internal Perkline Credit.
          </p>
        </div>

        <section className="space-y-3">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
            <UserIcon className="h-5 w-5 text-primary" aria-hidden /> About you
          </h2>
          <ProfileForm employee={employee} />
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden /> Perkline Match preferences
            </h2>
            <Button asChild variant="outline" size="sm">
              <Link href="/employee/onboarding">
                {questionnaire?.completedAt ? "Edit answers" : "Take questionnaire"}
              </Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
            {questionnaire?.completedAt ? (
              <div className="space-y-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="success">Completed</Badge>
                  <Badge variant="outline">Priority: {questionnaire.priority}</Badge>
                  <Badge variant="outline">{questionnaire.groupPreference}</Badge>
                  <Badge variant="outline">{questionnaire.timePreference}</Badge>
                </div>
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">
                    Preferred categories
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {questionnaire.preferredCategories.map((category) => (
                      <CategoryChip key={category} category={category} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Goals: {questionnaire.goals.join(", ")}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Answer five quick questions so Perkline Match can explain every recommendation.
              </p>
            )}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="inline-flex items-center gap-2 text-lg font-bold tracking-tight">
            <WalletCards className="h-5 w-5 text-primary" aria-hidden /> My Perkline Credit
          </h2>
          <PerxWalletCard employee={employee} destination={wallet} />
        </section>
      </main>
    </>
  );
}
