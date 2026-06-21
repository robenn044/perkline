"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/toaster";

export function RedeemButton({ voucherId, redeemed }: { voucherId: string; redeemed: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function redeem() {
    setLoading(true);
    try {
      const res = await fetch(`/api/vouchers/${voucherId}/redeem`, { method: "POST" }).then((r) => r.json());
      if (!res.ok) {
        toast("Couldn't redeem", { kind: "error", description: res.error });
      } else {
        toast("Voucher redeemed", { kind: "success", description: "Employee earned Perkline points." });
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  if (redeemed) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Check className="h-4 w-4 text-success" /> Redeemed
      </Button>
    );
  }

  return (
    <Button variant="outline" size="sm" onClick={redeem} disabled={loading}>
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
      Mark redeemed
    </Button>
  );
}
