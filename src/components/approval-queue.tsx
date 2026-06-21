"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Loader2, Wallet, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CategoryChip } from "@/components/category-chip";
import { PolicyBadge } from "@/components/policy-badge";
import { PackageBreakdown } from "@/components/package-breakdown";
import { PaymentRoutingOverlay } from "@/components/payment-routing-overlay";
import { toast } from "@/components/toaster";
import { formatMoney } from "@/lib/money";
import type { CatalogLite } from "@/lib/catalog-lite";
import type { BenefitRequest, PaymentSplit } from "@/lib/types";

export interface QueueItem {
  request: BenefitRequest;
  employeeName: string;
  employeeSeed: string;
}

export function ApprovalQueue({
  items,
  catalog,
  providerSeeds,
}: {
  items: QueueItem[];
  catalog: CatalogLite;
  providerSeeds: Record<string, string>;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState<string | null>(null);
  const [rejecting, setRejecting] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");
  const [overlay, setOverlay] = React.useState<{ splits: PaymentSplit[]; title: string } | null>(null);

  async function approve(item: QueueItem) {
    setBusyId(item.request.id);
    try {
      const res = await fetch(`/api/requests/${item.request.id}/approve`, { method: "POST" }).then((r) => r.json());
      if (!res.ok) {
        toast("Couldn't approve", { kind: "error", description: res.error });
        setBusyId(null);
        return;
      }
      const updated = res.request as BenefitRequest;
      setOverlay({ splits: updated.paymentSplits, title: updated.package.title });
    } catch {
      toast("Network error", { kind: "error" });
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/requests/${id}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason }),
      }).then((r) => r.json());
      if (!res.ok) {
        toast("Couldn't reject", { kind: "error", description: res.error });
      } else {
        toast("Request rejected", { kind: "info" });
        router.refresh();
      }
    } finally {
      setBusyId(null);
      setRejecting(null);
      setReason("");
    }
  }

  function closeOverlay() {
    setOverlay(null);
    setBusyId(null);
    toast("Approved & routed", { kind: "success", description: "Payment sent directly to providers." });
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-card/60 p-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/10 text-success">
          <Check className="h-6 w-6" />
        </span>
        <p className="font-semibold">All caught up</p>
        <p className="text-sm text-muted-foreground">No requests waiting for approval right now.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        <AnimatePresence initial={false}>
          {items.map((item) => {
            const r = item.request;
            const isOpen = expanded === r.id;
            return (
              <motion.div
                key={r.id}
                layout
                exit={{ opacity: 0, scale: 0.97, transition: { duration: 0.2 } }}
                className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft"
              >
                <div className="flex items-start gap-3">
                  <Avatar name={item.employeeName} seed={item.employeeSeed} size={42} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{item.employeeName}</p>
                      <span className="text-sm text-muted-foreground">wants</span>
                      <p className="font-semibold text-primary">{r.package.title}</p>
                      <PolicyBadge status={r.policyStatus} />
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {r.package.categoryTags.map((c) => (
                        <CategoryChip key={c} category={c} withIcon={false} />
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="tabular text-lg font-bold">{formatMoney(r.package.total, r.package.currency)}</p>
                    <p className="text-[11px] text-muted-foreground">{r.package.items.length} experiences</p>
                  </div>
                </div>

                {/* AI / policy summary */}
                <div className="mt-3 rounded-xl bg-secondary/50 p-3 text-sm">
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-foreground">AI + policy: </span>
                    {r.employerSummary}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="outline">
                      <Wallet className="h-3.5 w-3.5" />
                      {formatMoney(r.budgetRemainingAfter)} left after
                    </Badge>
                    <button
                      onClick={() => setExpanded(isOpen ? null : r.id)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      {isOpen ? "Hide" : "View"} breakdown
                      <ChevronDown className={isOpen ? "h-3.5 w-3.5 rotate-180 transition-transform" : "h-3.5 w-3.5 transition-transform"} />
                    </button>
                  </div>
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3">
                          <PackageBreakdown pkg={r.package} catalog={catalog} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Actions */}
                {rejecting === r.id ? (
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    <Input
                      autoFocus
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Optional reason for the employee…"
                      className="flex-1"
                    />
                    <div className="flex gap-2">
                      <Button variant="destructive" onClick={() => reject(r.id)} disabled={busyId === r.id}>
                        {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                        Confirm reject
                      </Button>
                      <Button variant="ghost" onClick={() => setRejecting(null)} disabled={busyId === r.id}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="success"
                      className="flex-1"
                      onClick={() => approve(item)}
                      disabled={busyId !== null || r.policyStatus === "blocked"}
                    >
                      {busyId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      Approve & route payment
                    </Button>
                    <Button variant="outline" onClick={() => setRejecting(r.id)} disabled={busyId !== null}>
                      <X className="h-4 w-4" /> Reject
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <PaymentRoutingOverlay
        open={overlay !== null}
        splits={overlay?.splits ?? []}
        providerSeeds={providerSeeds}
        packageTitle={overlay?.title ?? ""}
        onClose={closeOverlay}
      />
    </>
  );
}
