import { LifeBuoy, TicketCheck } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { VoucherCard } from "@/components/voucher-card";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import {
  getDefaultMarket,
  getEmployee,
  getProvider,
  getRequestsByEmployee,
} from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function VouchersPage() {
  const session = await requireRole("employee");
  const employee = getEmployee(session.employeeId!) ?? getEmployee("emp_elira")!;
  const market = getDefaultMarket();
  const vouchers = getRequestsByEmployee(employee.id).flatMap((request) =>
    request.vouchers.map((voucher) => ({ request, voucher })),
  );

  return (
    <>
      <SiteHeader
        role="employee"
        marketLabel={`${market.city} · ${market.defaultCurrency}`}
        user={{ name: employee.name, avatarSeed: employee.avatarSeed }}
      />
      <main id="main-content" className="container max-w-4xl space-y-6 py-6">
        <div>
          <h1 className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight">
            <TicketCheck className="h-6 w-6 text-primary" aria-hidden /> Vouchers
          </h1>
          <p className="text-sm text-muted-foreground">
            QR codes, redemption steps, expiry and support for approved benefits.
          </p>
        </div>

        {vouchers.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Your vouchers appear here after a request is approved and providers are settled.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {vouchers.map(({ request, voucher }) => (
              <section key={voucher.id} aria-label={`${voucher.offerTitle} voucher`}>
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  From {request.package.title}
                </p>
                <VoucherCard
                  voucher={voucher}
                  providerSeed={getProvider(voucher.providerId)?.logoSeed}
                />
              </section>
            ))}
          </div>
        )}

        <div className="flex items-start gap-2 rounded-xl border border-border/70 bg-card p-3 text-xs text-muted-foreground">
          <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          Need help with a booking or redemption? Contact support@perkline.demo and include your voucher code.
        </div>
      </main>
    </>
  );
}
