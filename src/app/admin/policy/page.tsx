import { SiteHeader } from "@/components/site-header";
import { PolicyEditor } from "@/components/policy-editor";
import { requireRole } from "@/lib/auth";
import { getDefaultMarket, getPolicy } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function AdminPolicy() {
  const session = await requireRole("company_admin");
  const policy = getPolicy(session.companyId)!;
  const market = getDefaultMarket();

  return (
    <>
      <SiteHeader
        role="admin"
        marketLabel={`${market.city} · ${market.defaultCurrency}`}
        user={{ name: session.name, avatarSeed: session.avatarSeed }}
      />
      <main id="main-content" className="container max-w-3xl space-y-5 py-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Benefit policy</h1>
          <p className="text-sm text-muted-foreground">
            Set the monthly allowance, the auto-clear threshold, allowed categories, and bundle limits.
            Changes apply to new requests immediately and are written to the audit log.
          </p>
        </div>
        <PolicyEditor policy={policy} />
      </main>
    </>
  );
}
