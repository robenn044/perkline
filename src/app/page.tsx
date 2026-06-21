import Link from "next/link";
import { ArrowRight, Briefcase, Building2, Globe, ShieldCheck, Store, Ticket, Workflow } from "lucide-react";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BRAND } from "@/lib/brand";

export const dynamic = "force-dynamic";

export default function LandingPage() {
  return (
    <main id="main-content" className="relative">
      <div className="container py-6">
        <div className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <Link
              href="/market"
              className="hidden items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary sm:inline-flex"
            >
              <Globe className="h-3.5 w-3.5" />
              Tirana · Albanian Lek
            </Link>
            <Button asChild size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
          </div>
        </div>
      </div>

      <section className="container pb-6 pt-4">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mx-auto animate-fade-up">
            Albania-first · international-ready
          </Badge>
          <h1 className="text-balance mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
            Benefits, <span className="text-primary">made useful</span>.
          </h1>
          <p className="text-balance mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
            {BRAND.name} turns an employer benefit allowance into curated, multi-provider perks
            employees actually use — chosen by the employee, approved by HR, and paid directly to
            providers. The money never passes through employees&apos; hands.
          </p>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            <Feature icon={<Ticket className="h-3.5 w-3.5" />} label="Curated collections" />
            <Feature icon={<Workflow className="h-3.5 w-3.5" />} label="Approve → settle → voucher" />
            <Feature icon={<ShieldCheck className="h-3.5 w-3.5" />} label="Direct provider settlement" />
          </div>

          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/login">
                Enter the live demo <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/provider">
                <Store className="h-4 w-4" /> Provider portal
              </Link>
            </Button>
          </div>
        </div>

        {/* Two-dashboard explainer */}
        <div className="mx-auto mt-12 grid max-w-4xl gap-4 md:grid-cols-2">
          <DashboardCard
            icon={<Briefcase className="h-5 w-5" />}
            title="For employees"
            blurb="A focused, useful app: your benefit allowance, curated collections, timely drops, and quiet Perkline Match suggestions — tracked all the way to a QR voucher."
            points={["Discover perks & curated collections", "Perkline Match recommendations", "Vouchers & redemption profile"]}
          />
          <DashboardCard
            icon={<Building2 className="h-5 w-5" />}
            title="For company & HR"
            blurb="A calm operational cockpit: review requests with policy context, watch settlement go directly to providers, and read honest adoption analytics with a full audit trail."
            points={["Approval queue with policy checks", "Insights: adoption & unused budget", "Budget, policy & audit trail"]}
            highlight
          />
        </div>

        <div className="mx-auto mt-8 max-w-3xl rounded-xl border border-border bg-card/60 p-4 text-center text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Demo logins:</span> {BRAND.demo.employee} ·{" "}
          {BRAND.demo.admin} — password{" "}
          <span className="font-mono font-semibold text-foreground">{BRAND.demo.password}</span>. One-click
          sign-in on the login page.
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">{BRAND.attribution}</p>
      </section>
    </main>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground">
      <span className="text-primary">{icon}</span>
      {label}
    </span>
  );
}

function DashboardCard({
  icon,
  title,
  blurb,
  points,
  highlight,
}: {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  points: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-xl border bg-card p-5 text-left shadow-soft ${
        highlight ? "border-primary/30 ring-1 ring-primary/15" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-primary">{icon}</span>
        <h2 className="text-base font-bold">{title}</h2>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{blurb}</p>
      <ul className="mt-3 space-y-1.5">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-sm">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}
