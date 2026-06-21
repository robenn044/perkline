import assert from "node:assert/strict";
import { test } from "node:test";
import { parseIntent, assemblePackage, runDeterministicConcierge } from "../src/lib/concierge";
import { evaluatePackage } from "../src/lib/policy";
import { buildInsight } from "../src/lib/insights";
import { buildSeed } from "../src/lib/seed";
import { isLikelyCryptoAddress, isLikelyIban, maskEmail, maskIban } from "../src/lib/payout-mask";
import { validateBic, validateCryptoAddress, validateIban } from "../src/lib/finance-validation";
import { decryptField, encryptField } from "../src/lib/crypto-vault";
import type { BenefitRequest, Employee, EmployerPolicy, Package, Provider } from "../src/lib/types";
import {
  approveRequest,
  getEmployee,
  getPackage,
  getPolicy,
  resetStore,
  submitRequest,
  updatePolicy,
} from "../src/lib/store";
import {
  createProviderDestinationDraft,
  switchProviderDestinationType,
} from "../src/lib/payment-destination";
import {
  employeePerxWalletDestinationSchema,
  paymentDestinationSchema,
} from "../src/lib/validation";
import { rewardsPayoutsEnabled } from "../src/lib/feature-flags";
import { runConcierge } from "../src/lib/ai-client";

const seed = buildSeed();
const elira = seed.employees.find((e) => e.id === "emp_elira") as Employee;
const policy = seed.policies[0] as EmployerPolicy;
const offers = seed.offers;
const providersById = new Map<string, Provider>(seed.providers.map((p) => [p.id, p]));

test("parseIntent extracts need, budget cap and time", () => {
  const intent = parseIntent("I'm stressed and want something relaxing under 12000 ALL this weekend", elira);
  assert.equal(intent.primaryNeed, "relaxation");
  assert.equal(intent.budgetCap, 12000);
  assert.equal(intent.timeContext, "weekend");
});

test("assemblePackage builds a multi-provider, in-budget, in-category bundle", () => {
  const intent = parseIntent("relaxing under 12000 ALL this weekend", elira);
  const pkg = assemblePackage(intent, elira, policy, offers);
  assert.ok(pkg, "expected a package");
  // within budget cap
  assert.ok(pkg!.total <= 12000);
  // multiple distinct providers (smart bundle)
  const providers = new Set(pkg!.items.map((i) => i.providerId));
  assert.ok(providers.size >= 2, "expected >= 2 providers");
  // relaxation stays in wellness/food — never drifts into learning, etc.
  for (const tag of pkg!.categoryTags) {
    assert.ok(["wellness", "food"].includes(tag), `unexpected category ${tag}`);
  }
});

test("canonical demo produces the Tirana Reset across 3 providers", () => {
  const result = runDeterministicConcierge(
    "I'm stressed and want something relaxing under 12000 ALL this weekend",
    elira,
    policy,
    offers,
    providersById,
  );
  assert.ok(result.package);
  assert.equal(result.package!.title, "Tirana Reset");
  assert.equal(result.package!.total, 9200);
  assert.equal(result.engine, "deterministic");
});

test("policy engine flags high-value as needs_approval and never overspends", () => {
  const intent = parseIntent("relaxing this weekend", elira);
  const pkg = assemblePackage(intent, elira, policy, offers)!;
  const evaln = evaluatePackage(pkg, elira, policy);
  assert.ok(["within_policy", "needs_approval"].includes(evaln.status));
  assert.equal(evaln.budgetRemainingAfter, elira.budgetRemaining - pkg.total);
  assert.ok(evaln.budgetRemainingAfter >= 0);
});

test("totals are always recomputed from items (no spoofing)", () => {
  const intent = parseIntent("a healthy week", elira);
  const pkg = assemblePackage(intent, elira, policy, offers)!;
  const sum = pkg.items.reduce((s, i) => s + i.price, 0);
  assert.equal(pkg.total, sum);
});

test("destination type switching clears stale dependent fields", () => {
  const bank = {
    ...createProviderDestinationDraft("provider_bank_settlement"),
    legalBusinessName: "Motive Studio sh.p.k.",
    iban: "AL47212110090000000235698741",
    bic: "NCBAALTX",
  };
  const paypal = switchProviderDestinationType(bank, "provider_paypal_business");
  assert.deepEqual(paypal, {
    type: "provider_paypal_business",
    currency: "ALL",
    verifiedBusinessEmail: "",
  });
  assert.equal("iban" in paypal, false);
  assert.equal("bic" in paypal, false);
  assert.equal("legalBusinessName" in paypal, false);
});

test("employee Perx Wallet has no financial input fields", () => {
  assert.equal(employeePerxWalletDestinationSchema.safeParse({ type: "employee_perx_wallet" }).success, true);
  assert.equal(
    employeePerxWalletDestinationSchema.safeParse({
      type: "employee_perx_wallet",
      iban: "AL47212110090000000235698741",
    }).success,
    false,
  );
  assert.equal(
    paymentDestinationSchema.safeParse({
      type: "employee_perx_wallet",
      cardNumber: "4242424242424242",
    }).success,
    false,
  );
});

test("rewards payouts module is hidden unless explicitly enabled", () => {
  const original = process.env.NEXT_PUBLIC_ENABLE_REWARDS_PAYOUTS;
  try {
    delete process.env.NEXT_PUBLIC_ENABLE_REWARDS_PAYOUTS;
    assert.equal(rewardsPayoutsEnabled(), false, "default demo hides the cash-payout module");
    process.env.NEXT_PUBLIC_ENABLE_REWARDS_PAYOUTS = "false";
    assert.equal(rewardsPayoutsEnabled(), false);
    process.env.NEXT_PUBLIC_ENABLE_REWARDS_PAYOUTS = "true";
    assert.equal(rewardsPayoutsEnabled(), true, "explicit opt-in enables it");
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_ENABLE_REWARDS_PAYOUTS;
    else process.env.NEXT_PUBLIC_ENABLE_REWARDS_PAYOUTS = original;
  }
});

test("request submission canonicalizes catalog ids and approval creates splits plus vouchers", () => {
  resetStore();
  const route = structuredClone(getPackage("pkg_reset")!);
  route.total = 1;
  route.currency = "USD";
  route.categoryTags = ["telecom"];
  route.items = route.items.map((item) => ({
    ...item,
    providerId: "prov_fake",
    price: 1,
  }));

  const submitted = submitRequest("emp_elira", route, "route", {
    userId: "usr_emp",
    name: "Elira Hoxha",
    role: "employee",
  });
  assert.equal(submitted.ok, true);
  assert.equal(submitted.request?.package.total, 9200);
  assert.equal(submitted.request?.package.currency, "ALL");
  assert.deepEqual(submitted.request?.package.categoryTags.sort(), ["food", "wellness"]);
  assert.ok(submitted.request?.package.items.every((item) => item.providerId !== "prov_fake"));

  const approved = approveRequest(submitted.request!.id, {
    userId: "usr_admin",
    name: "Besa Kola",
    role: "company_admin",
  });
  assert.equal(approved.ok, true);
  assert.equal(approved.request?.status, "voucher_ready");
  assert.equal(approved.request?.paymentSplits.length, 3);
  assert.equal(
    approved.request?.paymentSplits.reduce((sum, split) => sum + split.amount, 0),
    9200,
  );
  assert.ok(approved.request?.paymentSplits.every((split) => split.destinationId));
  assert.equal(approved.request?.vouchers.length, 3);
  assert.ok(approved.request?.vouchers.every((voucher) => voucher.redemptionSteps.length === 3));
  assert.equal(getEmployee("emp_elira")?.budgetRemaining, 9300);
});

test("policy blocks an ineligible catalog package server-side", () => {
  resetStore();
  updatePolicy(
    "cmp_albatech",
    { allowedCategories: ["food"] },
    { userId: "usr_admin", name: "Besa Kola", role: "company_admin" },
  );
  const route = structuredClone(getPackage("pkg_reset")!);
  const submitted = submitRequest("emp_elira", route, "route");
  assert.equal(submitted.ok, true);
  assert.equal(submitted.request?.status, "rejected");
  assert.equal(submitted.request?.policyStatus, "blocked");
  assert.ok(submitted.request?.policyNotes.some((note) => note.includes("outside policy")));
  assert.deepEqual(getPolicy("cmp_albatech")?.allowedCategories, ["food"]);
});

test("Perx Match returns catalog-only ids with deterministic fallback", async () => {
  const localSeed = buildSeed();
  const employee = localSeed.employees.find((item) => item.id === "emp_elira")!;
  const localPolicy = localSeed.policies[0];
  const result = await runConcierge(
    "something relaxing under 12000 ALL this weekend",
    employee,
    localPolicy,
    localSeed.offers,
    localSeed.providers,
    localSeed.questionnaires.find((item) => item.employeeId === employee.id),
    localSeed.packages,
  );
  assert.ok(result.package);
  const offerIds = new Set(localSeed.offers.map((offer) => offer.id));
  assert.ok(result.package!.items.every((item) => offerIds.has(item.offerId)));
  assert.equal(
    result.package!.total,
    result.package!.items.reduce((sum, item) => sum + item.price, 0),
  );
});

test("questionnaire personalizes a vague request via stored priority", () => {
  const q = seed.questionnaires.find((x) => x.employeeId === "emp_elira")!;
  // "surprise me" carries no need keyword; the wellness-priority profile should steer it.
  const intent = parseIntent("surprise me this weekend", elira, q);
  assert.equal(intent.primaryNeed, "relaxation");
  const pkg = assemblePackage(intent, elira, policy, offers, {}, q);
  assert.ok(pkg);
  for (const tag of pkg!.categoryTags) {
    assert.ok(["wellness", "food"].includes(tag), `unexpected category ${tag}`);
  }
});

test("payout masking never reveals full sensitive details", () => {
  const masked = maskIban("AL47212110090000000235698741");
  assert.ok(masked.endsWith("8741"));
  assert.ok(!masked.includes("21211009")); // middle digits hidden
  assert.equal(maskEmail("elira@example.com"), "e•••@example.com");
});

test("employer insights aggregate explainably from approved requests", () => {
  const employees = seed.employees;
  const pkg = seed.packages[0] as Package; // Tirana Reset — wellness + food
  const approved: BenefitRequest = {
    id: "req_t1",
    employeeId: elira.id,
    companyId: elira.companyId,
    package: pkg,
    status: "voucher_ready",
    policyStatus: "needs_approval",
    policyNotes: [],
    employerSummary: "",
    budgetRemainingAfter: elira.budgetRemaining - pkg.total,
    submittedAt: new Date().toISOString(),
    origin: "concierge",
    paymentSplits: pkg.items.map((i, n) => ({
      id: `s${n}`,
      requestId: "req_t1",
      providerId: i.providerId,
      providerName: i.providerId,
      destinationId: `dest_${i.providerId}`,
      destinationType: "provider_bank_settlement" as const,
      destinationDisplay: "Bank · AL•• •••• •••• •417",
      amount: i.price,
      currency: pkg.currency,
      status: "paid" as const,
      scheduledAt: new Date().toISOString(),
      paidAt: new Date().toISOString(),
    })),
    vouchers: [],
  };

  const empty = buildInsight("AlbaTech", employees, []);
  assert.ok(empty.unusedBudgetRate > 0 && empty.unusedBudgetRate <= 1);
  assert.ok(empty.recommendedActions.length > 0);

  const insight = buildInsight("AlbaTech", employees, [approved]);
  assert.equal(insight.totalApproved, 1);
  assert.equal(insight.totalRoutedToProviders, pkg.total);
  // Top category must come from the real package tags — no invented data.
  assert.ok(insight.topCategories.length > 0);
  assert.ok(["wellness", "food"].includes(insight.topCategories[0].category));
});

test("payout validation rejects malformed IBAN / wrong-network address", () => {
  assert.equal(isLikelyIban("AL47212110090000000235698741"), true);
  assert.equal(isLikelyIban("not-an-iban"), false);
  assert.equal(isLikelyCryptoAddress("0x1111aAaa2222BbBb3333cCcc4444dDdd5555eEeE", "ETH-Sepolia"), true);
  assert.equal(isLikelyCryptoAddress("0xZZZZ", "ETH-Sepolia"), false);
  // An EVM address is not valid on the BTC testnet.
  assert.equal(isLikelyCryptoAddress("0x1111aAaa2222BbBb3333cCcc4444dDdd5555eEeE", "BTC-Testnet"), false);
});

test("IBAN: ISO 7064 MOD-97-10 checksum is enforced", () => {
  assert.equal(validateIban("AL47212110090000000235698741").valid, true);
  assert.equal(validateIban("DE89370400440532013000").valid, true);
  // Flip a digit → checksum must fail.
  assert.equal(validateIban("AL47212110090000000235698742").valid, false);
  // Wrong length for country → fail.
  assert.equal(validateIban("AL4721211009").valid, false);
});

test("BIC: ISO 9362 structure validated", () => {
  assert.equal(validateBic("NCBAALTX").valid, true);
  assert.equal(validateBic("DEUTDEFF500").valid, true);
  assert.equal(validateBic("BAD1").valid, false);
});

test("crypto: real chain-aware checksums (EIP-55, bech32)", () => {
  // Canonical EIP-55 checksummed address.
  assert.equal(validateCryptoAddress("0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed", "ETH-Sepolia").valid, true);
  // All-lowercase is accepted (no checksum case).
  assert.equal(validateCryptoAddress("0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed", "ETH-Sepolia").valid, true);
  // Corrupt the checksum case → reject.
  assert.equal(validateCryptoAddress("0x5AAeb6053F3E94C9b9A09f33669435E7Ef1BeAed", "ETH-Sepolia").valid, false);
  // BIP-173 testnet bech32 vector.
  assert.equal(validateCryptoAddress("tb1qrp33g0q5c5txsp9arysrx4k6zdkfs4nce4xj0gdcccefvpysxf3q0sl5k7", "BTC-Testnet").valid, true);
});

test("encryption at rest: AES-256-GCM round-trips and detects tampering", () => {
  const secret = "ppl_tok_secret_value_123";
  const token = encryptField(secret);
  assert.notEqual(token, secret);
  assert.equal(decryptField(token), secret);
  // Tampered ciphertext fails the auth tag → null (no plaintext leak).
  const tampered = token.slice(0, -2) + (token.endsWith("a") ? "bb" : "aa");
  assert.equal(decryptField(tampered), null);
});
