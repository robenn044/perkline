import { CreditCard, ExternalLink, ShieldCheck } from "lucide-react";

export function ProviderCardProcessorFields() {
  return (
    <div className="rounded-xl border border-border/70 bg-secondary/40 p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-card text-primary">
          <CreditCard className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="font-medium">Hosted processor setup</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Continue to a simulated TeamSystem Payments hosted onboarding page. Perkline receives only a
            processor account token and connection status.
          </p>
          <p className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-success">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden /> No card number or CVV enters Perkline
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Hosted flow is simulated in this demo
          </p>
        </div>
      </div>
    </div>
  );
}
