import { ShieldCheck, Ticket, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import type { Employee, PaymentDestination } from "@/lib/types";

export function PerxWalletCard({
  employee,
  destination,
}: {
  employee: Employee;
  destination?: PaymentDestination;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <WalletCards className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">Perkline Credit</h3>
            <Badge variant="success">Internal benefit credit</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatMoney(employee.budgetRemaining, employee.currency)} available from your employer.
          </p>
        </div>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-xl bg-secondary/50 p-3">
          <p className="inline-flex items-center gap-1.5 font-medium">
            <Ticket className="h-4 w-4 text-primary" aria-hidden /> What it holds
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Benefit allowance, approved collections and voucher codes.
          </p>
        </div>
        <div className="rounded-xl bg-secondary/50 p-3">
          <p className="inline-flex items-center gap-1.5 font-medium">
            <ShieldCheck className="h-4 w-4 text-success" aria-hidden /> What it never holds
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            No card, IBAN, PayPal, crypto or cash-out details.
          </p>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Employers settle approved benefits directly with providers. This wallet is created
        automatically for your Perkline account{destination ? "." : " when your employer activates benefits."}
      </p>
    </div>
  );
}
