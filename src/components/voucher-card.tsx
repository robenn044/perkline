"use client";

import * as React from "react";
import { Check, Copy, Ticket } from "lucide-react";
import { Qrish } from "@/components/qrish";
import { Badge } from "@/components/ui/badge";
import { ProviderLogo } from "@/components/provider-logo";
import { toast } from "@/components/toaster";
import { formatDate } from "@/lib/utils";
import type { Voucher } from "@/lib/types";

export function VoucherCard({ voucher, providerSeed }: { voucher: Voucher; providerSeed?: string }) {
  const [copied, setCopied] = React.useState(false);
  const redeemed = voucher.status === "redeemed";

  function copy() {
    navigator.clipboard?.writeText(voucher.code).then(() => {
      setCopied(true);
      toast("Code copied", { kind: "success", description: voucher.code });
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
      {/* Ticket notch accent */}
      <div className="absolute left-0 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-background" />
      <div className="absolute right-0 top-1/2 h-6 w-6 -translate-y-1/2 translate-x-1/2 rounded-full bg-background" />

      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <Qrish value={voucher.code} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <ProviderLogo name={voucher.providerName} seed={providerSeed} size={32} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{voucher.offerTitle}</p>
              <p className="truncate text-xs text-muted-foreground">{voucher.providerName}</p>
            </div>
            <Badge variant={redeemed ? "success" : "primary"} className="ml-auto">
              <Ticket className="h-3.5 w-3.5" />
              {redeemed ? "Redeemed" : "Ready"}
            </Badge>
          </div>

          <button
            onClick={copy}
            className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl border border-dashed border-border bg-secondary/50 px-3 py-2 text-left transition-colors hover:bg-secondary"
          >
            <span className="tabular font-mono text-sm font-bold tracking-wider">{voucher.code}</span>
            {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
          </button>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Show this at {voucher.providerName}. Valid until {formatDate(voucher.expiresAt)}.
          </p>
          <details className="mt-3 rounded-xl bg-secondary/45 p-3 text-xs">
            <summary className="cursor-pointer font-medium text-primary">Redemption steps</summary>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-muted-foreground">
              {voucher.redemptionSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <p className="mt-2 text-muted-foreground">
              Support: <span className="font-medium text-foreground">{voucher.supportContact}</span>
            </p>
          </details>
        </div>
      </div>
    </div>
  );
}
