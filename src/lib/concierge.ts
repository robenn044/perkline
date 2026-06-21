import { categoryLabel } from "./catalog";
import { formatMoney } from "./money";
import { evaluatePackage } from "./policy";
import type {
  Category,
  ConciergeIntent,
  ConciergeResult,
  Employee,
  EmployerPolicy,
  Offer,
  Package,
  Provider,
  QuestionnaireAnswer,
} from "./types";
import { hashString } from "./utils";

/**
 * Deterministic concierge engine.
 *
 * This is the safety net that makes the live demo unbreakable: even with no API
 * key, "I'm stressed and want something relaxing under 12,000 ALL this weekend"
 * deterministically yields a valid multi-provider package built ONLY from the
 * seeded catalog, fully policy-checked. When a Claude key is present, the AI
 * picks the offer ids and phrasing (see ai-client.ts) and we re-run exactly this
 * validation + assembly fallback so output is always trustworthy.
 */

interface NeedSpec {
  need: ConciergeIntent["primaryNeed"];
  categories: Category[];
  keywords: string[];
  packageName: string;
  taglines: string[];
}

const NEEDS: Record<ConciergeIntent["primaryNeed"], NeedSpec> = {
  relaxation: {
    need: "relaxation",
    categories: ["wellness", "food"],
    keywords: ["stress", "stressed", "relax", "relaxing", "unwind", "calm", "tired", "burnt", "burnout", "reset", "recharge", "chill", "spa", "massage", "yoga", "meditat", "rest", "self care", "self-care", "wellbeing", "wellness"],
    packageName: "Tirana Reset",
    taglines: ["Unwind across the city in one weekend", "Your stress-melting reset"],
  },
  healthy: {
    need: "healthy",
    categories: ["food", "fitness", "wellness"],
    keywords: ["healthy", "health", "eat", "food", "nutrition", "clean", "brunch", "lunch", "diet", "detox", "juice", "fresh", "balanced"],
    packageName: "Clean Living",
    taglines: ["Eat clean, move well", "A fresh-start week"],
  },
  fitness: {
    need: "fitness",
    categories: ["fitness", "wellness", "food"],
    keywords: ["gym", "workout", "fit", "fitness", "train", "training", "exercise", "active", "climb", "climbing", "strong", "muscle", "cardio", "run"],
    packageName: "Move More",
    taglines: ["Build momentum this week", "Stay active, stay sharp"],
  },
  learning: {
    need: "learning",
    categories: ["learning", "food"],
    keywords: ["learn", "learning", "skill", "skills", "course", "workshop", "study", "grow", "career", "ai", "excel", "design", "speaking", "develop", "upskill"],
    packageName: "Skill Recharge",
    taglines: ["Level up and refuel", "Invest in yourself"],
  },
  travel: {
    need: "travel",
    categories: ["travel", "food", "telecom"],
    keywords: ["travel", "trip", "escape", "away", "coast", "riviera", "getaway", "beach", "nature", "explore", "weekend away", "vacation", "holiday", "sea"],
    packageName: "Weekend Escape",
    taglines: ["Get out of the city", "A taste of the coast"],
  },
  telecom: {
    need: "telecom",
    categories: ["telecom"],
    keywords: ["data", "mobile", "internet", "phone", "sim", "connectivity", "gigabytes", "gb"],
    packageName: "Stay Connected",
    taglines: ["Never drop a signal", "Data that keeps up"],
  },
  general: {
    need: "general",
    categories: ["wellness", "food", "learning"],
    keywords: [],
    packageName: "Tirana Picks",
    taglines: ["Hand-picked for you", "A little of everything you love"],
  },
};

const TIME_KEYWORDS: { ctx: ConciergeIntent["timeContext"]; words: string[] }[] = [
  { ctx: "weekend", words: ["weekend", "saturday", "sunday", "sat ", "sun "] },
  { ctx: "evening", words: ["evening", "tonight", "after work", "night", "late"] },
  { ctx: "weekday", words: ["weekday", "during the week", "lunch break", "workday", "monday", "tuesday", "wednesday", "thursday", "friday"] },
];

const PRIORITY_NEED: Record<QuestionnaireAnswer["priority"], ConciergeIntent["primaryNeed"]> = {
  wellness: "relaxation",
  learning: "learning",
  travel: "travel",
  balance: "general",
};

/** Parse a natural-language request into a structured intent (deterministic). */
export function parseIntent(
  text: string,
  employee: Employee,
  questionnaire?: QuestionnaireAnswer,
): ConciergeIntent {
  const lower = ` ${text.toLowerCase()} `;

  // Budget cap: "under 12000", "below 12k", "max 8000", "less than 10,000 ALL".
  let budgetCap: number | null = null;
  const capMatch = lower.match(/(?:under|below|max|less than|up to|within|budget of|around|about)\s*€?\$?\s*([0-9][0-9.,]*)\s*(k|all|lek|eur|€)?/);
  if (capMatch) {
    budgetCap = normalizeAmount(capMatch[1], capMatch[2]);
  } else {
    const bareK = lower.match(/\b([0-9]{1,3})\s*k\b/);
    if (bareK) budgetCap = parseInt(bareK[1], 10) * 1000;
  }

  // Time context.
  let timeContext: ConciergeIntent["timeContext"] = "anytime";
  for (const t of TIME_KEYWORDS) {
    if (t.words.some((w) => lower.includes(w))) {
      timeContext = t.ctx;
      break;
    }
  }

  // Primary need by keyword hit count.
  let best: { need: ConciergeIntent["primaryNeed"]; score: number } = { need: "general", score: 0 };
  const matchedKeywords: string[] = [];
  (Object.keys(NEEDS) as ConciergeIntent["primaryNeed"][]).forEach((need) => {
    if (need === "general") return;
    let score = 0;
    for (const kw of NEEDS[need].keywords) {
      if (lower.includes(kw)) {
        score += 1;
        matchedKeywords.push(kw);
      }
    }
    if (score > best.score) best = { need, score };
  });

  // The text wins; the questionnaire fills the gaps (the "memory" of the AI).
  let need = best.score > 0 ? best.need : "general";
  if (need === "general" && questionnaire) {
    need = PRIORITY_NEED[questionnaire.priority];
  }

  // If the user didn't state timing, fall back to their stated preference.
  if (timeContext === "anytime" && questionnaire && questionnaire.timePreference !== "either") {
    timeContext = questionnaire.timePreference;
  }

  const baseCats =
    need === "general"
      ? (questionnaire?.preferredCategories.length
          ? questionnaire.preferredCategories
          : employee.preferences.length
            ? employee.preferences
            : NEEDS.general.categories)
      : NEEDS[need].categories;
  const categories = baseCats;

  // Confidence: blends keyword strength + whether budget/time/questionnaire helped.
  const confidence = Math.min(
    0.98,
    0.55 +
      best.score * 0.12 +
      (budgetCap ? 0.1 : 0) +
      (timeContext !== "anytime" ? 0.08 : 0) +
      (questionnaire?.completedAt ? 0.05 : 0),
  );

  return {
    primaryNeed: need,
    budgetCap,
    timeContext,
    categories,
    keywords: Array.from(new Set(matchedKeywords)),
    confidence: Number(confidence.toFixed(2)),
  };
}

function normalizeAmount(raw: string, unit?: string): number {
  const cleaned = raw.replace(/[.,](?=\d{3}\b)/g, "").replace(/,/g, "");
  let n = parseFloat(cleaned);
  if (Number.isNaN(n)) return 0;
  if (unit && unit.toLowerCase() === "k") n *= 1000;
  // A bare "12" almost certainly means 12k in ALL benefit context.
  if (!unit && n < 100) n *= 1000;
  return Math.round(n);
}

interface ScoredOffer {
  offer: Offer;
  score: number;
}

function scoreOffer(
  offer: Offer,
  intent: ConciergeIntent,
  employee: Employee,
  spec: NeedSpec,
  questionnaire?: QuestionnaireAnswer,
): number {
  let score = offer.popularity * 0.4;
  if (spec.categories.includes(offer.category)) score += 30;
  if (employee.preferences.includes(offer.category)) score += 18;
  // Keyword ↔ tag resonance.
  for (const tag of offer.tags) {
    if (intent.keywords.some((k) => k.includes(tag) || tag.includes(k))) score += 12;
  }
  // Time-of-use fit.
  if (intent.timeContext !== "anytime" && offer.availability.includes(intent.timeContext)) score += 14;
  // Gentle nudge toward fresh content for engagement.
  if (offer.isFresh) score += 4;
  // History affinity (already loved this kind of thing).
  if (employee.history.includes(offer.id)) score += 6;
  // Free-text interests resonance (e.g. "yoga", "climbing").
  if (employee.interests?.some((it) => offer.title.toLowerCase().includes(it.toLowerCase().split(" ")[0]) || offer.tags.includes(it.toLowerCase()))) {
    score += 8;
  }
  // Questionnaire personalization: preferred categories + high stress → calm picks.
  if (questionnaire) {
    if (questionnaire.preferredCategories.includes(offer.category)) score += 10;
    if (questionnaire.stressLevel >= 4 && offer.tags.some((t) => ["relax", "calm", "recovery"].includes(t))) {
      score += 10;
    }
    if (questionnaire.groupPreference === "team" && offer.tags.includes("social")) score += 6;
  }
  return score;
}

export interface AssembleOptions {
  maxItems?: number;
}

/**
 * Greedy, diversity-aware bundler. Picks a high-scoring anchor, then adds
 * complementary offers from *different providers and categories* while staying
 * under the effective budget — exactly the "smart packages across several
 * providers" the brief asks for.
 */
export function assemblePackage(
  intent: ConciergeIntent,
  employee: Employee,
  policy: EmployerPolicy,
  offers: Offer[],
  opts: AssembleOptions = {},
  questionnaire?: QuestionnaireAnswer,
): Package | null {
  const spec = NEEDS[intent.primaryNeed];
  const maxItems = opts.maxItems ?? 3;
  const effectiveBudget = Math.min(
    intent.budgetCap ?? employee.budgetRemaining,
    employee.budgetRemaining,
  );

  const eligible = offers
    .filter((o) => policy.allowedCategories.includes(o.category))
    .filter((o) => !policy.blockedCategories.includes(o.category))
    .filter((o) => o.price <= effectiveBudget);

  if (eligible.length === 0) return null;

  const scored: ScoredOffer[] = eligible
    .map((offer) => ({ offer, score: scoreOffer(offer, intent, employee, spec, questionnaire) }))
    .sort((a, b) => b.score - a.score);

  const chosen: Offer[] = [];
  const usedProviders = new Set<string>();
  const usedCategories = new Set<Category>();
  let spent = 0;

  // Coherence guard: a "relaxation" package must stay relaxing. We bundle ONLY
  // from the need's category set so the third pick can't drift into, say, a
  // learning workshop just because it was a fresh category to diversify into.
  const inSpec = (o: Offer) => spec.categories.includes(o.category);

  // Anchor: best-scoring in-spec offer (falls back to best overall only if the
  // need's categories have nothing eligible).
  const anchor = (scored.find((s) => inSpec(s.offer)) ?? scored[0]).offer;
  chosen.push(anchor);
  usedProviders.add(anchor.providerId);
  usedCategories.add(anchor.category);
  spent += anchor.price;

  // Complementary picks across DIFFERENT providers, preferring a new in-spec
  // category for variety, then any in-spec offer.
  while (chosen.length < maxItems) {
    if (usedProviders.size >= policy.maxProvidersPerPackage) break;
    const remaining = effectiveBudget - spent;
    const fits = ({ offer }: ScoredOffer) =>
      !chosen.includes(offer) && !usedProviders.has(offer.providerId) && offer.price <= remaining;

    // Tier 1: new in-spec category. Tier 2: any in-spec offer.
    const pickScored =
      scored.find((s) => fits(s) && inSpec(s.offer) && !usedCategories.has(s.offer.category)) ??
      scored.find((s) => fits(s) && inSpec(s.offer));
    if (!pickScored) break;

    const pick = pickScored.offer;
    chosen.push(pick);
    usedProviders.add(pick.providerId);
    usedCategories.add(pick.category);
    spent += pick.price;
  }

  // A package only earns the name "package" if it works; a single strong offer
  // is still a valid result for tight budgets.
  return buildPackageFromOffers(chosen, intent, employee, spec, "ai");
}

export function buildPackageFromOffers(
  offers: Offer[],
  intent: ConciergeIntent,
  employee: Employee,
  spec: NeedSpec,
  source: Package["source"],
): Package {
  const items = offers
    .slice()
    // Sensible flow: movement/experience first, food last.
    .sort((a, b) => categoryFlowRank(a.category) - categoryFlowRank(b.category))
    .map((o, i) => ({ offerId: o.id, providerId: o.providerId, price: o.price, sortOrder: i }));

  const total = items.reduce((s, i) => s + i.price, 0);
  const categoryTags = Array.from(new Set(offers.map((o) => o.category)));
  const seed = `${spec.packageName}-${employee.id}-${total}`;
  const tagline = spec.taglines[Math.abs(hashString(seed)) % spec.taglines.length];

  return {
    id: `pkg_ai_${Math.abs(hashString(seed)).toString(36)}`,
    source,
    title: spec.packageName,
    tagline,
    reason: buildReason(offers, intent, employee, spec),
    items,
    total,
    currency: employee.currency ?? "ALL",
    categoryTags,
    heroSeed: seed,
    confidence: intent.confidence,
  };
}

function categoryFlowRank(c: Category): number {
  const order: Category[] = ["fitness", "wellness", "learning", "travel", "health", "telecom", "food"];
  const idx = order.indexOf(c);
  return idx === -1 ? 99 : idx;
}

function buildReason(
  offers: Offer[],
  intent: ConciergeIntent,
  employee: Employee,
  spec: NeedSpec,
): string {
  const names = offers.map((o) => o.title);
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
  const timePhrase =
    intent.timeContext === "weekend"
      ? "for the weekend"
      : intent.timeContext === "evening"
        ? "for the evening"
        : intent.timeContext === "weekday"
          ? "to fit your week"
          : "for whenever suits you";
  const budgetPhrase = intent.budgetCap
    ? ` while staying under ${formatMoney(intent.budgetCap, "ALL")}`
    : "";
  const needPhrase =
    intent.primaryNeed === "general"
      ? `your preference for ${employee.preferences.map((p) => categoryLabel(p).toLowerCase()).join(" & ")}`
      : `your ask for something ${spec.need === "relaxation" ? "relaxing" : spec.need}`;
  return `Built around ${needPhrase} ${timePhrase}: ${list}${budgetPhrase}. Spread across ${
    new Set(offers.map((o) => o.providerId)).size
  } Tirana providers so every part of the experience is covered.`;
}

/** Build a couple of lighter alternatives for the "compare" rail. */
export function buildAlternatives(
  intent: ConciergeIntent,
  employee: Employee,
  policy: EmployerPolicy,
  offers: Offer[],
  exclude: Package | null,
  questionnaire?: QuestionnaireAnswer,
): Package[] {
  const alts: Package[] = [];
  const excludeIds = new Set(exclude?.items.map((i) => i.offerId) ?? []);

  // A leaner 2-item version.
  const lean = assemblePackage(
    intent,
    employee,
    policy,
    offers.filter((o) => !excludeIds.has(o.id)),
    { maxItems: 2 },
    questionnaire,
  );
  if (lean && lean.items.length >= 1) {
    lean.title = `${lean.title} · Lite`;
    lean.tagline = "A lighter, lower-cost take";
    alts.push(lean);
  }

  return alts.slice(0, 2);
}

/** Full deterministic concierge run: intent → package → policy → narration. */
export function runDeterministicConcierge(
  text: string,
  employee: Employee,
  policy: EmployerPolicy,
  offers: Offer[],
  providersById: Map<string, Provider>,
  questionnaire?: QuestionnaireAnswer,
): ConciergeResult {
  const intent = parseIntent(text, employee, questionnaire);
  const pkg = assemblePackage(intent, employee, policy, offers, {}, questionnaire);

  if (!pkg) {
    return {
      intent,
      package: null,
      alternatives: [],
      narration: [
        "Reading your request…",
        "Searching the Tirana catalog within your budget…",
        "No offer fits that budget yet — try raising it slightly.",
      ],
      policyStatus: "blocked",
      policyNotes: ["No catalog offer fits the requested budget."],
      remainingBudgetAfter: null,
      engine: "deterministic",
      fallbackMessage: "I couldn't find anything within that budget. Try a little higher?",
    };
  }

  const evaln = evaluatePackage(pkg, employee, policy);
  const alternatives = buildAlternatives(intent, employee, policy, offers, pkg, questionnaire);

  const providerNames = Array.from(new Set(pkg.items.map((i) => providersById.get(i.providerId)?.displayName ?? i.providerId)));
  const narration = [
    `Got it — you want something ${intent.primaryNeed === "general" ? "personalized" : intent.primaryNeed === "relaxation" ? "relaxing" : intent.primaryNeed}${intent.timeContext !== "anytime" ? ` for the ${intent.timeContext}` : ""}.`,
    questionnaire?.completedAt
      ? `Factoring in your profile — ${questionnaire.priority} priority, stress ${questionnaire.stressLevel}/5 — and your ${formatMoney(employee.budgetRemaining, employee.currency)} balance.`
      : intent.budgetCap
        ? `Working within ${formatMoney(intent.budgetCap, employee.currency)} of your ${formatMoney(employee.budgetRemaining, employee.currency)} balance.`
        : `Working within your ${formatMoney(employee.budgetRemaining, employee.currency)} balance.`,
    `Matching the Tirana catalog and bundling ${providerNames.join(" + ")}…`,
    `Here's “${pkg.title}” — ${formatMoney(pkg.total, pkg.currency)} total.`,
  ];

  return {
    intent,
    package: pkg,
    alternatives,
    narration,
    policyStatus: evaln.status,
    policyNotes: evaln.notes,
    remainingBudgetAfter: evaln.budgetRemainingAfter,
    engine: "deterministic",
    fallbackMessage: null,
  };
}

export { NEEDS };
