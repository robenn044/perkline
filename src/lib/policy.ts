import { categoryLabel } from "./catalog";
import { formatMoney } from "./money";
import type {
  Employee,
  EmployerPolicy,
  Package,
  PolicyStatus,
} from "./types";

export interface PolicyEvaluation {
  status: PolicyStatus;
  notes: string[];
  budgetRemainingAfter: number;
  employerSummary: string;
  uniqueProviders: number;
}

/**
 * Deterministic policy engine. Runs server-side on every submission so totals
 * and category rules can never be spoofed by the client or the AI.
 */
export function evaluatePackage(
  pkg: Package,
  employee: Employee,
  policy: EmployerPolicy,
): PolicyEvaluation {
  const notes: string[] = [];
  const uniqueProviders = new Set(pkg.items.map((i) => i.providerId)).size;
  const budgetRemainingAfter = employee.budgetRemaining - pkg.total;

  let status: PolicyStatus = "within_policy";

  // Hard blocks first.
  const blocked = pkg.categoryTags.filter((c) => policy.blockedCategories.includes(c));
  if (blocked.length > 0) {
    status = "blocked";
    notes.push(`Contains blocked categories: ${blocked.map((c) => categoryLabel(c)).join(", ")}.`);
  }

  const notAllowed = pkg.categoryTags.filter((c) => !policy.allowedCategories.includes(c));
  if (notAllowed.length > 0) {
    status = "blocked";
    notes.push(`Categories outside policy: ${notAllowed.map((c) => categoryLabel(c)).join(", ")}.`);
  }

  if (pkg.total > employee.budgetRemaining) {
    status = "blocked";
    notes.push(
      `Exceeds remaining budget by ${formatMoney(pkg.total - employee.budgetRemaining, policy.currency)}.`,
    );
  }

  if (uniqueProviders > policy.maxProvidersPerPackage) {
    status = "blocked";
    notes.push(`Spans ${uniqueProviders} providers (max ${policy.maxProvidersPerPackage}).`);
  }

  // Soft signal: high-value requests need explicit approval but are allowed.
  if (status !== "blocked") {
    if (pkg.total >= policy.approvalThreshold) {
      status = "needs_approval";
      notes.push(
        `Above the ${formatMoney(policy.approvalThreshold, policy.currency)} auto-clear threshold — needs your sign-off.`,
      );
    } else {
      notes.push("Within budget and approved categories.");
    }
  }

  const employerSummary = buildEmployerSummary(pkg, employee, policy, {
    status,
    uniqueProviders,
    budgetRemainingAfter,
  });

  return { status, notes, budgetRemainingAfter, employerSummary, uniqueProviders };
}

function buildEmployerSummary(
  pkg: Package,
  employee: Employee,
  policy: EmployerPolicy,
  ctx: { status: PolicyStatus; uniqueProviders: number; budgetRemainingAfter: number },
): string {
  const share = Math.round((pkg.total / employee.monthlyBudget) * 100);
  const cats = pkg.categoryTags.map((c) => categoryLabel(c).toLowerCase()).join(" + ");
  const verdict =
    ctx.status === "blocked"
      ? "Outside policy"
      : ctx.status === "needs_approval"
        ? "Within budget, needs sign-off"
        : "Within policy";
  return `${verdict}. ${cats} package across ${ctx.uniqueProviders} provider${
    ctx.uniqueProviders > 1 ? "s" : ""
  }, using ${share}% of ${employee.name.split(" ")[0]}'s monthly allowance (${formatMoney(
    pkg.total,
    policy.currency,
  )}).`;
}
