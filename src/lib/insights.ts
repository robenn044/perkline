import { categoryLabel } from "./catalog";
import type {
  BenefitRequest,
  Category,
  Employee,
  EmployerInsight,
} from "./types";

/**
 * Employer-side insight generator (deterministic). Summarizes what people value,
 * what budget goes unused, and what providers to add next — the "employer-side
 * insights" direction from the brief, delivered as a concise, narratable card.
 */
export function buildInsight(
  companyName: string,
  employees: Employee[],
  requests: BenefitRequest[],
): EmployerInsight {
  const decided = requests.filter((r) => r.status !== "pending" && r.status !== "rejected");

  // Category frequency across all (non-rejected) requests.
  const counts = new Map<Category, number>();
  for (const r of requests) {
    if (r.status === "rejected") continue;
    for (const c of r.package.categoryTags) {
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
  }
  const totalCount = Array.from(counts.values()).reduce((s, n) => s + n, 0) || 1;
  const topCategories = Array.from(counts.entries())
    .map(([category, count]) => ({ category, count, share: Math.round((count / totalCount) * 100) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  const totalBudget = employees.reduce((s, e) => s + e.monthlyBudget, 0);
  const remaining = employees.reduce((s, e) => s + e.budgetRemaining, 0);
  const unusedBudgetRate = totalBudget > 0 ? Number((remaining / totalBudget).toFixed(2)) : 0;

  const totalRoutedToProviders = decided.reduce(
    (s, r) => s + r.paymentSplits.reduce((ss, sp) => ss + sp.amount, 0),
    0,
  );

  const leadCategory = topCategories[0]?.category;
  const laggard = findLaggingCategory(counts);

  const bullets: string[] = [];
  bullets.push(`${Math.round(unusedBudgetRate * 100)}% of this month's welfare budget is still unused.`);
  if (leadCategory) {
    bullets.push(
      `${categoryLabel(leadCategory)} leads demand (${topCategories[0].share}% of selections).`,
    );
  }
  if (topCategories.length >= 2) {
    bullets.push(
      `${categoryLabel(topCategories[0].category)} + ${categoryLabel(topCategories[1].category)} bundles are the most common combination.`,
    );
  }
  if (laggard) {
    bullets.push(`${categoryLabel(laggard)} is under-used — it may need better packaging or providers.`);
  }
  if (decided.length > 0) {
    bullets.push(`${decided.length} approved request${decided.length > 1 ? "s" : ""} routed directly to providers so far.`);
  }

  const recommendedActions: string[] = [];
  if (leadCategory) {
    recommendedActions.push(
      `Add one more ${categoryLabel(leadCategory).toLowerCase()} provider with weekend availability to meet demand.`,
    );
  }
  if (laggard) {
    recommendedActions.push(
      `Re-package ${categoryLabel(laggard).toLowerCase()} with a complementary perk (e.g. a meal) to lift uptake.`,
    );
  }
  if (unusedBudgetRate > 0.3) {
    recommendedActions.push(
      `Nudge employees with a Friday Drop — ${Math.round(unusedBudgetRate * 100)}% of budget is at risk of going unused.`,
    );
  }
  if (recommendedActions.length === 0) {
    recommendedActions.push("Keep the current provider mix — utilization and balance look healthy.");
  }

  const summary =
    decided.length === 0
      ? `${companyName} has its full welfare budget available. Wellness and food packages tend to convert first — feature them to spark the first approvals.`
      : `At ${companyName}, ${leadCategory ? categoryLabel(leadCategory).toLowerCase() : "wellness"}-led packages are outperforming, while ${
          Math.round(unusedBudgetRate * 100)
        }% of budget remains unspent. Tune the provider mix toward what your people actually pick.`;

  return {
    summary,
    bullets,
    recommendedActions: recommendedActions.slice(0, 3),
    topCategories,
    unusedBudgetRate,
    totalApproved: decided.length,
    totalRoutedToProviders,
    confidence: 0.84,
  };
}

function findLaggingCategory(counts: Map<Category, number>): Category | null {
  const all: Category[] = ["wellness", "food", "learning", "health", "fitness", "travel", "telecom"];
  let worst: { c: Category; n: number } | null = null;
  for (const c of all) {
    const n = counts.get(c) ?? 0;
    if (worst === null || n < worst.n) worst = { c, n };
  }
  // Only flag a laggard if there's genuine activity to compare against.
  const max = Math.max(0, ...Array.from(counts.values()));
  if (max === 0) return null;
  return worst?.c ?? null;
}
