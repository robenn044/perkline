"use client";

import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { ProviderDestinationDraft } from "@/lib/payment-destination";

type PayPalDraft = Extract<ProviderDestinationDraft, { type: "provider_paypal_business" }>;

export function ProviderPayPalBusinessFields({
  value,
  onChange,
}: {
  value: PayPalDraft;
  onChange: (value: PayPalDraft) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-xs font-medium">Verified PayPal Business email</span>
        <Input
          type="email"
          value={value.verifiedBusinessEmail}
          onChange={(event) => onChange({ ...value, verifiedBusinessEmail: event.target.value })}
          placeholder="payments@provider.al"
          autoComplete="email"
        />
      </label>
      <div className="flex items-start gap-2 rounded-xl bg-secondary/50 p-3 text-xs text-muted-foreground">
        <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        The demo simulates a PayPal Business redirect and verified connection. Perkline never asks for or
        stores a PayPal password.
      </div>
    </div>
  );
}
