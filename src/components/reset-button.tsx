"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/toaster";

/** One-click demo reset — restores the seed so judges can re-run the flow. */
export function ResetButton({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function reset() {
    setLoading(true);
    try {
      await fetch("/api/reset", { method: "POST" });
      toast("Demo reset", { kind: "success", description: "Marketplace restored to its seeded state." });
      router.refresh();
    } catch {
      toast("Reset failed", { kind: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="outline"
      size={compact ? "sm" : "default"}
      onClick={reset}
      disabled={loading}
      aria-label="Reset demo data"
      title="Reset demo data"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RotateCcw className="h-4 w-4" aria-hidden />}
      {!compact && <span>Reset demo</span>}
    </Button>
  );
}
