"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/toaster";
import type { CurrencyCode, Employee, LocaleCode } from "@/lib/types";

const LOCALES: [LocaleCode, string][] = [
  ["en-AL", "English (Albania)"],
  ["sq-AL", "Shqip (Albania)"],
  ["it-IT", "Italiano"],
  ["es-ES", "Español"],
];
const CURRENCIES: CurrencyCode[] = ["ALL", "EUR", "USD"];

export function ProfileForm({ employee }: { employee: Employee }) {
  const router = useRouter();
  const [name, setName] = React.useState(employee.name);
  const [role, setRole] = React.useState(employee.role);
  const [department, setDepartment] = React.useState(employee.department);
  const [locale, setLocale] = React.useState<LocaleCode>(employee.locale);
  const [currency, setCurrency] = React.useState<CurrencyCode>(employee.currency);
  const [interests, setInterests] = React.useState(employee.interests.join(", "));
  const [saving, setSaving] = React.useState(false);

  async function save() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name,
          role,
          department,
          locale,
          currency,
          interests: interests.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 12),
        }),
      }).then((r) => r.json());
      if (!res.ok) {
        toast("Couldn't save", { kind: "error", description: res.error });
      } else {
        toast("Profile updated", { kind: "success" });
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name"><Input value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <Field label="Job title"><Input value={role} onChange={(e) => setRole(e.target.value)} /></Field>
        <Field label="Department"><Input value={department} onChange={(e) => setDepartment(e.target.value)} /></Field>
        <Field label="Language">
          <select value={locale} onChange={(e) => setLocale(e.target.value as LocaleCode)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
            {LOCALES.map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </Field>
        <Field label="Display currency">
          <select value={currency} onChange={(e) => setCurrency(e.target.value as CurrencyCode)} className="h-11 w-full rounded-xl border border-input bg-card px-3 text-sm">
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Interests (comma-separated)">
          <Input value={interests} onChange={(e) => setInterests(e.target.value)} placeholder="yoga, coffee, climbing" />
        </Field>
      </div>
      <Button onClick={save} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save profile
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
