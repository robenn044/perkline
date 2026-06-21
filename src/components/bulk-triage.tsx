"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/toaster";

export interface BulkTriageItem {
  id: string;
  employeeName: string;
  title: string;
}

export function BulkTriage({ items }: { items: BulkTriageItem[] }) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [comment, setComment] = React.useState("");
  const [busy, setBusy] = React.useState<"approve" | "reject" | null>(null);

  if (items.length < 2) return null;

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id],
    );
  }

  async function submit(action: "approve" | "reject") {
    if (selected.length === 0) {
      toast("Select at least one request", { kind: "info" });
      return;
    }
    if (action === "reject" && !comment.trim()) {
      toast("Add a rejection reason", { kind: "info" });
      return;
    }
    setBusy(action);
    try {
      const response = await fetch("/api/requests/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ requestIds: selected, action, comment: comment.trim() || undefined }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        toast("Bulk triage incomplete", {
          kind: "error",
          description: result.error ?? result.failures?.join(" "),
        });
        return;
      }
      toast(`${result.processed} requests ${action === "approve" ? "approved" : "rejected"}`, {
        kind: "success",
      });
      setSelected([]);
      setComment("");
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
      <div>
        <p className="font-semibold">Bulk triage</p>
        <p className="text-xs text-muted-foreground">
          Select requests that share the same decision context. Each is still revalidated server-side.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <label key={item.id} className="flex items-start gap-2 rounded-xl bg-secondary/45 p-3 text-sm">
            <input
              type="checkbox"
              checked={selected.includes(item.id)}
              onChange={() => toggle(item.id)}
              className="mt-0.5 h-4 w-4 rounded border-input"
            />
            <span>
              <span className="font-medium">{item.employeeName}</span>
              <span className="block text-xs text-muted-foreground">{item.title}</span>
            </span>
          </label>
        ))}
      </div>
      <Input
        value={comment}
        onChange={(event) => setComment(event.target.value)}
        placeholder="Shared note · required for bulk rejection"
      />
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => submit("approve")} disabled={busy !== null} variant="success">
          {busy === "approve" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCheck className="h-4 w-4" aria-hidden />}
          Approve selected
        </Button>
        <Button onClick={() => submit("reject")} disabled={busy !== null} variant="outline">
          {busy === "reject" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <X className="h-4 w-4" aria-hidden />}
          Reject selected
        </Button>
      </div>
    </div>
  );
}
