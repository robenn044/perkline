import { ShieldCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { getAudit, getDefaultMarket } from "@/lib/store";
import { timeAgo } from "@/lib/utils";
import type { AuditAction } from "@/lib/types";

export const dynamic = "force-dynamic";

const ACTION_VARIANT: Partial<Record<AuditAction, "primary" | "success" | "warning" | "destructive" | "default">> = {
  login: "default",
  request_submitted: "primary",
  request_approved: "success",
  request_rejected: "destructive",
  payment_routed: "success",
  voucher_redeemed: "success",
  policy_updated: "warning",
  payment_destination_updated: "default",
  provider_status_updated: "warning",
  questionnaire_saved: "default",
  demo_reset: "warning",
  bonus_created: "primary",
  bonus_submitted: "primary",
  payout_approved: "primary",
  payout_processing: "primary",
  payout_settled: "success",
  payout_failed: "destructive",
  payout_retried: "warning",
  payout_method_added: "default",
  payout_method_verified: "success",
  payout_method_removed: "default",
};

export default async function AdminAudit() {
  const session = await requireRole("company_admin");
  const events = getAudit(session.companyId, 80);
  const market = getDefaultMarket();

  return (
    <>
      <SiteHeader
        role="admin"
        marketLabel={`${market.city} · ${market.defaultCurrency}`}
        user={{ name: session.name, avatarSeed: session.avatarSeed }}
      />
      <main id="main-content" className="container max-w-3xl space-y-5 py-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold tracking-tight">Audit log</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Every approval, payout, policy change and sign-in is recorded for compliance confidence.
        </p>

        {events.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No activity recorded yet. Sign-ins, approvals and payouts will appear here.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {events.map((e) => (
              <div key={e.id} className="flex items-start gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-soft">
                <Badge variant={ACTION_VARIANT[e.action] ?? "default"} className="mt-0.5 shrink-0">
                  {e.action.replace(/_/g, " ")}
                </Badge>
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{e.summary}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {e.actorName} · {timeAgo(e.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
