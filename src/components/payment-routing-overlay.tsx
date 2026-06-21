"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Building2, Check, Loader2, PartyPopper } from "lucide-react";
import { ProviderLogo } from "@/components/provider-logo";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import type { PaymentSplit } from "@/lib/types";

/**
 * The memorable "money moves" moment: when HR approves, payment routes to each
 * provider sequentially. The splits are already settled server-side — this is a
 * faithful, animated replay so judges literally watch the marketplace economics.
 */
export function PaymentRoutingOverlay({
  open,
  splits,
  providerSeeds,
  packageTitle,
  onClose,
}: {
  open: boolean;
  splits: PaymentSplit[];
  providerSeeds: Record<string, string>;
  packageTitle: string;
  onClose: () => void;
}) {
  const [routed, setRouted] = React.useState(0);
  const done = routed >= splits.length;
  const total = splits.reduce((s, sp) => s + sp.amount, 0);

  React.useEffect(() => {
    if (!open) {
      setRouted(0);
      return;
    }
    if (routed >= splits.length) return;
    const t = setTimeout(() => setRouted((r) => r + 1), 850);
    return () => clearTimeout(t);
  }, [open, routed, splits.length]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.94, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="w-full max-w-md overflow-hidden rounded-2xl border border-border/70 bg-card shadow-glow"
          >
            <div className="bg-primary p-5 text-white">
              <p className="text-sm font-medium text-white/85">Approving “{packageTitle}”</p>
              <h3 className="text-xl font-extrabold">
                {done ? "Payment routed" : "Routing payment to providers…"}
              </h3>
            </div>

            <div className="space-y-2 p-5">
              {splits.map((s, i) => {
                const state = i < routed ? "paid" : i === routed ? "routing" : "pending";
                return (
                  <motion.div
                    key={s.id}
                    layout
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-card p-3"
                  >
                    <ProviderLogo name={s.providerName} seed={providerSeeds[s.providerId]} size={38} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{s.providerName}</p>
                      <p className="text-xs text-muted-foreground">{formatMoney(s.amount, s.currency)}</p>
                    </div>
                    {state === "paid" && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-semibold text-success"
                      >
                        <Check className="h-3.5 w-3.5" /> Paid
                      </motion.span>
                    )}
                    {state === "routing" && (
                      <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing
                      </span>
                    )}
                    {state === "pending" && (
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-muted-foreground">
                        Pending
                      </span>
                    )}
                  </motion.div>
                );
              })}

              <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-3 text-sm">
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <Building2 className="h-4 w-4" /> AlbaTech
                  <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  {splits.length} provider{splits.length === 1 ? "" : "s"}
                </span>
                <span className="tabular font-bold">{formatMoney(total)}</span>
              </div>

              <AnimatePresence>
                {done && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-3 pt-1"
                  >
                    <div className="flex items-center gap-2 rounded-xl bg-success/10 p-3 text-sm font-medium text-success">
                      <PartyPopper className="h-4 w-4" />
                      Vouchers issued to the employee. Funds never touched their hands.
                    </div>
                    <Button className="w-full" onClick={onClose}>
                      Done
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
