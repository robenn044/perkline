"use client";

import { motion } from "framer-motion";
import { formatMoney } from "@/lib/money";
import type { CurrencyCode } from "@/lib/types";

/**
 * Animated budget ring — the first thing an employee sees. The arc fills to the
 * share of budget remaining, communicating "budget-backed discovery" instantly.
 */
export function BudgetRing({
  remaining,
  total,
  currency = "ALL",
  size = 132,
  stroke = 12,
}: {
  remaining: number;
  total: number;
  currency?: CurrencyCode;
  size?: number;
  stroke?: number;
}) {
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const ratio = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const used = total - remaining;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--secondary))"
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#budgetGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ * (1 - ratio) }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
        <defs>
          <linearGradient id="budgetGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="hsl(192 60% 26%)" />
            <stop offset="100%" stopColor="hsl(186 52% 40%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Left</span>
        <span className="tabular text-lg font-bold leading-tight">{remaining.toLocaleString("en-US")}</span>
        <span className="text-[11px] font-medium text-muted-foreground">{currency}</span>
      </div>
      <span className="sr-only">
        {formatMoney(remaining, currency)} remaining of {formatMoney(total, currency)} ({formatMoney(used, currency)} used)
      </span>
    </div>
  );
}
