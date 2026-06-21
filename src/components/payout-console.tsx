"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Check, Download, Loader2, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PayoutStatusBadge } from "@/components/payout-status-badge";
import { toast } from "@/components/toaster";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { BonusPayout, PayoutStatus } from "@/lib/types";

interface Row extends BonusPayout {
  avatarSeed: string;
}

const FILTERS: { key: PayoutStatus | "all"; label: string }[] = [
  { key: "pending_review", label: "Pending review" },
  { key: "failed", label: "Failed" },
  { key: "confirmed", label: "Confirmed" },
  { key: "all", label: "All" },
];

export function PayoutConsole({ payouts }: { payouts: Row[] }) {
  const router = useRouter();
  const [filter, setFilter] = React.useState<PayoutStatus | "all">("pending_review");
  const [q, setQ] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<Row | null>(null);

  const filtered = payouts.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (q && !`${p.employeeName} ${p.reason} ${p.destinationMask}`.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  async function process(p: Row) {
    setBusy(p.id);
    setConfirm(null);
    try {
      const res = await fetch(`/api/payouts/${p.id}/process`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((r) => r.json());
      if (!res.ok) toast("Action failed", { kind: "error", description: res.error });
      else if (res.pending) toast("Awaiting second approval", { kind: "info", description: "This amount needs a second distinct approver." });
      else if (res.payout.status === "confirmed") toast("Payout settled", { kind: "success", description: `Ref ${res.payout.transactionRef}` });
      else if (res.payout.status === "paid") toast("Submitted to provider", { kind: "success", description: "Awaiting settlement webhook." });
      else if (res.payout.status === "failed") toast("Payout failed", { kind: "error", description: res.payout.failureReason });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function retry(p: Row) {
    setBusy(p.id);
    try {
      const res = await fetch(`/api/payouts/${p.id}/retry`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }).then((r) => r.json());
      if (!res.ok) toast("Retry failed", { kind: "error", description: res.error });
      else if (res.payout.status === "confirmed") toast("Retry settled", { kind: "success", description: `Ref ${res.payout.transactionRef}` });
      else toast("Still failing", { kind: "error", description: res.payout.failureReason });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  function exportCsv() {
    const header = ["id", "employee", "amount", "currency", "status", "destinationType", "destinationMask", "transactionRef", "createdAt"];
    const rows = filtered.map((p) => [p.id, p.employeeName, p.amount, p.currency, p.status, p.destinationType, p.destinationMask, p.transactionRef ?? "", p.createdAt]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `perx-payouts-${filter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                filter === f.key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="h-9 w-44 pl-9" />
          </div>
          <Button variant="outline" size="sm" onClick={exportCsv}>
            <Download className="h-4 w-4" /> Export
          </Button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center text-sm text-muted-foreground">
          Nothing in this view.
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-card p-3 shadow-soft">
              <Avatar name={p.employeeName} seed={p.avatarSeed} size={36} />
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-1.5 truncate text-sm font-semibold">
                  {p.employeeName} <span className="font-normal text-muted-foreground">· {p.reason}</span>
                  <Badge variant={p.environment === "live" ? "success" : "outline"}>{p.environment}</Badge>
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {p.provider} · {p.destinationType} · {p.destinationMask}
                  {p.destinationNetwork ? ` · ${p.destinationNetwork}` : ""}
                  {p.transactionRef ? ` · ${p.transactionRef}` : ""}
                </p>
                {p.status === "failed" && p.failureReason && (
                  <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3" /> {p.failureReason}
                  </p>
                )}
              </div>
              <span className="tabular font-bold">{formatMoney(p.amount, p.currency)}</span>
              <PayoutStatusBadge status={p.status} />
              {p.status === "pending_review" && (
                <Button size="sm" variant="success" onClick={() => setConfirm(p)} disabled={busy !== null}>
                  {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Approve &amp; pay
                </Button>
              )}
              {p.status === "failed" && (
                <Button size="sm" variant="outline" onClick={() => retry(p)} disabled={busy !== null}>
                  {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Retry
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Confirmation modal — amount, masked destination, audit reason */}
      <AnimatePresence>
        {confirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
            onClick={() => setConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 12, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-2xl border border-border/70 bg-card p-5 shadow-glow"
            >
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-bold">Confirm payout</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">This releases simulated funds to the employee's verified destination.</p>
              <dl className="mt-4 space-y-2 rounded-xl bg-secondary/60 p-3 text-sm">
                <Row2 k="Recipient" v={confirm.employeeName} />
                <Row2 k="Amount" v={formatMoney(confirm.amount, confirm.currency)} strong />
                <Row2 k="Destination" v={`${confirm.destinationType} · ${confirm.destinationMask}`} mono />
                {confirm.destinationNetwork && <Row2 k="Network" v={confirm.destinationNetwork} mono />}
                <Row2 k="Reason" v={confirm.reason} />
              </dl>
              {confirm.destinationType === "crypto" && (
                <p className="mt-2 inline-flex items-start gap-1.5 text-xs text-amber-700">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Crypto network &amp; address lock once initiated. Testnet/mock only.
                </p>
              )}
              <div className="mt-4 flex gap-2">
                <Button variant="success" className="flex-1" onClick={() => process(confirm)}>
                  <Check className="h-4 w-4" /> Confirm &amp; pay {formatMoney(confirm.amount, confirm.currency)}
                </Button>
                <Button variant="ghost" onClick={() => setConfirm(null)}>Cancel</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Row2({ k, v, strong, mono }: { k: string; v: string; strong?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className={cn(strong && "text-base font-bold", mono && "font-mono text-xs", "text-right")}>{v}</dd>
    </div>
  );
}
