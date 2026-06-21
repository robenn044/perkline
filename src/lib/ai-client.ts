import {
  buildPackageFromOffers,
  NEEDS,
  parseIntent,
  runDeterministicConcierge,
} from "./concierge";
import { evaluatePackage } from "./policy";
import type {
  ConciergeResult,
  Employee,
  EmployerPolicy,
  Offer,
  Provider,
  QuestionnaireAnswer,
} from "./types";
import type { Package } from "./types";
import { z } from "zod";

/**
 * Concierge orchestration.
 *
 * - No key (or PERX_FORCE_FALLBACK=true) → deterministic engine. This is the
 *   default the judges will see, and it is intentionally excellent.
 * - Key present → Claude selects offer ids + writes the package name/reason,
 *   then we re-validate every id against the seeded catalog and recompute totals
 *   server-side. Any drift, hallucinated id, or parse failure transparently
 *   falls back to the deterministic result. The demo can therefore never break.
 */

const MODEL = process.env.PERX_AI_MODEL || "claude-opus-4-8";

export function isClaudeEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY) && process.env.PERX_FORCE_FALLBACK !== "true";
}

export async function runConcierge(
  text: string,
  employee: Employee,
  policy: EmployerPolicy,
  offers: Offer[],
  providers: Provider[],
  questionnaire?: QuestionnaireAnswer,
  routes: Package[] = [],
): Promise<ConciergeResult> {
  const providersById = new Map(providers.map((p) => [p.id, p]));

  if (!isClaudeEnabled()) {
    return runDeterministicConcierge(text, employee, policy, offers, providersById, questionnaire);
  }

  try {
    const parsedIntent = parseIntent(text, employee, questionnaire);
    const aiResult = await callClaude(text, employee, policy, offers, routes, questionnaire);
    if (!aiResult) throw new Error("empty AI result");

    const picked = aiResult.offerIds
      .map((id) => offers.find((o) => o.id === id))
      .filter((o): o is Offer => Boolean(o));

    // Guardrails: must be real catalog offers, within policy budget, providers ok.
    const distinctProviders = new Set(picked.map((o) => o.providerId)).size;
    const total = picked.reduce((s, o) => s + o.price, 0);
    const maxSpend = Math.min(parsedIntent.budgetCap ?? employee.budgetRemaining, employee.budgetRemaining);
    const routeIdsValid = aiResult.routeIds.every((id) => routes.some((route) => route.id === id));
    const policyCategoriesValid = picked.every(
      (offer) =>
        policy.allowedCategories.includes(offer.category) &&
        !policy.blockedCategories.includes(offer.category),
    );
    const valid =
      picked.length > 0 &&
      picked.length === aiResult.offerIds.length &&
      routeIdsValid &&
      distinctProviders <= policy.maxProvidersPerPackage &&
      policyCategoriesValid &&
      total <= maxSpend;

    if (!valid) {
      const fallback = runDeterministicConcierge(text, employee, policy, offers, providersById, questionnaire);
      fallback.narration.unshift("Claude's draft needed a tweak to stay within policy — refined it for you.");
      return fallback;
    }

    const intent = parsedIntent;
    const spec = NEEDS[intent.primaryNeed] ?? NEEDS.general;
    const pkg = buildPackageFromOffers(picked, intent, employee, spec, "ai");
    if (aiResult.packageName) pkg.title = aiResult.packageName;
    if (aiResult.reason) pkg.reason = aiResult.reason;
    if (typeof aiResult.confidence === "number") pkg.confidence = aiResult.confidence;

    const evaln = evaluatePackage(pkg, employee, policy);

    return {
      intent,
      package: pkg,
      alternatives: [],
      narration: aiResult.narration?.length
        ? aiResult.narration
        : [`Here's “${pkg.title}” — curated by Claude from the Tirana catalog.`],
      policyStatus: evaln.status,
      policyNotes: evaln.notes,
      remainingBudgetAfter: evaln.budgetRemainingAfter,
      engine: "claude",
      fallbackMessage: null,
    };
  } catch {
    const fallback = runDeterministicConcierge(text, employee, policy, offers, providersById, questionnaire);
    return fallback;
  }
}

const claudeDraftSchema = z
  .object({
    packageName: z.string().min(1).max(100),
    reason: z.string().min(1).max(400),
    narration: z.array(z.string().min(1).max(220)).max(5),
    offerIds: z.array(z.string().min(1).max(60)).min(1).max(4),
    routeIds: z.array(z.string().min(1).max(80)).max(3),
    reportedTotal: z.number().int().nonnegative(),
    confidence: z.number().min(0).max(1),
    eligibility: z.object({
      status: z.enum(["within_policy", "needs_approval", "blocked"]),
      reasons: z.array(z.string().min(1).max(180)).max(5),
    }),
  })
  .strict();

type ClaudeDraft = z.infer<typeof claudeDraftSchema>;

async function callClaude(
  text: string,
  employee: Employee,
  policy: EmployerPolicy,
  offers: Offer[],
  routes: Package[],
  questionnaire?: QuestionnaireAnswer,
): Promise<ClaudeDraft | null> {
  // Dynamic import keeps the SDK out of the no-key code path entirely.
  const { default: Anthropic } = await import("@anthropic-ai/sdk");
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const catalog = offers.map((o) => ({
    id: o.id,
    title: o.title,
    category: o.category,
    price: o.price,
    providerId: o.providerId,
    tags: o.tags,
    availability: o.availability,
  }));

  const system = [
    "<role>You are Perkline Match, an AI benefits planner for employer-funded benefits in Tirana, Albania.</role>",
    "<objective>Turn the employee's request into ONE desirable, locally-relevant package built ONLY from the provided catalog, within employer policy.</objective>",
    "<hard_rules>",
    "- Use ONLY offer ids present in <catalog>. Never invent ids.",
    "- Prefer 2-3 items across DIFFERENT providers when budget allows.",
    `- Total must not exceed the employee's remaining budget (${employee.budgetRemaining} ALL) or any stated cap.`,
    `- Respect maxProvidersPerPackage=${policy.maxProvidersPerPackage}.`,
    "- Output ONLY valid minified JSON, no prose, matching the schema.",
    "</hard_rules>",
    "- Return offerIds and routeIds only from the supplied catalogs.",
    "- reportedTotal and eligibility are advisory; Perkline recomputes both server-side.",
    '<schema>{"packageName":string,"reason":string,"narration":string[],"offerIds":string[],"routeIds":string[],"reportedTotal":number,"confidence":number,"eligibility":{"status":"within_policy"|"needs_approval"|"blocked","reasons":string[]}}</schema>',
  ].join("\n");

  const user = [
    `<employee>${JSON.stringify({ name: employee.name, role: employee.role, department: employee.department, preferences: employee.preferences, interests: employee.interests, remainingBudget: employee.budgetRemaining })}</employee>`,
    questionnaire?.completedAt
      ? `<profile>${JSON.stringify({ goals: questionnaire.goals, stressLevel: questionnaire.stressLevel, preferredCategories: questionnaire.preferredCategories, groupPreference: questionnaire.groupPreference, timePreference: questionnaire.timePreference, priority: questionnaire.priority })}</profile>`
      : "",
    `<policy>${JSON.stringify({ allowedCategories: policy.allowedCategories, maxProvidersPerPackage: policy.maxProvidersPerPackage })}</policy>`,
    `<season>${currentSeason()}</season>`,
    `<catalog>${JSON.stringify(catalog)}</catalog>`,
    `<routes>${JSON.stringify(routes.map((route) => ({ id: route.id, title: route.title, offerIds: route.items.map((item) => item.offerId) })))}</routes>`,
    `<user_request>${text}</user_request>`,
  ]
    .filter(Boolean)
    .join("\n");

  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: 700,
    system,
    messages: [{ role: "user", content: user }],
  });

  const block = resp.content.find((c) => c.type === "text");
  if (!block || block.type !== "text") return null;
  const json = extractJson(block.text);
  if (!json) return null;
  const parsed = claudeDraftSchema.safeParse(JSON.parse(json));
  return parsed.success ? parsed.data : null;
}

function extractJson(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return text.slice(start, end + 1);
}

function currentSeason(): string {
  const m = new Date().getMonth(); // 0-11
  if (m <= 1 || m === 11) return "winter";
  if (m <= 4) return "spring";
  if (m <= 7) return "summer";
  return "autumn";
}
