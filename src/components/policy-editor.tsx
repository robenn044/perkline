"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CategoryChip } from "@/components/category-chip";
import { toast } from "@/components/toaster";
import { cn } from "@/lib/utils";
import type { Category, EmployerPolicy } from "@/lib/types";

const ALL_CATEGORIES: Category[] = ["wellness", "food", "learning", "health", "fitness", "travel", "telecom"];

export function PolicyEditor({ policy }: { policy: EmployerPolicy }) {
  const router = useRouter();
  const [monthlyLimit, setMonthlyLimit] = React.useState(policy.monthlyLimit);
  const [approvalThreshold, setApprovalThreshold] = React.useState(policy.approvalThreshold);
  const [maxProviders, setMaxProviders] = React.useState(policy.maxProvidersPerPackage);
  const [allowed, setAllowed] = React.useState<Category[]>(policy.allowedCategories);
  const [saving, setSaving] = React.useState(false);

  function toggle(cat: Category) {
    setAllowed((prev) => (prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]));
  }

  async function save() {
    if (allowed.length === 0) {
      toast("Pick at least one category", { kind: "info" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/policy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          monthlyLimit: Number(monthlyLimit),
          approvalThreshold: Number(approvalThreshold),
          maxProvidersPerPackage: Number(maxProviders),
          allowedCategories: allowed,
        }),
      }).then((r) => r.json());
      if (!res.ok) {
        toast("Couldn't save", { kind: "error", description: res.error });
      } else {
        toast("Policy updated", { kind: "success", description: "New requests use these rules immediately." });
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5 rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Monthly limit / employee (ALL)">
          <Input type="number" value={monthlyLimit} onChange={(e) => setMonthlyLimit(Number(e.target.value))} />
        </Field>
        <Field label="Auto-clear threshold (ALL)">
          <Input type="number" value={approvalThreshold} onChange={(e) => setApprovalThreshold(Number(e.target.value))} />
        </Field>
        <Field label="Max providers / package">
          <Input type="number" min={1} max={6} value={maxProviders} onChange={(e) => setMaxProviders(Number(e.target.value))} />
        </Field>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium">Allowed categories</p>
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map((c) => {
            const on = allowed.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggle(c)}
                className={cn(
                  "rounded-full transition-all",
                  on ? "ring-2 ring-primary/40" : "opacity-50 grayscale hover:opacity-80",
                )}
              >
                <CategoryChip category={c} className="px-3 py-1.5" />
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Requests touching a disabled category are flagged <span className="font-medium">outside policy</span> and can't be approved.
        </p>
      </div>

      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save policy
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
