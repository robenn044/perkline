"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Banknote, Briefcase, Building2, Loader2, LogIn, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { rewardsPayoutsEnabled } from "@/lib/feature-flags";
import { BRAND } from "@/lib/brand";

const DEMO = {
  employee: { email: BRAND.demo.employee, password: BRAND.demo.password },
  admin: { email: BRAND.demo.admin, password: BRAND.demo.password },
  finance: { email: BRAND.demo.finance, password: BRAND.demo.password },
};
const REWARDS_PAYOUTS_ENABLED = rewardsPayoutsEnabled();

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = React.useState<string>(DEMO.employee.email);
  const [password, setPassword] = React.useState<string>(DEMO.employee.password);
  const [loading, setLoading] = React.useState<null | "form" | "employee" | "admin" | "finance">(null);
  const [error, setError] = React.useState<string | null>(null);

  async function submit(creds: { email: string; password: string }, which: "form" | "employee" | "admin" | "finance") {
    setLoading(which);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(creds),
      }).then((r) => r.json());
      if (!res.ok) {
        setError(res.error ?? "Sign-in failed.");
        setLoading(null);
        return;
      }
      const dest = res.role === "company_admin" ? "/admin" : res.role === "finance_admin" ? "/finance" : "/employee";
      router.push(next && next.startsWith("/") ? next : dest);
      router.refresh();
    } catch {
      setError("Network error — please try again.");
      setLoading(null);
    }
  }

  return (
    <div className="w-full max-w-md">
      <div className="rounded-xl border border-border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Sign in to {BRAND.name}</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Secure demo login · role-based access · sessions are signed httpOnly cookies.
        </p>

        <form
          className="mt-5 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit({ email, password }, "form");
          }}
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Password</label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading !== null}>
            {loading === "form" ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
            Sign in
          </Button>
        </form>

        <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" /> or one-click demo <span className="h-px flex-1 bg-border" />
        </div>

        <div className={REWARDS_PAYOUTS_ENABLED ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-2"}>
          <Button variant="outline" size="sm" onClick={() => submit(DEMO.employee, "employee")} disabled={loading !== null}>
            {loading === "employee" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Briefcase className="h-4 w-4" />}
            Employee
          </Button>
          <Button variant="outline" size="sm" onClick={() => submit(DEMO.admin, "admin")} disabled={loading !== null}>
            {loading === "admin" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
            Admin
          </Button>
          {REWARDS_PAYOUTS_ENABLED && (
            <Button variant="outline" size="sm" onClick={() => submit(DEMO.finance, "finance")} disabled={loading !== null}>
              {loading === "finance" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
              Rewards finance
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-border bg-card/60 p-3 text-center text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Demo logins</span> · {BRAND.demo.employee} · {BRAND.demo.admin}
        {REWARDS_PAYOUTS_ENABLED ? ` · ${BRAND.demo.finance}` : ""} · password{" "}
        <Badge variant="outline" className="ml-1">{BRAND.demo.password}</Badge>
      </div>

      <p className="mt-3 text-center text-xs text-muted-foreground">{BRAND.attribution}</p>
    </div>
  );
}
