"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryChip } from "@/components/category-chip";
import { toast } from "@/components/toaster";
import { cn } from "@/lib/utils";
import type { Category, QuestionnaireAnswer } from "@/lib/types";

const GOALS = ["reduce stress", "stay healthy", "learn a skill", "save money", "travel more", "connect with team"];
const CATEGORIES: Category[] = ["wellness", "food", "learning", "health", "fitness", "travel", "telecom"];

export function QuestionnaireForm({
  initial,
  redirectTo = "/employee/concierge",
}: {
  initial?: QuestionnaireAnswer | null;
  redirectTo?: string;
}) {
  const router = useRouter();
  const [goals, setGoals] = React.useState<string[]>(initial?.goals ?? ["reduce stress"]);
  const stressLevel = initial?.stressLevel ?? 3;
  const [preferredCategories, setPreferred] = React.useState<Category[]>(initial?.preferredCategories ?? ["wellness", "food"]);
  const [groupPreference, setGroup] = React.useState<QuestionnaireAnswer["groupPreference"]>(initial?.groupPreference ?? "either");
  const [timePreference, setTime] = React.useState<QuestionnaireAnswer["timePreference"]>(initial?.timePreference ?? "either");
  const [priority, setPriority] = React.useState<QuestionnaireAnswer["priority"]>(initial?.priority ?? "balance");
  const [saving, setSaving] = React.useState(false);

  function toggle<T>(list: T[], set: (v: T[]) => void, value: T) {
    set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function save() {
    if (preferredCategories.length === 0) {
      toast("Pick at least one category", { kind: "info" });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/questionnaire", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ goals, stressLevel, preferredCategories, groupPreference, timePreference, priority }),
      }).then((r) => r.json());
      if (!res.ok) {
        toast("Couldn't save", { kind: "error", description: res.error });
        setSaving(false);
        return;
      }
      toast("Profile saved", { kind: "success", description: "Perkline Match is now personalized." });
      router.push(redirectTo);
      router.refresh();
    } catch {
      toast("Network error", { kind: "error" });
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
      <Block title="What are your goals right now?" hint="Pick any that apply">
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <Chip key={g} active={goals.includes(g)} onClick={() => toggle(goals, setGoals, g)}>
              {g}
            </Chip>
          ))}
        </div>
      </Block>

      <Block title="Which categories do you care about?">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => toggle(preferredCategories, setPreferred, c)}
              className={cn("rounded-full transition-all", preferredCategories.includes(c) ? "ring-2 ring-primary/40" : "opacity-50 grayscale hover:opacity-80")}
            >
              <CategoryChip category={c} className="px-3 py-1.5" />
            </button>
          ))}
        </div>
      </Block>

      <div className="grid gap-4 sm:grid-cols-3">
        <Segmented label="Solo or team?" value={groupPreference} onChange={setGroup} options={[["solo", "Solo"], ["team", "Team"], ["either", "Either"]]} />
        <Segmented label="When?" value={timePreference} onChange={setTime} options={[["weekday", "Weekday"], ["weekend", "Weekend"], ["either", "Either"]]} />
        <Segmented label="Top priority" value={priority} onChange={setPriority} options={[["wellness", "Wellness"], ["learning", "Learning"], ["travel", "Travel"], ["balance", "Balance"]]} />
      </div>

      <Button onClick={save} disabled={saving} size="lg" className="w-full">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        Save & personalize Perkline Match
      </Button>
    </div>
  );
}

function Block({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">{title}</p>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
        active ? "border-primary bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-secondary",
      )}
    >
      {children}
    </button>
  );
}

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: [T, string][];
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {options.map(([val, lbl]) => (
          <button
            key={val}
            onClick={() => onChange(val)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
              value === val ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/70",
            )}
          >
            {lbl}
          </button>
        ))}
      </div>
    </div>
  );
}
