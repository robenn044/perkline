"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Award, Gift, Loader2, Sparkles, Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/toaster";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { BonusTemplate, CurrencyCode } from "@/lib/types";

export interface Recipient {
  employeeId: string;
  name: string;
  avatarSeed: string;
  department: string;
  hasVerified: boolean;
  methodType?: string;
  methodMask?: string;
}

const TEMPLATES: { key: BonusTemplate; label: string; icon: React.ReactNode; name: string; reason: string }[] = [
  { key: "team_challenge", label: "Team Challenge Reward", icon: <Trophy className="h-4 w-4" />, name: "Team Challenge Reward", reason: "Won the quarterly wellness challenge" },
  { key: "recognition", label: "Recognition Bonus", icon: <Award className="h-4 w-4" />, name: "Recognition Bonus", reason: "Outstanding contribution this month" },
  { key: "custom", label: "Custom", icon: <Gift className="h-4 w-4" />, name: "", reason: "" },
];

export function BonusComposer({ recipients }: { recipients: Recipient[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [template, setTemplate] = React.useState<BonusTemplate>("team_challenge");
  const [name, setName] = React.useState(TEMPLATES[0].name);
  const [reason, setReason] = React.useState(TEMPLATES[0].reason);
  const [currency, setCurrency] = React.useState<CurrencyCode>("ALL");
  const [amount, setAmount] = React.useState(5000);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [testFailFirst, setTestFailFirst] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  const eligible = recipients.filter((r) => r.hasVerified);
  const chosen = eligible.filter((r) => selected[r.employeeId]);

  function pickTemplate(t: BonusTemplate) {
    setTemplate(t);
    const tpl = TEMPLATES.find((x) => x.key === t)!;
    if (t !== "custom") {
      setName(tpl.name);
      setReason(tpl.reason);
    }
  }

  async function submit() {
    if (!name.trim() || !reason.trim()) return toast("Add a name and reason", { kind: "info" });
    if (chosen.length === 0) return toast("Select at least one recipient", { kind: "info" });
    setBusy(true);
    try {
      const res = await fetch("/api/bonuses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          template,
          name,
          reason,
          displayCurrency: currency,
          items: chosen.map((r) => ({ employeeId: r.employeeId, amount: Number(amount), testFailFirst })),
        }),
      }).then((r) => r.json());
      if (!res.ok) {
        toast("Couldn't create", { kind: "error", description: res.error });
      } else {
        toast("Bonus sent for finance review", { kind: "success", description: `${chosen.length} payout(s) created.` });
        setOpen(false);
        setSelected({});
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4" /> Create bonus
      </Button>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">New bonus</h3>
        <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Close</Button>
      </div>

      {/* Templates */}
      <div className="grid grid-cols-3 gap-2">
        {TEMPLATES.map((t) => (
          <button
            key={t.key}
            onClick={() => pickTemplate(t.key)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-xl border p-3 text-xs font-medium transition-all",
              template === t.key ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:bg-secondary",
            )}
          >
            <span className="text-primary">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Bonus name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Reason / category"><Input value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        <Field label="Amount per recipient">
          <Input type="number" value={amount} min={1} onChange={(e) => setAmount(Number(e.target.value))} />
        </Field>
        <Field label="Display currency">
          <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
            {(["ALL", "EUR", "USD"] as CurrencyCode[]).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </div>

      {/* Recipients */}
      <div>
        <p className="mb-2 text-sm font-semibold">Recipients (verified payout method required)</p>
        <div className="space-y-2">
          {recipients.map((r) => {
            const on = !!selected[r.employeeId];
            return (
              <button
                key={r.employeeId}
                disabled={!r.hasVerified}
                onClick={() => setSelected((s) => ({ ...s, [r.employeeId]: !s[r.employeeId] }))}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition-all",
                  !r.hasVerified ? "cursor-not-allowed border-border opacity-50" : on ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "border-border hover:bg-secondary",
                )}
              >
                <Avatar name={r.name} seed={r.avatarSeed} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{r.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.department}
                    {r.hasVerified ? ` · ${r.methodType} ${r.methodMask}` : " · no verified method"}
                  </p>
                </div>
                {r.hasVerified ? (
                  on ? <Badge variant="primary">{formatMoney(Number(amount) || 0, currency)}</Badge> : <Badge variant="outline">Select</Badge>
                ) : (
                  <Badge variant="warning">Not eligible</Badge>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={testFailFirst} onChange={(e) => setTestFailFirst(e.target.checked)} />
        Simulate a failed first attempt (to demo retry &amp; reconciliation)
      </label>

      <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-3">
        <span className="text-sm">{chosen.length} recipient(s) · total</span>
        <span className="tabular text-lg font-bold">{formatMoney((Number(amount) || 0) * chosen.length, currency)}</span>
      </div>

      <Button onClick={submit} disabled={busy} className="w-full">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Send to finance for review
      </Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
