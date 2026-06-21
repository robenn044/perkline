"use client";

import { Input } from "@/components/ui/input";
import { countryRequiresBic, type ProviderDestinationDraft } from "@/lib/payment-destination";

type BankDraft = Extract<ProviderDestinationDraft, { type: "provider_bank_settlement" }>;

export function ProviderBankSettlementFields({
  value,
  onChange,
}: {
  value: BankDraft;
  onChange: (value: BankDraft) => void;
}) {
  const requiresBic = countryRequiresBic(value.country);
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 sm:col-span-2">
        <span className="text-xs font-medium">Legal business name</span>
        <Input
          value={value.legalBusinessName}
          onChange={(event) => onChange({ ...value, legalBusinessName: event.target.value })}
          placeholder="Motive Studio sh.p.k."
          autoComplete="organization"
        />
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium">Country</span>
        <select
          value={value.country}
          onChange={(event) => onChange({ ...value, country: event.target.value, bic: "" })}
          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="AL">Albania</option>
          <option value="IT">Italy</option>
          <option value="DE">Germany</option>
          <option value="FR">France</option>
        </select>
      </label>
      <label className="space-y-1">
        <span className="text-xs font-medium">Currency</span>
        <select
          value={value.currency}
          onChange={(event) =>
            onChange({ ...value, currency: event.target.value as BankDraft["currency"] })
          }
          className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
        >
          <option value="ALL">ALL</option>
          <option value="EUR">EUR</option>
          <option value="USD">USD</option>
        </select>
      </label>
      <label className="space-y-1 sm:col-span-2">
        <span className="text-xs font-medium">IBAN</span>
        <Input
          value={value.iban}
          onChange={(event) => onChange({ ...value, iban: event.target.value })}
          placeholder="AL47 2121 1009 0000 0002 3569 8741"
          autoComplete="off"
        />
        <span className="block text-[11px] text-muted-foreground">
          Validated server-side, then masked. The full IBAN is not retained.
        </span>
      </label>
      {requiresBic && (
        <label className="space-y-1 sm:col-span-2">
          <span className="text-xs font-medium">BIC / SWIFT</span>
          <Input
            value={value.bic}
            onChange={(event) => onChange({ ...value, bic: event.target.value.toUpperCase() })}
            placeholder="NCBAALTX"
            autoComplete="off"
          />
          <span className="block text-[11px] text-muted-foreground">
            Required for this settlement country.
          </span>
        </label>
      )}
    </div>
  );
}
