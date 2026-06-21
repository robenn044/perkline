"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PaymentRoutingOverlay } from "@/components/payment-routing-overlay";
import { toast } from "@/components/toaster";
import type { BenefitRequest, PaymentSplit } from "@/lib/types";

/** Approve (with optional comment) or reject (with comment) from the detail view. */
export function AdminDecisionPanel({
  requestId,
  packageTitle,
  providerSeeds,
}: {
  requestId: string;
  packageTitle: string;
  providerSeeds: Record<string, string>;
}) {
  const router = useRouter();
  const [comment, setComment] = React.useState("");
  const [busy, setBusy] = React.useState<null | "approve" | "reject">(null);
  const [overlay, setOverlay] = React.useState<PaymentSplit[] | null>(null);

  async function decide(kind: "approve" | "reject") {
    if (kind === "reject" && !comment.trim()) {
      toast("Add a short reason", { kind: "info", description: "Employees see your comment." });
      return;
    }
    setBusy(kind);
    try {
      const res = await fetch(`/api/requests/${requestId}/${kind}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ comment: comment.trim() || undefined }),
      }).then((r) => r.json());
      if (!res.ok) {
        toast("Action failed", { kind: "error", description: res.error });
        setBusy(null);
        return;
      }
      if (kind === "approve") {
        setOverlay((res.request as BenefitRequest).paymentSplits);
      } else {
        toast("Request rejected", { kind: "info" });
        router.refresh();
        setBusy(null);
      }
    } catch {
      toast("Network error", { kind: "error" });
      setBusy(null);
    }
  }

  function closeOverlay() {
    setOverlay(null);
    setBusy(null);
    toast("Approved & routed", { kind: "success", description: "Payment sent directly to providers." });
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
      <p className="text-sm font-semibold">Decision</p>
      <Input
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Optional note on approval · required to reject"
      />
      <div className="flex gap-2">
        <Button variant="success" className="flex-1" onClick={() => decide("approve")} disabled={busy !== null}>
          {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Approve & route payment
        </Button>
        <Button variant="outline" onClick={() => decide("reject")} disabled={busy !== null}>
          {busy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          Reject
        </Button>
      </div>

      <PaymentRoutingOverlay
        open={overlay !== null}
        splits={overlay ?? []}
        providerSeeds={providerSeeds}
        packageTitle={packageTitle}
        onClose={closeOverlay}
      />
    </div>
  );
}
