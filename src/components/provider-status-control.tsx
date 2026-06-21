"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/toaster";
import type { Provider } from "@/lib/types";

export function ProviderStatusControl({
  providerId,
  status,
}: {
  providerId: string;
  status: Provider["status"];
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function update(next: Provider["status"]) {
    setBusy(true);
    try {
      const response = await fetch(`/api/providers/${providerId}/status`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        toast("Provider update failed", { kind: "error", description: result.error });
        return;
      }
      toast("Provider status updated", { kind: "success", description: next.replace(/_/g, " ") });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <label className="relative">
      <span className="sr-only">Provider status</span>
      <select
        value={status}
        disabled={busy}
        onChange={(event) => update(event.target.value as Provider["status"])}
        className="h-8 rounded-lg border border-input bg-background px-2 pr-7 text-xs"
      >
        <option value="active">Active</option>
        <option value="pending_review">Pending review</option>
        <option value="paused">Paused</option>
      </select>
      {busy && <Loader2 className="absolute right-2 top-2 h-3.5 w-3.5 animate-spin" aria-hidden />}
    </label>
  );
}
