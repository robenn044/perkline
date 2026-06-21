"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banknote, Building2, CreditCard, Loader2, Save, ShieldCheck, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ProviderBankSettlementFields } from "@/components/provider-bank-settlement-fields";
import { ProviderPayPalBusinessFields } from "@/components/provider-paypal-business-fields";
import { ProviderCardProcessorFields } from "@/components/provider-card-processor-fields";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/toaster";
import { cn } from "@/lib/utils";
import {
  createProviderDestinationDraft,
  paymentDestinationDisplay,
  switchProviderDestinationType,
  type ProviderDestinationDraft,
} from "@/lib/payment-destination";
import type { Provider, ProviderPaymentDestination } from "@/lib/types";

/**
 * Settlement methods, modeled on the Stripe Connect "connected account" pattern
 * (platform charges, then transfers to each provider) and presented as
 * accessible select-cards with progressive disclosure (Baymard payment-method
 * UX). The first option is the sensible default for the Albania market.
 */
const SETTLEMENT_TYPES: {
  type: ProviderDestinationDraft["type"];
  title: string;
  subtitle: string;
  icon: LucideIcon;
}[] = [
  { type: "provider_bank_settlement", title: "Bank (SEPA/IBAN)", subtitle: "Direct transfer to the provider's account", icon: Banknote },
  { type: "provider_paypal_business", title: "PayPal Business", subtitle: "Connect a verified business account", icon: Wallet },
  { type: "provider_card_processor", title: "Card processor", subtitle: "Hosted, tokenized onboarding", icon: CreditCard },
];

/** Map the stored destination status to Stripe-Connect-style, human language. */
function settlementStatus(status?: ProviderPaymentDestination["status"]): {
  label: string;
  variant: "success" | "warning" | "default";
} {
  switch (status) {
    case "active":
      return { label: "Payouts enabled", variant: "success" };
    case "connected":
      return { label: "Connected", variant: "success" };
    case "pending_verification":
      return { label: "Verification pending", variant: "warning" };
    case "disabled":
      return { label: "Disabled", variant: "default" };
    default:
      return { label: "Setup required", variant: "warning" };
  }
}

export function ProviderSettlementManager({
  providers,
  destinations,
}: {
  providers: Provider[];
  destinations: ProviderPaymentDestination[];
}) {
  const router = useRouter();
  const [providerId, setProviderId] = React.useState(providers[0]?.id ?? "");
  const [draft, setDraft] = React.useState<ProviderDestinationDraft>(() =>
    createProviderDestinationDraft("provider_bank_settlement"),
  );
  const [busy, setBusy] = React.useState(false);
  const selectedProvider = providers.find((provider) => provider.id === providerId);
  const current = destinations.find((destination) => destination.ownerId === providerId);

  function changeType(next: ProviderDestinationDraft["type"]) {
    setDraft((existing) => switchProviderDestinationType(existing, next));
  }

  async function save() {
    setBusy(true);
    try {
      const response = await fetch("/api/payment-destinations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ providerId, ...draft }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        toast("Settlement setup failed", { kind: "error", description: result.error });
        return;
      }
      toast("Settlement destination saved", {
        kind: "success",
        description: paymentDestinationDisplay(result.destination),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
        <label className="block space-y-1">
          <span className="text-xs font-medium">Provider</span>
          <select
            value={providerId}
            onChange={(event) => setProviderId(event.target.value)}
            className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            {providers.map((provider) => (
              <option key={provider.id} value={provider.id}>
                {provider.displayName}
              </option>
            ))}
          </select>
        </label>
        <div className="rounded-xl bg-secondary/50 p-3">
          <p className="inline-flex items-center gap-1.5 text-sm font-medium">
            <Building2 className="h-4 w-4 text-primary" aria-hidden />
            {selectedProvider?.displayName}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Current: {current ? paymentDestinationDisplay(current) : "Setup required"}
          </p>
          <Badge className="mt-2" variant={settlementStatus(current?.status).variant}>
            {settlementStatus(current?.status).label}
          </Badge>
        </div>
        <div className="flex items-start gap-2 rounded-xl border border-border/60 p-3 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
          Provider funds are simulated and settle directly to this destination. Employees never
          receive benefit cash.
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium">Settlement method</legend>
          <div role="radiogroup" aria-label="Settlement method" className="grid gap-2 sm:grid-cols-3">
            {SETTLEMENT_TYPES.map((option) => {
              const selected = draft.type === option.type;
              const Icon = option.icon;
              return (
                <label
                  key={option.type}
                  className={cn(
                    "relative flex cursor-pointer flex-col gap-1 rounded-xl border p-3 text-sm transition-all focus-within:ring-2 focus-within:ring-ring",
                    selected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:bg-secondary/50",
                  )}
                >
                  <input
                    type="radio"
                    name="settlement-type"
                    value={option.type}
                    checked={selected}
                    onChange={() => changeType(option.type)}
                    className="sr-only"
                  />
                  <span className="flex items-center gap-1.5 font-medium">
                    <Icon className="h-4 w-4 text-primary" aria-hidden />
                    {option.title}
                  </span>
                  <span className="text-xs text-muted-foreground">{option.subtitle}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {draft.type === "provider_bank_settlement" && (
          <ProviderBankSettlementFields value={draft} onChange={setDraft} />
        )}
        {draft.type === "provider_paypal_business" && (
          <ProviderPayPalBusinessFields value={draft} onChange={setDraft} />
        )}
        {draft.type === "provider_card_processor" && <ProviderCardProcessorFields />}

        <Button onClick={save} disabled={busy || !providerId}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
          {draft.type === "provider_paypal_business"
            ? "Connect PayPal Business"
            : draft.type === "provider_card_processor"
              ? "Launch hosted setup"
              : "Save & mask bank details"}
        </Button>
      </div>
    </div>
  );
}
