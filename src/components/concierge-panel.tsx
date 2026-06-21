"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Clock,
  Cpu,
  Loader2,
  Send,
  Sparkles,
  Target,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PackageBreakdown } from "@/components/package-breakdown";
import { PolicyBadge } from "@/components/policy-badge";
import { SubmitPackageButton } from "@/components/submit-package-button";
import { CategoryChip } from "@/components/category-chip";
import { formatMoney } from "@/lib/money";
import type { CatalogLite } from "@/lib/catalog-lite";
import type { ConciergeResult } from "@/lib/types";

const SUGGESTED = [
  "I'm stressed and want something relaxing under 12,000 ALL this weekend",
  "A healthy week on a budget",
  "Help me learn a new skill this month",
  "Plan a weekend escape under 10,000 ALL",
  "I just need more mobile data",
];

const THINKING_STEPS = [
  "Reading your request…",
  "Searching the Tirana catalog within your budget…",
  "Bundling complementary providers…",
];

type Status = "idle" | "thinking" | "done" | "error";

export function ConciergePanel({
  employeeId,
  budgetRemaining,
  catalog,
}: {
  employeeId: string;
  budgetRemaining: number;
  catalog: CatalogLite;
}) {
  const [prompt, setPrompt] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const [result, setResult] = React.useState<ConciergeResult | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [stepIdx, setStepIdx] = React.useState(0);

  const runRef = React.useRef(0);

  async function ask(text: string) {
    const q = text.trim();
    if (!q) return;
    const runId = ++runRef.current;
    setPrompt(q);
    setStatus("thinking");
    setResult(null);
    setError(null);
    setStepIdx(0);

    const stepTimer = setInterval(() => setStepIdx((i) => Math.min(i + 1, THINKING_STEPS.length - 1)), 550);

    try {
      const [res] = await Promise.all([
        fetch("/api/concierge", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ employeeId, prompt: q }),
        }).then((r) => r.json()),
        // Minimum think time so the staged reveal lands even when the engine is instant.
        new Promise((r) => setTimeout(r, 1000)),
      ]);
      clearInterval(stepTimer);
      if (runId !== runRef.current) return;

      if (!res.ok) {
        setError(res.error ?? "Something went wrong.");
        setStatus("error");
        return;
      }
      setResult(res.result as ConciergeResult);
      setStatus("done");
    } catch {
      clearInterval(stepTimer);
      if (runId !== runRef.current) return;
      setError("Network error — please try again.");
      setStatus("error");
    }
  }

  return (
    <div className="space-y-5">
      {/* Composer */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft sm:p-5">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold leading-tight">Perkline Match</p>
            <p className="text-xs text-muted-foreground">Tell me what you need — I'll build the package.</p>
          </div>
          <Badge variant="primary" className="ml-auto">
            <Wallet className="h-3.5 w-3.5" />
            {formatMoney(budgetRemaining)} left
          </Badge>
        </div>

        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row"
          onSubmit={(e) => {
            e.preventDefault();
            ask(prompt);
          }}
        >
          <Input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. I'm stressed and want something relaxing under 12,000 ALL this weekend"
            className="flex-1"
            aria-label="Ask Perkline Match"
          />
          <Button type="submit" disabled={status === "thinking" || !prompt.trim()} size="lg">
            {status === "thinking" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Ask
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          {SUGGESTED.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              disabled={status === "thinking"}
              className="rounded-full border border-border bg-secondary/60 px-3 py-1.5 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Thinking */}
      <AnimatePresence mode="wait">
        {status === "thinking" && (
          <motion.div
            key="thinking"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft"
          >
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <p className="text-sm font-medium">{THINKING_STEPS[stepIdx]}</p>
            </div>
            <div className="mt-4 space-y-2">
              <div className="shimmer h-12 rounded-xl bg-secondary" />
              <div className="shimmer h-12 rounded-xl bg-secondary" />
              <div className="shimmer h-12 w-2/3 rounded-xl bg-secondary" />
            </div>
          </motion.div>
        )}

        {status === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive"
          >
            {error}
          </motion.div>
        )}

        {status === "done" && result && (
          <motion.div key={result.package?.id ?? "noresult"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            <ResultView result={result} catalog={catalog} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultView({ result, catalog }: { result: ConciergeResult; catalog: CatalogLite }) {
  const { intent, package: pkg } = result;

  return (
    <>
      {/* What the AI understood */}
      <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={result.engine === "claude" ? "primary" : "accent"}>
            <Cpu className="h-3.5 w-3.5" />
            {result.engine === "claude" ? "Powered by Claude" : "Smart-match engine"}
          </Badge>
          <Badge variant="outline">
            <Target className="h-3.5 w-3.5" />
            {intent.primaryNeed}
          </Badge>
          {intent.budgetCap && (
            <Badge variant="outline">
              <Wallet className="h-3.5 w-3.5" /> ≤ {formatMoney(intent.budgetCap)}
            </Badge>
          )}
          {intent.timeContext !== "anytime" && (
            <Badge variant="outline">
              <Clock className="h-3.5 w-3.5" /> {intent.timeContext}
            </Badge>
          )}
          <span className="ml-auto text-xs text-muted-foreground">
            {Math.round(intent.confidence * 100)}% confident
          </span>
        </div>

        <div className="mt-3 space-y-1.5">
          {result.narration.map((line, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.35 }}
              className="text-sm text-muted-foreground"
            >
              <span className="mr-1.5 text-primary">▸</span>
              {line}
            </motion.p>
          ))}
        </div>
      </div>

      {result.fallbackMessage && !pkg && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {result.fallbackMessage}
        </div>
      )}

      {/* The package */}
      {pkg && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: result.narration.length * 0.35 + 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-glow"
        >
          <div className="bg-primary p-5 text-white">
            <div className="flex items-center justify-between gap-2">
              <Badge className="bg-white/20 text-white ring-white/30">
                <Sparkles className="h-3.5 w-3.5" /> Your package
              </Badge>
              <div className="flex flex-wrap gap-1.5">
                {pkg.categoryTags.map((c) => (
                  <CategoryChip key={c} category={c} className="bg-white/15 text-white ring-white/20" />
                ))}
              </div>
            </div>
            <h2 className="mt-3 text-2xl font-extrabold">{pkg.title}</h2>
            <p className="text-sm text-white/85">{pkg.tagline}</p>
          </div>

          <div className="space-y-4 p-5">
            <p className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">Why this fits: </span>
              {pkg.reason}
            </p>

            <PackageBreakdown pkg={pkg} catalog={catalog} animate />

            <div className="flex items-center justify-between rounded-xl bg-secondary/60 p-3">
              <span className="text-sm font-medium">Package total</span>
              <span className="tabular text-lg font-bold">{formatMoney(pkg.total, pkg.currency)}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PolicyBadge status={result.policyStatus} />
              {result.remainingBudgetAfter !== null && (
                <Badge variant="outline">
                  <Wallet className="h-3.5 w-3.5" />
                  {formatMoney(result.remainingBudgetAfter)} left after
                </Badge>
              )}
            </div>
            {result.policyNotes.length > 0 && (
              <ul className="space-y-1 text-xs text-muted-foreground">
                {result.policyNotes.map((n, i) => (
                  <li key={i}>• {n}</li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <SubmitPackageButton
                pkg={pkg}
                origin="concierge"
                disabled={result.policyStatus === "blocked"}
                className="flex-1"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* Alternatives */}
      {result.alternatives.length > 0 && (
        <div>
          <p className="mb-2 text-sm font-semibold">Or compare a lighter option</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.alternatives.map((alt) => (
              <div key={alt.id} className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{alt.title}</p>
                  <span className="tabular text-sm font-bold">{formatMoney(alt.total, alt.currency)}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{alt.tagline}</p>
                <div className="mt-3">
                  <PackageBreakdown pkg={alt} catalog={catalog} />
                </div>
                <div className="mt-3">
                  <SubmitPackageButton pkg={alt} origin="concierge" size="sm" variant="outline" label="Submit this instead" className="w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
