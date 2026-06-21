import { evaluatePackage } from "./policy";
import { getPayoutAdapter, maskAddress, maskEmail, maskIban, signEvent } from "./payout-engine";
import { validateBic, validateCryptoAddress, validateIban } from "./finance-validation";
import {
  countryRequiresBic,
  paymentDestinationDisplay,
  type ProviderDestinationDraft,
} from "./payment-destination";
import {
  assetSupportedOnNetwork,
  bankCurrencySupported,
  countrySupported,
  getRailStatus,
  livePayoutsEnabled,
} from "./finance-config";
import { buildSeed, type SeedData } from "./seed";
import type {
  ActivityEvent,
  ActorType,
  AuditAction,
  AuditEvent,
  BalanceLedgerEntry,
  BankAccountType,
  BenefitRequest,
  BonusCampaign,
  BonusPayout,
  BonusTemplate,
  Category,
  Company,
  CompanyFundingSource,
  ComplianceCase,
  CryptoNetwork,
  CurrencyCode,
  Employee,
  EmployerPolicy,
  LedgerEntryType,
  Market,
  Notification,
  Offer,
  Package,
  PaymentDestination,
  PaymentSplit,
  ProviderPaymentDestination,
  PayoutAttempt,
  PayoutEnvironment,
  PayoutEvent,
  PayoutEventType,
  PayoutMethod,
  PayoutMethodType,
  PayoutMethodVerification,
  PayoutStatus,
  Provider,
  QuestionnaireAnswer,
  RequestStatus,
  User,
  UserRole,
  VerificationAttempt,
  Voucher,
  WebhookEvent,
} from "./types";
import { nid, voucherCode } from "./utils";

/** Amount at/above which a payout requires two distinct approvers (dual control). */
export const DUAL_APPROVAL_THRESHOLD = 50000;

/** Identifies who performed a mutation, for the audit trail. */
export interface Actor {
  userId: string;
  name: string;
  role: UserRole | "system";
}

export const SYSTEM_ACTOR: Actor = { userId: "system", name: "System", role: "system" };

/**
 * In-memory data store kept on globalThis so it survives Next.js dev hot-reloads
 * and is shared across all route handlers / server components in the single Node
 * process. No database setup means the demo is impossible to misconfigure, and
 * the reset endpoint restores a pristine seed in milliseconds.
 */

interface DB extends SeedData {
  requests: BenefitRequest[];
}

declare global {
  // eslint-disable-next-line no-var
  var __perxDb: DB | undefined;
}

function freshDb(): DB {
  return { ...buildSeed(), requests: [] };
}

function db(): DB {
  if (!globalThis.__perxDb) {
    globalThis.__perxDb = freshDb();
  }
  return globalThis.__perxDb;
}

export function resetStore(): void {
  globalThis.__perxDb = freshDb();
}

// ---------------------------------------------------------------------------
// Read accessors
// ---------------------------------------------------------------------------

export const getMarkets = (): Market[] => db().markets;
export const getMarket = (id: string): Market | undefined => db().markets.find((m) => m.id === id);
export const getDefaultMarket = (): Market => db().markets[0];

export const getCompanies = (): Company[] => db().companies;
export const getCompany = (id: string): Company | undefined => db().companies.find((c) => c.id === id);

export const getEmployees = (): Employee[] => db().employees;
export const getEmployee = (id: string): Employee | undefined =>
  db().employees.find((e) => e.id === id);

export const getPolicy = (companyId: string): EmployerPolicy | undefined =>
  db().policies.find((p) => p.companyId === companyId);

export const getProviders = (): Provider[] => db().providers;
export const getProvider = (id: string): Provider | undefined =>
  db().providers.find((p) => p.id === id);

export const getOffers = (): Offer[] => db().offers;
export const getOffer = (id: string): Offer | undefined => db().offers.find((o) => o.id === id);
export const getOffersByProvider = (providerId: string): Offer[] =>
  db().offers.filter((o) => o.providerId === providerId);

export const getCuratedPackages = (): Package[] =>
  db().packages.filter((p) => p.source === "curated");
export const getPackage = (id: string): Package | undefined =>
  db().packages.find((p) => p.id === id);

export const getRequests = (): BenefitRequest[] =>
  [...db().requests].sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
export const getRequest = (id: string): BenefitRequest | undefined =>
  db().requests.find((r) => r.id === id);
export const getRequestsByEmployee = (employeeId: string): BenefitRequest[] =>
  getRequests().filter((r) => r.employeeId === employeeId);
export const getRequestsByCompany = (companyId: string): BenefitRequest[] =>
  getRequests().filter((r) => r.companyId === companyId);
export const getPendingRequests = (companyId: string): BenefitRequest[] =>
  getRequestsByCompany(companyId).filter((r) => r.status === "pending");

export const getActivity = (limit = 20): ActivityEvent[] =>
  [...db().activity].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);

// --- Users / auth ---
export const getUsers = (): User[] => db().users;
export const getUserByEmail = (email: string): User | undefined =>
  db().users.find((u) => u.email.toLowerCase() === email.toLowerCase());
export const getUserById = (id: string): User | undefined => db().users.find((u) => u.id === id);
export const getUsersByCompanyRole = (companyId: string, role: UserRole): User[] =>
  db().users.filter((u) => u.companyId === companyId && u.role === role);

// --- Canonical benefit / provider settlement destinations ---
export const getPaymentDestinations = (): PaymentDestination[] => db().paymentDestinations;
export const getEmployeePerxWallet = (employeeId: string): PaymentDestination | undefined =>
  db().paymentDestinations.find(
    (destination) =>
      destination.ownerType === "employee" &&
      destination.ownerId === employeeId &&
      destination.type === "employee_perx_wallet",
  );
export const getProviderPaymentDestination = (
  providerId: string,
): ProviderPaymentDestination | undefined =>
  db().paymentDestinations.find(
    (destination): destination is ProviderPaymentDestination =>
      destination.ownerType === "provider" && destination.ownerId === providerId,
  );
export const getProviderPaymentDestinations = (): ProviderPaymentDestination[] =>
  db().paymentDestinations.filter(
    (destination): destination is ProviderPaymentDestination =>
      destination.ownerType === "provider",
  );

// --- Questionnaire ---
export const getQuestionnaire = (employeeId: string): QuestionnaireAnswer | undefined =>
  db().questionnaires.find((q) => q.employeeId === employeeId);

// --- Audit trail ---
export const getAudit = (companyId?: string, limit = 50): AuditEvent[] => {
  let list = [...db().audit];
  if (companyId) {
    const userIds = new Set(db().users.filter((u) => u.companyId === companyId).map((u) => u.id));
    list = list.filter((a) => a.actorRole === "system" || userIds.has(a.actorUserId));
  }
  return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
};

export function getSplitsForProvider(providerId: string): {
  split: PaymentSplit;
  request: BenefitRequest;
}[] {
  const out: { split: PaymentSplit; request: BenefitRequest }[] = [];
  for (const r of getRequests()) {
    for (const s of r.paymentSplits) {
      if (s.providerId === providerId) out.push({ split: s, request: r });
    }
  }
  return out;
}

export function getVouchersForProvider(providerId: string): {
  voucher: Voucher;
  request: BenefitRequest;
}[] {
  const out: { voucher: Voucher; request: BenefitRequest }[] = [];
  for (const r of getRequests()) {
    for (const v of r.vouchers) {
      if (v.providerId === providerId) out.push({ voucher: v, request: r });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Activity helper
// ---------------------------------------------------------------------------

function logActivity(
  actorType: ActorType,
  actorId: string,
  eventType: string,
  message: string,
  requestId?: string,
): void {
  db().activity.push({
    id: nid("act"),
    actorType,
    actorId,
    eventType,
    message,
    requestId,
    createdAt: new Date().toISOString(),
  });
}

/** Append to the compliance audit trail. */
export function logAudit(actor: Actor, action: AuditAction, summary: string, requestId?: string): void {
  db().audit.push({
    id: nid("audit"),
    actorUserId: actor.userId,
    actorName: actor.name,
    actorRole: actor.role,
    action,
    summary,
    requestId,
    createdAt: new Date().toISOString(),
  });
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export interface SubmitResult {
  ok: boolean;
  request?: BenefitRequest;
  error?: string;
}

export interface CanonicalPackageResult {
  ok: boolean;
  package?: Package;
  error?: string;
}

/**
 * Rebuild a package from the seeded catalog. Client/model prices, providers,
 * category tags, currency and totals are treated only as untrusted hints.
 */
export function canonicalizePackage(pkg: Package): CanonicalPackageResult {
  if (!pkg.items?.length) return { ok: false, error: "Package has no items." };

  const seen = new Set<string>();
  const offers: Offer[] = [];
  for (const item of pkg.items) {
    if (seen.has(item.offerId)) return { ok: false, error: "A package cannot repeat an offer." };
    const offer = getOffer(item.offerId);
    if (!offer) return { ok: false, error: `Unknown catalog offer: ${item.offerId}.` };
    const provider = getProvider(offer.providerId);
    if (!provider || provider.status !== "active") {
      return { ok: false, error: `Offer ${offer.id} is not currently available.` };
    }
    seen.add(item.offerId);
    offers.push(offer);
  }

  const currencies = new Set(offers.map((offer) => offer.currency));
  if (currencies.size !== 1) return { ok: false, error: "Package items must use one currency." };

  const items = offers.map((offer, index) => ({
    offerId: offer.id,
    providerId: offer.providerId,
    price: offer.price,
    sortOrder: index,
  }));
  const total = items.reduce((sum, item) => sum + item.price, 0);

  return {
    ok: true,
    package: {
      ...pkg,
      items,
      total,
      currency: offers[0].currency,
      categoryTags: Array.from(new Set(offers.map((offer) => offer.category))),
    },
  };
}

/** Employee submits a package (curated or AI-generated) for employer approval. */
export function submitRequest(
  employeeId: string,
  pkg: Package,
  origin: BenefitRequest["origin"] = "offer",
  actor?: Actor,
): SubmitResult {
  const employee = getEmployee(employeeId);
  if (!employee) return { ok: false, error: "Unknown employee." };
  const policy = getPolicy(employee.companyId);
  if (!policy) return { ok: false, error: "No employer policy configured." };

  const canonical = canonicalizePackage(pkg);
  if (!canonical.ok || !canonical.package) return { ok: false, error: canonical.error };
  const serverPackage = canonical.package;
  const evaln = evaluatePackage(serverPackage, employee, policy);

  const request: BenefitRequest = {
    id: nid("req"),
    employeeId,
    companyId: employee.companyId,
    package: { ...serverPackage, id: serverPackage.id || nid("pkg") },
    status: evaln.status === "blocked" ? "rejected" : "pending",
    policyStatus: evaln.status,
    policyNotes: evaln.notes,
    employerSummary: evaln.employerSummary,
    budgetRemainingAfter: evaln.budgetRemainingAfter,
    submittedAt: new Date().toISOString(),
    decisionReason: evaln.status === "blocked" ? "Auto-rejected: outside policy." : undefined,
    decidedAt: evaln.status === "blocked" ? new Date().toISOString() : undefined,
    origin,
    paymentSplits: [],
    vouchers: [],
  };

  db().requests.push(request);
  logActivity(
    "employee",
    employeeId,
    "request_submitted",
    `${employee.name} submitted "${serverPackage.title}" for approval.`,
    request.id,
  );
  logAudit(
    actor ?? { userId: employeeId, name: employee.name, role: "employee" },
    "request_submitted",
    `Submitted "${serverPackage.title}" (${serverPackage.total} ${serverPackage.currency}) for approval.`,
    request.id,
  );

  if (evaln.status === "within_policy") {
    const autoApproved = approveRequest(
      request.id,
      SYSTEM_ACTOR,
      `Auto-approved under the ${policy.approvalThreshold} ${policy.currency} policy threshold.`,
    );
    if (autoApproved.ok && autoApproved.request) {
      return { ok: true, request: autoApproved.request };
    }
  }

  return { ok: true, request };
}

export interface DecisionResult {
  ok: boolean;
  request?: BenefitRequest;
  error?: string;
}

/**
 * Employer approves a request. This is atomic and deterministic: it deducts the
 * employee budget, creates one PaymentSplit per provider, settles them, and
 * issues one voucher per package item. The employer UI replays the settlement
 * as a routing animation — but the data is already consistent, so nothing can
 * desync mid-demo.
 */
export function approveRequest(requestId: string, actor: Actor, comment?: string): DecisionResult {
  const request = getRequest(requestId);
  if (!request) return { ok: false, error: "Request not found." };
  if (request.status !== "pending") {
    return { ok: false, error: `Request is already ${request.status}.` };
  }
  const employee = getEmployee(request.employeeId);
  if (!employee) return { ok: false, error: "Employee not found." };

  const policy = getPolicy(request.companyId);
  if (!policy) return { ok: false, error: "Employer policy not found." };
  const canonical = canonicalizePackage(request.package);
  if (!canonical.ok || !canonical.package) return { ok: false, error: canonical.error };
  request.package = canonical.package;
  const currentPolicy = evaluatePackage(request.package, employee, policy);
  if (currentPolicy.status === "blocked") {
    return { ok: false, error: currentPolicy.notes.join(" ") };
  }

  if (request.package.total > employee.budgetRemaining) {
    return { ok: false, error: "Insufficient remaining budget." };
  }

  const now = new Date().toISOString();

  // Group package items by provider → one split per provider. Splits land in a
  // terminal "paid" state (tokenized/simulated payout); the UI animates the
  // pending → processing → paid progression, but the data is always consistent.
  const byProvider = new Map<string, number>();
  for (const item of request.package.items) {
    byProvider.set(item.providerId, (byProvider.get(item.providerId) ?? 0) + item.price);
  }

  const splits: PaymentSplit[] = [];
  for (const [providerId, amount] of byProvider) {
    const provider = getProvider(providerId);
    const destination = getProviderPaymentDestination(providerId);
    if (!provider || !destination || destination.status === "disabled") {
      return { ok: false, error: `Provider ${provider?.displayName ?? providerId} has no active settlement destination.` };
    }
    splits.push({
      id: nid("split"),
      requestId: request.id,
      providerId,
      providerName: provider?.displayName ?? providerId,
      destinationId: destination.id,
      destinationType: destination.type,
      destinationDisplay: paymentDestinationDisplay(destination),
      amount,
      currency: request.package.currency,
      status: "paid",
      scheduledAt: now,
      paidAt: now,
    });
  }

  // One voucher per package item (per booked experience).
  const vouchers: Voucher[] = request.package.items.map((item) => {
    const offer = getOffer(item.offerId);
    const provider = getProvider(item.providerId);
    return {
      id: nid("vch"),
      requestId: request.id,
      providerId: item.providerId,
      providerName: provider?.displayName ?? item.providerId,
      offerTitle: offer?.title ?? item.offerId,
      code: voucherCode(`${request.id}-${item.offerId}`),
      status: "issued",
      issuedAt: now,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(),
      redemptionSteps: [
        `Book or arrive with ${provider?.displayName ?? item.providerId}.`,
        "Show the QR code or voucher code before the service begins.",
        "The provider confirms redemption in Perkline; no payment is due from you.",
      ],
      supportContact: "support@perkline.demo",
    };
  });

  // Deduct budget, attach artifacts, advance status to voucher_ready.
  employee.budgetRemaining = Math.max(0, employee.budgetRemaining - request.package.total);
  request.paymentSplits = splits;
  request.vouchers = vouchers;
  request.status = "voucher_ready";
  request.decidedAt = now;
  request.decidedByName = actor.name;
  request.decisionComment = comment?.trim() || undefined;

  logActivity(
    "employer",
    request.companyId,
    "request_approved",
    `Approved "${request.package.title}" — routed ${formatTotal(request)} to ${splits.length} provider${
      splits.length > 1 ? "s" : ""
    }.`,
    request.id,
  );
  logAudit(
    actor,
    "request_approved",
    `Approved "${request.package.title}" for ${employee.name}; routed ${formatTotal(request)} to ${splits.length} provider(s).`,
    request.id,
  );
  for (const s of splits) {
    logActivity(
      "system",
      s.providerId,
      "payment_routed",
      `Paid ${s.amount} ${s.currency} to ${s.providerName}.`,
      request.id,
    );
    logAudit(SYSTEM_ACTOR, "payment_routed", `Routed ${s.amount} ${s.currency} to ${s.providerName}.`, request.id);
  }

  return { ok: true, request };
}

function formatTotal(request: BenefitRequest): string {
  return `${request.package.total} ${request.package.currency}`;
}

export function rejectRequest(requestId: string, actor: Actor, comment?: string): DecisionResult {
  const request = getRequest(requestId);
  if (!request) return { ok: false, error: "Request not found." };
  if (request.status !== "pending") {
    return { ok: false, error: `Request is already ${request.status}.` };
  }
  request.status = "rejected";
  request.decidedAt = new Date().toISOString();
  request.decidedByName = actor.name;
  request.decisionComment = comment?.trim() || undefined;
  request.decisionReason = comment?.trim() || "Not approved at this time.";
  logActivity("employer", request.companyId, "request_rejected", `Rejected "${request.package.title}".`, request.id);
  logAudit(actor, "request_rejected", `Rejected "${request.package.title}"${comment ? ` — ${comment}` : ""}.`, request.id);
  return { ok: true, request };
}

export interface RedeemResult {
  ok: boolean;
  voucher?: Voucher;
  error?: string;
}

/** Provider marks a voucher redeemed; employee earns points + streak progress. */
export function redeemVoucher(voucherId: string): RedeemResult {
  for (const r of db().requests) {
    const voucher = r.vouchers.find((v) => v.id === voucherId);
    if (!voucher) continue;
    if (voucher.status === "redeemed") {
      return { ok: false, error: "Voucher already redeemed." };
    }
    voucher.status = "redeemed";
    voucher.redeemedAt = new Date().toISOString();

    // Engagement reward.
    const employee = getEmployee(r.employeeId);
    if (employee) {
      employee.points += 25;
      // A fully-redeemed package nudges the wellness streak.
      if (r.vouchers.every((v) => v.status === "redeemed")) {
        employee.streakWeeks += 1;
      }
    }

    logActivity(
      "provider",
      voucher.providerId,
      "voucher_redeemed",
      `${voucher.providerName} redeemed voucher ${voucher.code} (${voucher.offerTitle}).`,
      r.id,
    );
    logAudit(
      { userId: voucher.providerId, name: voucher.providerName, role: "system" },
      "voucher_redeemed",
      `Voucher ${voucher.code} (${voucher.offerTitle}) redeemed at ${voucher.providerName}.`,
      r.id,
    );
    return { ok: true, voucher };
  }
  return { ok: false, error: "Voucher not found." };
}

// ---------------------------------------------------------------------------
// Canonical payment destinations
// ---------------------------------------------------------------------------

export interface SaveProviderPaymentDestinationResult {
  ok: boolean;
  destination?: ProviderPaymentDestination;
  error?: string;
}

export function saveProviderPaymentDestination(
  providerId: string,
  input: ProviderDestinationDraft,
  actor: Actor,
): SaveProviderPaymentDestinationResult {
  const provider = getProvider(providerId);
  if (!provider) return { ok: false, error: "Provider not found." };
  const now = new Date().toISOString();
  let destination: ProviderPaymentDestination;

  if (input.type === "provider_bank_settlement") {
    const iban = validateIban(input.iban);
    if (!iban.valid) return { ok: false, error: iban.reason ?? "Invalid IBAN." };
    if (countryRequiresBic(input.country) && !input.bic.trim()) {
      return { ok: false, error: "BIC/SWIFT is required for this country." };
    }
    if (input.bic.trim()) {
      const bic = validateBic(input.bic);
      if (!bic.valid) return { ok: false, error: bic.reason ?? "Invalid BIC/SWIFT." };
    }
    destination = {
      id: `dest_bank_${Math.random().toString(36).slice(2, 10)}`,
      ownerId: providerId,
      ownerType: "provider",
      type: input.type,
      legalBusinessName: input.legalBusinessName.trim(),
      country: input.country.trim().toUpperCase(),
      currency: input.currency,
      ibanMask: maskIban(input.iban),
      bic: input.bic.trim().toUpperCase() || undefined,
      status: "active",
      createdAt: now,
      updatedAt: now,
    };
  } else if (input.type === "provider_paypal_business") {
    destination = {
      id: `dest_paypal_${Math.random().toString(36).slice(2, 10)}`,
      ownerId: providerId,
      ownerType: "provider",
      type: input.type,
      currency: input.currency,
      connectionState: "connected",
      verifiedBusinessEmailMask: maskEmail(input.verifiedBusinessEmail),
      status: "connected",
      createdAt: now,
      updatedAt: now,
    };
  } else {
    destination = {
      id: `dest_processor_${Math.random().toString(36).slice(2, 10)}`,
      ownerId: providerId,
      ownerType: "provider",
      type: input.type,
      currency: input.currency,
      processor: "TeamSystem Payments Demo",
      connectionState: "connected",
      hostedAccountToken: `acct_demo_${Math.random().toString(36).slice(2, 10)}`,
      status: "connected",
      createdAt: now,
      updatedAt: now,
    };
  }

  db().paymentDestinations = db().paymentDestinations.filter(
    (existing) => !(existing.ownerType === "provider" && existing.ownerId === providerId),
  );
  db().paymentDestinations.push(destination);
  logAudit(
    actor,
    "payment_destination_updated",
    `Updated ${provider.displayName} settlement destination to ${paymentDestinationDisplay(destination)}.`,
  );
  return { ok: true, destination };
}

// ---------------------------------------------------------------------------
// Questionnaire & profile
// ---------------------------------------------------------------------------

export function saveQuestionnaire(employeeId: string, answer: Omit<QuestionnaireAnswer, "employeeId" | "completedAt">, actor: Actor): QuestionnaireAnswer {
  const completed: QuestionnaireAnswer = { ...answer, employeeId, completedAt: new Date().toISOString() };
  const idx = db().questionnaires.findIndex((q) => q.employeeId === employeeId);
  if (idx >= 0) db().questionnaires[idx] = completed;
  else db().questionnaires.push(completed);
  // Mirror preferred categories into the employee's preference profile.
  const employee = getEmployee(employeeId);
  if (employee && answer.preferredCategories.length) {
    employee.preferences = answer.preferredCategories;
  }
  logAudit(actor, "questionnaire_saved", "Updated personalization questionnaire.");
  return completed;
}

export interface ProfileUpdate {
  name?: string;
  role?: string;
  department?: string;
  locale?: Employee["locale"];
  currency?: Employee["currency"];
  interests?: string[];
  preferences?: Category[];
}

export function updateEmployeeProfile(employeeId: string, update: ProfileUpdate): Employee | undefined {
  const employee = getEmployee(employeeId);
  if (!employee) return undefined;
  if (update.name !== undefined) employee.name = update.name;
  if (update.role !== undefined) employee.role = update.role;
  if (update.department !== undefined) employee.department = update.department;
  if (update.locale !== undefined) employee.locale = update.locale;
  if (update.currency !== undefined) employee.currency = update.currency;
  if (update.interests !== undefined) employee.interests = update.interests;
  if (update.preferences !== undefined) employee.preferences = update.preferences;
  return employee;
}

// ---------------------------------------------------------------------------
// Policy management (admin)
// ---------------------------------------------------------------------------

export interface PolicyUpdate {
  monthlyLimit?: number;
  approvalThreshold?: number;
  allowedCategories?: Category[];
  maxProvidersPerPackage?: number;
}

export function updatePolicy(companyId: string, update: PolicyUpdate, actor: Actor): EmployerPolicy | undefined {
  const policy = getPolicy(companyId);
  if (!policy) return undefined;
  if (update.monthlyLimit !== undefined) policy.monthlyLimit = update.monthlyLimit;
  if (update.approvalThreshold !== undefined) policy.approvalThreshold = update.approvalThreshold;
  if (update.allowedCategories !== undefined) {
    policy.allowedCategories = update.allowedCategories;
    const all: Category[] = ["wellness", "food", "learning", "health", "fitness", "travel", "telecom"];
    policy.blockedCategories = all.filter((c) => !update.allowedCategories!.includes(c));
  }
  if (update.maxProvidersPerPackage !== undefined) policy.maxProvidersPerPackage = update.maxProvidersPerPackage;
  logAudit(actor, "policy_updated", "Updated employer benefit policy.");
  return policy;
}

export function updateProviderStatus(
  providerId: string,
  status: Provider["status"],
  actor: Actor,
): Provider | undefined {
  const provider = getProvider(providerId);
  if (!provider) return undefined;
  provider.status = status;
  logAudit(actor, "provider_status_updated", `Set ${provider.displayName} provider status to ${status}.`);
  return provider;
}

/** Filter helper for the admin queue. */
export function getRequestsByStatus(companyId: string, status: RequestStatus | "all"): BenefitRequest[] {
  const all = getRequestsByCompany(companyId);
  if (status === "all") return all;
  if (status === "paid") return all.filter((r) => r.status === "paid" || r.status === "voucher_ready");
  return all.filter((r) => r.status === status);
}

// ===========================================================================
// Perkline Bonus — payout methods, campaigns, payouts, engine orchestration
// ===========================================================================

// --- Notifications ---
export const getNotifications = (userId: string, limit = 20): Notification[] =>
  db().notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);

function notify(userId: string, type: Notification["type"], title: string, body: string, link?: string): void {
  db().notifications.push({ id: nid("ntf"), userId, type, title, body, link, read: false, createdAt: new Date().toISOString() });
}

// --- Payout methods (employee-owned destinations) ---
export const getPayoutMethods = (employeeId: string): PayoutMethod[] =>
  db().payoutMethods.filter((m) => m.employeeId === employeeId);
export const getPayoutMethod = (id: string): PayoutMethod | undefined =>
  db().payoutMethods.find((m) => m.id === id);
export const getVerifiedPayoutMethods = (employeeId: string): PayoutMethod[] =>
  getPayoutMethods(employeeId).filter((m) => m.status === "verified");
/** Usable for payouts = verified and not disabled. */
export const getUsablePayoutMethods = (employeeId: string): PayoutMethod[] =>
  getVerifiedPayoutMethods(employeeId).filter((m) => !m.disabled);
export const getDefaultPayoutMethod = (employeeId: string): PayoutMethod | undefined =>
  getUsablePayoutMethods(employeeId).find((m) => m.isDefault) ?? getUsablePayoutMethods(employeeId)[0];

export interface AddPayoutMethodInput {
  type: PayoutMethodType;
  label: string;
  currency: CurrencyCode;
  // bank
  holderName?: string;
  country?: string;
  iban?: string;
  bic?: string;
  bankName?: string;
  accountType?: BankAccountType;
  // paypal
  email?: string;
  // crypto
  network?: CryptoNetwork;
  asset?: string;
  address?: string;
}

export interface PayoutMethodResult {
  ok: boolean;
  method?: PayoutMethod;
  verification?: PayoutMethodVerification;
  error?: string;
}

export const getVerificationAttempts = (methodId: string): VerificationAttempt[] =>
  db().verificationAttempts.filter((v) => v.methodId === methodId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));

function recordVerificationAttempt(
  method: PayoutMethod,
  kind: VerificationAttempt["kind"],
  outcome: VerificationAttempt["outcome"],
  detail: string,
): void {
  db().verificationAttempts.push({
    id: nid("vatt"),
    methodId: method.id,
    employeeId: method.employeeId,
    rail: method.type,
    kind,
    outcome,
    detail,
    createdAt: new Date().toISOString(),
  });
}

/**
 * Add a payout destination. Validation is REAL (ISO 7064 IBAN + ISO 9362 BIC,
 * chain-aware crypto checksums, asset↔network + country/currency gates). We then
 * persist ONLY masked, non-sensitive display data + a tokenized reference. Raw
 * IBAN/email/address are masked immediately and never stored.
 */
export function addPayoutMethod(employeeId: string, input: AddPayoutMethodInput, actor: Actor): PayoutMethodResult {
  const environment: PayoutEnvironment = getRailStatus(input.type).mode === "live" ? "live" : "sandbox";
  const base = {
    id: `pom_tok_${Math.random().toString(36).slice(2, 10)}`,
    employeeId,
    type: input.type,
    label: input.label,
    status: "pending" as const,
    isDefault: getPayoutMethods(employeeId).length === 0,
    currency: input.currency,
    environment,
    createdAt: new Date().toISOString(),
  };

  let method: PayoutMethod;
  if (input.type === "bank") {
    if (!input.holderName) return { ok: false, error: "Account holder name is required." };
    if (!bankCurrencySupported(input.currency)) return { ok: false, error: `${input.currency} is not a supported bank corridor.` };
    const iban = validateIban(input.iban ?? "");
    if (!iban.valid) return { ok: false, error: iban.reason ?? "Invalid IBAN." };
    if (iban.country && !countrySupported(iban.country)) {
      return { ok: false, error: `Payouts to ${iban.country} are not enabled.` };
    }
    let bic: string | undefined;
    if (input.bic) {
      const b = validateBic(input.bic);
      if (!b.valid) return { ok: false, error: b.reason ?? "Invalid BIC/SWIFT." };
      bic = b.normalized;
    }
    method = {
      ...base,
      holderName: input.holderName,
      country: iban.country ?? input.country?.toUpperCase(),
      bankName: input.bankName,
      bic,
      accountType: input.accountType ?? "checking",
      mask: maskIban(iban.normalized),
      bankToken: `btok_${Math.random().toString(36).slice(2, 10)}`,
    };
    db().payoutMethods.push(method);
    recordVerificationAttempt(method, "validation", "passed", `IBAN ${method.mask} passed MOD-97-10${bic ? " + BIC ISO 9362" : ""}.`);
  } else if (input.type === "paypal") {
    if (!input.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.email)) return { ok: false, error: "Enter a valid PayPal email." };
    method = { ...base, mask: maskEmail(input.email), paypalConnection: "disconnected" };
    db().payoutMethods.push(method);
    recordVerificationAttempt(method, "validation", "passed", `Email format valid; awaiting OAuth/verified-recipient consent.`);
  } else {
    if (!input.network) return { ok: false, error: "Select a network." };
    if (!input.asset || !assetSupportedOnNetwork(input.asset, input.network)) {
      return { ok: false, error: `${input.asset ?? "Asset"} is not supported on ${input.network}.` };
    }
    const addr = validateCryptoAddress(input.address ?? "", input.network);
    if (!addr.valid) return { ok: false, error: addr.reason ?? "Invalid wallet address for this network." };
    method = {
      ...base,
      network: input.network,
      asset: input.asset,
      mask: maskAddress((input.address ?? "").trim()),
      ownershipVerified: false,
    };
    db().payoutMethods.push(method);
    recordVerificationAttempt(method, "validation", "passed", `Address passed ${input.network} checksum; asset ${input.asset} matches network.`);
  }

  const verification: PayoutMethodVerification = {
    id: nid("ver"),
    methodId: method.id,
    employeeId,
    method: method.type,
    status: "pending",
    attempts: 1,
    challenge:
      method.type === "bank"
        ? "micro-deposit confirmation pending"
        : method.type === "paypal"
          ? "verified-recipient / OAuth consent pending"
          : "ownership signature challenge pending",
    createdAt: new Date().toISOString(),
  };
  db().payoutVerifications.push(verification);
  logAudit(actor, "payout_method_added", `Linked a ${method.type} payout method (${method.mask}, ${environment}). Validated + tokenized — no raw details stored.`);
  return { ok: true, method, verification };
}

export const getVerification = (methodId: string): PayoutMethodVerification | undefined =>
  db().payoutVerifications.find((v) => v.methodId === methodId);

/** Resolve the verification challenge → method becomes verified. Records the attempt. */
export function verifyPayoutMethod(employeeId: string, methodId: string, actor: Actor): PayoutMethodResult {
  const method = getPayoutMethod(methodId);
  if (!method || method.employeeId !== employeeId) return { ok: false, error: "Method not found." };
  const verification = getVerification(methodId);
  const now = new Date().toISOString();
  method.status = "verified";
  method.verifiedAt = now;
  if (method.type === "paypal") method.paypalConnection = "oauth_connected";
  if (method.type === "crypto") method.ownershipVerified = true;
  if (verification) {
    verification.status = "verified";
    verification.attempts += 1;
    verification.resolvedAt = now;
  }
  const kind = method.type === "bank" ? "micro_deposit" : method.type === "paypal" ? "oauth" : "ownership_signature";
  recordVerificationAttempt(method, kind, "passed", `${method.type} ownership confirmed (${method.environment}).`);
  logAudit(actor, "payout_method_verified", `Verified ${method.type} payout method ${method.mask}.`);
  return { ok: true, method };
}

export function setPayoutMethodDisabled(employeeId: string, methodId: string, disabled: boolean): boolean {
  const method = getPayoutMethod(methodId);
  if (!method || method.employeeId !== employeeId) return false;
  method.disabled = disabled;
  if (disabled && method.isDefault) {
    method.isDefault = false;
    const next = getUsablePayoutMethods(employeeId)[0];
    if (next) next.isDefault = true;
  }
  return true;
}

export function removePayoutMethod(employeeId: string, methodId: string, actor: Actor): boolean {
  const method = getPayoutMethod(methodId);
  if (!method || method.employeeId !== employeeId) return false;
  db().payoutMethods = db().payoutMethods.filter((m) => m.id !== methodId);
  db().payoutVerifications = db().payoutVerifications.filter((v) => v.methodId !== methodId);
  const remaining = getVerifiedPayoutMethods(employeeId);
  if (method.isDefault && remaining.length > 0 && !remaining.some((m) => m.isDefault)) {
    remaining[0].isDefault = true;
  }
  logAudit(actor, "payout_method_removed", `Removed payout method ${method.mask}.`);
  return true;
}

export function setDefaultPayoutMethod(employeeId: string, methodId: string): boolean {
  const method = getPayoutMethod(methodId);
  if (!method || method.employeeId !== employeeId || method.status !== "verified") return false;
  for (const m of getPayoutMethods(employeeId)) m.isDefault = m.id === methodId;
  return true;
}

// --- Bonus campaigns & payouts ---
export const getBonusCampaigns = (companyId: string): BonusCampaign[] =>
  db().bonusCampaigns.filter((c) => c.companyId === companyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const getBonusPayouts = (companyId: string): BonusPayout[] =>
  db().bonusPayouts.filter((p) => p.companyId === companyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const getPayout = (id: string): BonusPayout | undefined => db().bonusPayouts.find((p) => p.id === id);
export const getPayoutsForEmployee = (employeeId: string): BonusPayout[] =>
  db().bonusPayouts.filter((p) => p.employeeId === employeeId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
export const getPayoutEvents = (payoutId: string): PayoutEvent[] =>
  db().payoutEvents.filter((e) => e.payoutId === payoutId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
export const getPayoutsByStatus = (companyId: string, status: PayoutStatus | "all"): BonusPayout[] =>
  status === "all" ? getBonusPayouts(companyId) : getBonusPayouts(companyId).filter((p) => p.status === status);

function recordPayoutEvent(payout: BonusPayout, type: PayoutEventType, message: string, actorName: string): void {
  const createdAt = new Date().toISOString();
  const payload = { payoutId: payout.id, type, message, createdAt };
  db().payoutEvents.push({ id: nid("pev"), payoutId: payout.id, type, message, actorName, signature: signEvent(payload), createdAt });
}

export interface CreateBonusInput {
  template: BonusTemplate;
  name: string;
  reason: string;
  displayCurrency: CurrencyCode;
  items: { employeeId: string; amount: number; testFailFirst?: boolean }[];
  scheduledAt?: string;
}

export interface CreateBonusResult {
  ok: boolean;
  campaign?: BonusCampaign;
  error?: string;
}

// --- Funding, balance ledger, compliance, attempts (accessors) ---
export const getFundingSources = (companyId: string): CompanyFundingSource[] =>
  db().fundingSources.filter((f) => f.companyId === companyId);
export const getLedger = (companyId: string, limit = 100): BalanceLedgerEntry[] =>
  db().ledger.filter((l) => l.companyId === companyId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
export const getCompanyBalance = (companyId: string, currency: CurrencyCode): number =>
  db().ledger.filter((l) => l.companyId === companyId && l.currency === currency).reduce((s, l) => s + l.amount, 0);
export const getPayoutAttempts = (payoutId: string): PayoutAttempt[] =>
  db().payoutAttempts.filter((a) => a.payoutId === payoutId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
export const getWebhookEvents = (limit = 50): WebhookEvent[] =>
  [...db().webhookEvents].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
export const getComplianceCase = (subjectType: ComplianceCase["subjectType"], subjectId: string): ComplianceCase | undefined =>
  db().complianceCases.find((c) => c.subjectType === subjectType && c.subjectId === subjectId);

function ledgerAdd(companyId: string, type: LedgerEntryType, amount: number, currency: CurrencyCode, memo: string, payoutId?: string): void {
  db().ledger.push({ id: nid("led"), companyId, type, amount, currency, payoutId, memo, createdAt: new Date().toISOString() });
}

function recordAttempt(payout: BonusPayout, outcome: PayoutAttempt["outcome"], detail: string, providerTxnId?: string): void {
  db().payoutAttempts.push({
    id: nid("patt"),
    payoutId: payout.id,
    attempt: payout.retryCount,
    idempotencyKey: payout.idempotencyKey,
    provider: payout.provider,
    environment: payout.environment,
    outcome,
    providerTxnId,
    detail,
    createdAt: new Date().toISOString(),
  });
}

/**
 * company_admin creates a bonus campaign. Each payout targets an employee's
 * default usable payout method and enters `pending_review` for finance. The
 * payout inherits the destination method's environment (sandbox/live) and the
 * configured provider for that rail.
 */
export function createBonusCampaign(companyId: string, input: CreateBonusInput, actor: Actor): CreateBonusResult {
  if (input.items.length === 0) return { ok: false, error: "Add at least one recipient." };

  const now = new Date().toISOString();
  const payouts: BonusPayout[] = [];
  let environment: PayoutEnvironment = "sandbox";

  for (const item of input.items) {
    const employee = getEmployee(item.employeeId);
    if (!employee || employee.companyId !== companyId) return { ok: false, error: "Recipient is not in your company." };
    const method = getDefaultPayoutMethod(item.employeeId);
    if (!method) return { ok: false, error: `${employee.name} has no verified payout method.` };
    if (item.amount <= 0) return { ok: false, error: "Amount must be positive." };

    // Capability gate: the rail must support this currency/asset.
    if (method.type === "bank" && !bankCurrencySupported(input.displayCurrency)) {
      return { ok: false, error: `Bank rail does not support ${input.displayCurrency}.` };
    }
    const rail = getRailStatus(method.type);
    if (method.environment === "live") environment = "live";

    const payout: BonusPayout = {
      id: nid("pay"),
      companyId,
      campaignId: "", // set below
      employeeId: employee.id,
      employeeName: employee.name,
      amount: item.amount,
      currency: input.displayCurrency,
      reason: input.reason,
      template: input.template,
      status: "pending_review",
      payoutMethodId: method.id,
      destinationType: method.type,
      destinationMask: method.mask,
      destinationNetwork: method.network,
      environment: method.environment,
      provider: rail.provider,
      idempotencyKey: `idem_${nid("k")}`,
      retryCount: 0,
      scheduledAt: input.scheduledAt,
      createdByUserId: actor.userId,
      approvals: [],
      createdAt: now,
      updatedAt: now,
      testFailFirst: item.testFailFirst === true,
    };
    payouts.push(payout);
  }

  const campaign: BonusCampaign = {
    id: nid("camp"),
    companyId,
    name: input.name,
    template: input.template,
    reason: input.reason,
    displayCurrency: input.displayCurrency,
    status: "active",
    environment,
    createdByUserId: actor.userId,
    createdByName: actor.name,
    createdAt: now,
    payoutIds: [],
  };
  for (const payout of payouts) {
    payout.campaignId = campaign.id;
    db().bonusPayouts.push(payout);
    campaign.payoutIds.push(payout.id);
    recordPayoutEvent(payout, "created", `Bonus authorized by ${actor.name} (${actor.role}).`, actor.name);
    recordPayoutEvent(payout, "submitted_review", "Submitted for finance review.", actor.name);
  }
  db().bonusCampaigns.push(campaign);
  logAudit(actor, "bonus_created", `Created "${campaign.name}" (${input.template}, ${environment}) with ${payouts.length} payout(s).`);
  for (const f of getUsersByCompanyRole(companyId, "finance_admin")) {
    notify(f.id, "payout", "Bonus payouts awaiting review", `${campaign.name}: ${campaign.payoutIds.length} payout(s) need approval.`, "/finance");
  }
  return { ok: true, campaign };
}

export interface PayoutResult {
  ok: boolean;
  payout?: BonusPayout;
  error?: string;
  pending?: boolean; // awaiting a second (dual) approval
}

function distinctApprovers(payout: BonusPayout): number {
  const ids = new Set<string>([payout.createdByUserId, ...payout.approvals.map((a) => a.userId)]);
  return ids.size;
}

/**
 * finance_admin approves and settles a payout. Enforces: verified destination,
 * dual approval for large amounts, the live-payouts compliance gate, and cleared
 * funds. Idempotent; transaction-safe status transitions. A payout is only
 * `confirmed` from the sandbox simulator's signed settlement OR a verified live
 * provider webhook — never optimistically.
 */
export async function approveAndProcessPayout(payoutId: string, actor: Actor): Promise<PayoutResult> {
  const payout = getPayout(payoutId);
  if (!payout) return { ok: false, error: "Payout not found." };
  if (payout.status === "confirmed") return { ok: true, payout }; // idempotent
  if (!["pending_review", "approved", "failed"].includes(payout.status)) {
    return { ok: false, error: `Payout is ${payout.status}.` };
  }

  const method = getPayoutMethod(payout.payoutMethodId);
  if (!method || method.employeeId !== payout.employeeId || method.status !== "verified" || method.disabled) {
    return { ok: false, error: "Destination is no longer a verified, enabled employee method." };
  }

  // Compliance + live gate.
  if (payout.environment === "live") {
    if (!livePayoutsEnabled()) return { ok: false, error: "Live payouts are disabled (LIVE_PAYOUTS_ENABLED=false)." };
    const cc = getComplianceCase("company", payout.companyId);
    if (!cc || cc.kyc !== "cleared" || cc.aml !== "cleared" || cc.sanctions !== "cleared" || cc.hold) {
      return { ok: false, error: "Company compliance (KYC/AML/sanctions) is not cleared." };
    }
  }

  // Cleared funds.
  if (getCompanyBalance(payout.companyId, payout.currency) < payout.amount) {
    return { ok: false, error: `Insufficient cleared ${payout.currency} funds for this payout.` };
  }

  // Record this approval; enforce dual approval for large amounts.
  if (!payout.approvals.some((a) => a.userId === actor.userId)) {
    payout.approvals.push({ userId: actor.userId, name: actor.name, role: actor.role as UserRole, at: new Date().toISOString() });
  }
  payout.reviewedByUserId = actor.userId;
  payout.reviewedByName = actor.name;
  const required = payout.amount >= DUAL_APPROVAL_THRESHOLD ? 2 : 1;
  if (distinctApprovers(payout) < required) {
    payout.status = "approved";
    payout.updatedAt = new Date().toISOString();
    recordPayoutEvent(payout, "approved", `Approved by ${actor.name} (1 of ${required}). Awaiting a second approver.`, actor.name);
    logAudit(actor, "payout_approved", `Approved payout ${payout.id} (awaiting dual approval).`, payout.id);
    return { ok: true, payout, pending: true };
  }

  payout.status = "approved";
  payout.updatedAt = new Date().toISOString();
  recordPayoutEvent(payout, "approved", `Approved by ${actor.name} (${distinctApprovers(payout)}/${required}).`, actor.name);
  logAudit(actor, "payout_approved", `Approved payout ${payout.id}.`, payout.id);

  return runPayout(payout, actor);
}

export async function retryPayout(payoutId: string, actor: Actor): Promise<PayoutResult> {
  const payout = getPayout(payoutId);
  if (!payout) return { ok: false, error: "Payout not found." };
  if (payout.status !== "failed") return { ok: false, error: "Only failed payouts can be retried." };
  payout.retryCount += 1;
  payout.failureReason = undefined;
  payout.status = "approved";
  payout.updatedAt = new Date().toISOString();
  recordPayoutEvent(payout, "retry", `Retry #${payout.retryCount} by ${actor.name}.`, actor.name);
  logAudit(actor, "payout_retried", `Retried payout ${payout.id} (#${payout.retryCount}).`, payout.id);
  return runPayout(payout, actor);
}

/** Internal: submit to the rail adapter; sandbox confirms now, live awaits webhook. */
async function runPayout(payout: BonusPayout, actor: Actor): Promise<PayoutResult> {
  payout.status = "processing";
  payout.updatedAt = new Date().toISOString();
  recordPayoutEvent(payout, "processing", `Submitting to ${payout.provider} (${payout.environment})…`, actor.name);
  logAudit(actor, "payout_processing", `Processing payout ${payout.id} via ${payout.provider} (${payout.environment}).`, payout.id);

  const adapter = getPayoutAdapter(payout.destinationType);
  const result = await adapter.submit({
    payoutId: payout.id,
    idempotencyKey: payout.idempotencyKey,
    amount: payout.amount,
    currency: payout.currency,
    destinationMask: payout.destinationMask,
    network: payout.destinationNetwork,
    attempt: payout.retryCount,
    testFailFirst: payout.testFailFirst === true,
  });

  payout.transactionRef = result.transactionRef;
  payout.provider = result.provider;
  payout.environment = result.environment;

  if (!result.accepted) {
    payout.status = "failed";
    payout.failureReason = result.failureReason;
    payout.updatedAt = new Date().toISOString();
    recordAttempt(payout, "failed", result.failureReason ?? "Provider rejected.", result.transactionRef);
    recordPayoutEvent(payout, "failed", result.failureReason ?? "Provider rejected the payout.", result.provider);
    logAudit(actor, "payout_failed", `Payout ${payout.id} failed: ${result.failureReason}`, payout.id);
    return { ok: true, payout };
  }

  // Reserve funds and mark paid (provider accepted).
  ledgerAdd(payout.companyId, "payout_hold", -payout.amount, payout.currency, `Hold for payout ${payout.id}`, payout.id);
  payout.status = "paid";
  payout.updatedAt = new Date().toISOString();
  recordAttempt(payout, result.settledNow ? "settled" : "submitted", `${result.provider} accepted.`, result.transactionRef);
  recordPayoutEvent(payout, "provider_ack", `${result.provider} accepted · ref ${result.transactionRef}.`, result.provider);

  if (result.settledNow && result.settlementPayload && result.settlementSignature) {
    // Sandbox simulator: internal signed settlement, verified before confirming.
    if (signEvent(result.settlementPayload) !== result.settlementSignature) {
      payout.status = "failed";
      payout.failureReason = "Settlement signature verification failed.";
      recordPayoutEvent(payout, "failed", "Settlement signature invalid.", result.provider);
      return { ok: true, payout };
    }
    settlePayout(payout, "Sandbox simulator settlement (not live money).");
  } else {
    // Live: do NOT confirm yet — wait for the verified provider webhook.
    recordPayoutEvent(payout, "processing", "Awaiting provider settlement webhook…", result.provider);
  }
  return { ok: true, payout };
}

/** Finalize a paid payout → confirmed + permanent ledger debit + employee receipt. */
function settlePayout(payout: BonusPayout, memo: string): void {
  // Release the hold and post the permanent settlement debit.
  ledgerAdd(payout.companyId, "payout_reversal", payout.amount, payout.currency, `Release hold for ${payout.id}`, payout.id);
  ledgerAdd(payout.companyId, "payout_settled", -payout.amount, payout.currency, memo, payout.id);
  payout.status = "confirmed";
  payout.updatedAt = new Date().toISOString();
  recordPayoutEvent(payout, "settled", `Settlement confirmed · ref ${payout.transactionRef}.`, payout.provider);
  logAudit(SYSTEM_ACTOR, "payout_settled", `Payout ${payout.id} settled (${payout.amount} ${payout.currency}, ${payout.environment}) to ${payout.destinationMask}.`, payout.id);
  const user = db().users.find((u) => u.employeeId === payout.employeeId);
  if (user) {
    notify(user.id, "bonus", "You received a bonus", `${payout.reason} — ${payout.amount} ${payout.currency} to ${payout.destinationMask} (${payout.environment}).`, `/employee/bonuses`);
  }
}

/**
 * Confirm a LIVE payout from a verified provider webhook. Idempotent + records a
 * WebhookEvent. The only path that confirms live money movement.
 */
export function confirmPayoutFromWebhook(input: {
  provider: string;
  eventType: string;
  providerTxnId?: string;
  payoutId?: string;
  signatureValid: boolean;
  dedupeKey: string;
}): { ok: boolean; error?: string } {
  // Idempotency: ignore duplicates.
  if (db().webhookEvents.some((w) => w.dedupeKey === input.dedupeKey)) {
    return { ok: true };
  }
  const payout =
    (input.payoutId && getPayout(input.payoutId)) ||
    db().bonusPayouts.find((p) => p.transactionRef && p.transactionRef === input.providerTxnId);

  db().webhookEvents.push({
    id: nid("wh"),
    provider: input.provider,
    eventType: input.eventType,
    payoutId: payout?.id,
    providerTxnId: input.providerTxnId,
    signatureValid: input.signatureValid,
    dedupeKey: input.dedupeKey,
    createdAt: new Date().toISOString(),
  });

  if (!input.signatureValid) return { ok: false, error: "Invalid webhook signature." };
  if (!payout) return { ok: false, error: "No matching payout." };
  if (payout.status === "confirmed") return { ok: true };
  if (payout.status !== "paid") return { ok: false, error: `Payout is ${payout.status}, not awaiting settlement.` };

  settlePayout(payout, `Live settlement confirmed by ${input.provider} webhook.`);
  return { ok: true };
}
