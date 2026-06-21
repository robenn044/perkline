/**
 * Perkline — core domain model.
 *
 * Every entity required by the PERX brief is represented here:
 * Market, Company, Employee, EmployerPolicy, Provider, Offer, Package,
 * PackageItem, BenefitRequest, PaymentSplit, Voucher, ActivityEvent.
 *
 * Money is stored as an integer in the currency's major unit (e.g. whole ALL)
 * plus an explicit currency code, so the model is international-ready while the
 * Albania demo stays clean. Formatting lives in `money.ts`.
 */

export type CurrencyCode = "ALL" | "EUR" | "USD";

export type LocaleCode = "en-AL" | "sq-AL" | "it-IT" | "es-ES";

/** Benefit categories — localizable per market. */
export type Category =
  | "wellness"
  | "food"
  | "learning"
  | "health"
  | "fitness"
  | "travel"
  | "telecom";

export type CompanyRole = "employer" | "provider";

export type PackageSource = "curated" | "ai" | "manual";

/**
 * Benefit request lifecycle. A request the employer approves moves through a
 * realistic payment progression (approved → processing → paid → voucher_ready)
 * that the UI animates. `draft` lets an employee stage a request before sending.
 */
export type RequestStatus =
  | "draft"
  | "pending"
  | "approved"
  | "processing"
  | "paid"
  | "voucher_ready"
  | "rejected";

/** Per-provider payout lifecycle (tokenized, simulated — never real money). */
export type SplitStatus = "pending" | "processing" | "paid";

export type VoucherStatus = "issued" | "redeemed" | "expired";

export type PolicyStatus = "within_policy" | "needs_approval" | "blocked";

export type ActorType = "employee" | "employer" | "provider" | "system";

/**
 * Auth roles — drives RBAC in middleware and on every server mutation.
 * `finance_admin` exists to enforce separation of duties: company_admin
 * *creates* bonus payouts, finance_admin *approves & settles* them.
 */
export type UserRole = "employee" | "company_admin" | "finance_admin";

export interface Market {
  id: string;
  countryCode: string; // ISO 3166-1 alpha-2, e.g. "AL"
  city: string;
  defaultCurrency: CurrencyCode;
  defaultLocale: LocaleCode;
  supportedLocales: LocaleCode[];
  supportedCurrencies: CurrencyCode[];
  /** Category keys available in this market, in display order. */
  categories: Category[];
}

export interface Company {
  id: string;
  name: string;
  marketId: string;
  roles: CompanyRole[];
  logoSeed: string; // used to derive a deterministic gradient avatar
}

export interface EmployerPolicy {
  companyId: string;
  monthlyLimit: number; // per-employee monthly allowance
  /** Requests at or above this amount always require explicit approval. */
  approvalThreshold: number;
  allowedCategories: Category[];
  blockedCategories: Category[];
  maxProvidersPerPackage: number;
  currency: CurrencyCode;
}

export interface Employee {
  id: string;
  companyId: string;
  name: string;
  role: string; // job title, e.g. "Product Designer"
  department: string; // e.g. "Design", "Engineering"
  locale: LocaleCode; // preferred language
  currency: CurrencyCode; // preferred display currency
  avatarSeed: string;
  monthlyBudget: number;
  budgetRemaining: number;
  /** Soft preference weights drive personalization & deterministic AI. */
  preferences: Category[];
  /** Free-text interests captured in settings, e.g. ["yoga","sushi","coding"]. */
  interests: string[];
  /** Offer ids the employee has previously enjoyed. */
  history: string[];
  /** Engagement: current wellness streak in weeks. */
  streakWeeks: number;
  points: number;
}

export interface Provider {
  id: string;
  companyId: string;
  displayName: string;
  category: Category;
  marketId: string;
  status: "active" | "pending_review" | "paused";
  blurb: string;
  neighborhood: string;
  rating: number; // 0..5
  logoSeed: string;
}

export interface Offer {
  id: string;
  providerId: string;
  title: string;
  description: string;
  category: Category;
  price: number;
  currency: CurrencyCode;
  tags: string[];
  /** Loose availability hint used by the concierge, e.g. ["weekend","evening"]. */
  availability: string[];
  /** Marketing flags that power the feed rails. */
  isFresh?: boolean; // "Fresh in Tirana"
  isFridayDrop?: boolean; // "Friday Drops"
  durationLabel?: string; // e.g. "60 min", "Day pass"
  popularity: number; // 0..100, drives sorting & insights
}

export interface PackageItem {
  offerId: string;
  providerId: string;
  price: number;
  sortOrder: number;
}

export interface Package {
  id: string;
  source: PackageSource;
  title: string;
  tagline: string;
  reason: string; // "why this fits" — narration for the employee
  items: PackageItem[];
  total: number;
  currency: CurrencyCode;
  categoryTags: Category[];
  heroSeed: string; // deterministic gradient (fallback when no hero image)
  /** Optional license-safe hero image (local /public path). Falls back to the gradient. */
  image?: string;
  /** AI confidence (0..1) when source === "ai". */
  confidence?: number;
}

export interface BenefitRequest {
  id: string;
  employeeId: string;
  companyId: string;
  package: Package; // snapshot so the request is self-contained
  status: RequestStatus;
  policyStatus: PolicyStatus;
  policyNotes: string[];
  /** Short AI/policy summary surfaced to the employer. */
  employerSummary: string;
  budgetRemainingAfter: number;
  submittedAt: string;
  decidedAt?: string;
  decidedByName?: string;
  /** Admin's free-text comment on approval or rejection. */
  decisionComment?: string;
  decisionReason?: string;
  /** How the request was created — drives analytics. */
  origin: "concierge" | "route" | "offer";
  paymentSplits: PaymentSplit[];
  vouchers: Voucher[];
}

export interface PaymentSplit {
  id: string;
  requestId: string;
  providerId: string;
  providerName: string;
  destinationId: string;
  destinationType: ProviderPaymentDestination["type"];
  destinationDisplay: string;
  amount: number;
  currency: CurrencyCode;
  status: SplitStatus;
  scheduledAt: string;
  paidAt?: string;
}

export interface Voucher {
  id: string;
  requestId: string;
  providerId: string;
  providerName: string;
  offerTitle: string;
  code: string;
  status: VoucherStatus;
  issuedAt: string;
  expiresAt: string;
  redemptionSteps: string[];
  supportContact: string;
  redeemedAt?: string;
}

export interface ActivityEvent {
  id: string;
  actorType: ActorType;
  actorId: string;
  eventType: string;
  message: string;
  requestId?: string;
  createdAt: string;
}

/** Intent extracted from a natural-language concierge prompt. */
export interface ConciergeIntent {
  primaryNeed:
    | "relaxation"
    | "healthy"
    | "learning"
    | "travel"
    | "telecom"
    | "fitness"
    | "general";
  budgetCap: number | null;
  timeContext: "weekend" | "weekday" | "evening" | "anytime";
  categories: Category[];
  keywords: string[];
  confidence: number;
}

export interface ConciergeResult {
  intent: ConciergeIntent;
  package: Package | null;
  alternatives: Package[];
  /** Human narration of the reasoning, streamed into the UI. */
  narration: string[];
  policyStatus: PolicyStatus;
  policyNotes: string[];
  remainingBudgetAfter: number | null;
  /** Which engine produced the result — surfaced as a transparency badge. */
  engine: "claude" | "deterministic";
  fallbackMessage: string | null;
}

export interface EmployerInsight {
  summary: string;
  bullets: string[];
  recommendedActions: string[];
  topCategories: { category: Category; count: number; share: number }[];
  unusedBudgetRate: number;
  totalApproved: number;
  totalRoutedToProviders: number;
  confidence: number;
}

// ---------------------------------------------------------------------------
// Auth, profiles, payment & compliance models
// ---------------------------------------------------------------------------

/**
 * Login account. Passwords are stored only as bcrypt hashes — never in plain
 * text. The session is a signed, httpOnly JWT (see `lib/auth.ts`).
 */
export interface User {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  name: string;
  companyId: string;
  /** Set when role === "employee" — links the account to its Employee record. */
  employeeId?: string;
  /** Set when role === "company_admin". */
  title?: string;
  avatarSeed: string;
}

export type PaymentDestinationStatus = "active" | "pending_verification" | "connected" | "disabled";

interface PaymentDestinationBase {
  id: string;
  ownerId: string;
  currency: CurrencyCode;
  status: PaymentDestinationStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Employee benefit credit. This is an internal allowance + voucher wallet,
 * never a bank account or cash payout destination. It intentionally has no
 * account/card fields.
 */
export interface EmployeePerxWalletDestination extends PaymentDestinationBase {
  type: "employee_perx_wallet";
  ownerType: "employee";
}

/** Provider-owned bank settlement destination. Raw IBAN is masked and discarded. */
export interface ProviderBankSettlementDestination extends PaymentDestinationBase {
  type: "provider_bank_settlement";
  ownerType: "provider";
  legalBusinessName: string;
  country: string;
  ibanMask: string;
  bic?: string;
}

/** Provider-owned PayPal Business connection. No password or access token is stored. */
export interface ProviderPayPalBusinessDestination extends PaymentDestinationBase {
  type: "provider_paypal_business";
  ownerType: "provider";
  connectionState: "redirect_pending" | "connected";
  verifiedBusinessEmailMask?: string;
}

/** Provider-owned hosted processor account. Perkline never captures raw card data. */
export interface ProviderCardProcessorDestination extends PaymentDestinationBase {
  type: "provider_card_processor";
  ownerType: "provider";
  processor: "TeamSystem Payments Demo";
  connectionState: "hosted_setup_pending" | "connected";
  hostedAccountToken?: string;
}

export type ProviderPaymentDestination =
  | ProviderBankSettlementDestination
  | ProviderPayPalBusinessDestination
  | ProviderCardProcessorDestination;

/** Canonical destination union used across seed, store, APIs, and UI. */
export type PaymentDestination = EmployeePerxWalletDestination | ProviderPaymentDestination;

/** Short onboarding questionnaire that personalizes the AI Concierge. */
export interface QuestionnaireAnswer {
  employeeId: string;
  goals: string[];
  stressLevel: number; // 1..5
  preferredCategories: Category[];
  groupPreference: "solo" | "team" | "either";
  timePreference: "weekday" | "weekend" | "either";
  priority: "wellness" | "learning" | "travel" | "balance";
  completedAt: string | null;
}

export type AuditAction =
  | "login"
  | "logout"
  | "request_submitted"
  | "request_approved"
  | "request_rejected"
  | "payment_routed"
  | "voucher_redeemed"
  | "policy_updated"
  | "payment_destination_updated"
  | "provider_status_updated"
  | "questionnaire_saved"
  | "demo_reset"
  | "payout_method_added"
  | "payout_method_verified"
  | "payout_method_removed"
  | "bonus_created"
  | "bonus_submitted"
  | "payout_approved"
  | "payout_processing"
  | "payout_settled"
  | "payout_failed"
  | "payout_retried";

/** Tamper-evident-ish audit trail for compliance confidence on the admin side. */
export interface AuditEvent {
  id: string;
  actorUserId: string;
  actorName: string;
  actorRole: UserRole | "system";
  action: AuditAction;
  summary: string;
  requestId?: string;
  createdAt: string;
}

/** A curated multi-provider bundle. "Perkline Collection" is the product name for it. */
export type PerxRoute = Package;

// ---------------------------------------------------------------------------
// Perkline Bonus — employer-funded reward payouts (SEPARATE from provider payments)
// ---------------------------------------------------------------------------

export type PayoutMethodType = "bank" | "paypal" | "crypto";
export type PayoutMethodStatus = "pending" | "verified" | "failed" | "disabled";
export type BankAccountType = "checking" | "savings";

/** Which money environment an artifact belongs to. Sandbox is never "live money". */
export type PayoutEnvironment = "sandbox" | "live";

/** Testnet/mock crypto networks only — never mainnet, never real assets. */
export type CryptoNetwork = "ETH-Sepolia" | "MATIC-Amoy" | "BTC-Testnet";

/**
 * An employee-owned destination for employer bonus payouts.
 *
 * SECURITY: we persist ONLY a mock provider token + masked, non-sensitive
 * display data + verification state. Never an IBAN in full, a PayPal password,
 * a private key, or a seed phrase. Distinct from `PaymentMethod`, which is the
 * voucher-delivery profile for the PERX benefits loop.
 */
export interface PayoutMethod {
  id: string; // mock token, e.g. "pom_tok_..."
  employeeId: string;
  type: PayoutMethodType;
  label: string;
  status: PayoutMethodStatus;
  isDefault: boolean;
  disabled?: boolean;
  currency: CurrencyCode;
  /** Sandbox vs live — derived from the rail's configured environment at add time. */
  environment: PayoutEnvironment;
  createdAt: string;
  verifiedAt?: string;
  // Masked, display-only details (type-specific). Raw values are never stored.
  holderName?: string;
  country?: string; // ISO-2
  mask: string; // e.g. "AL•• •••• •••• 4417", "e•••@gmail.com", "0xAb…9F2c"
  // Bank
  bankName?: string;
  bic?: string; // ISO 9362, safe to show (not sensitive)
  accountType?: BankAccountType;
  bankToken?: string; // encrypted provider reference (vault); never a raw IBAN
  // PayPal
  paypalConnection?: "oauth_connected" | "disconnected";
  // Crypto (testnet/mock only)
  network?: CryptoNetwork;
  asset?: string; // e.g. "ETH", "USDC", "BTC"
  ownershipVerified?: boolean;
}

/** A verification attempt against a payout method (mock challenge flow). */
export interface PayoutMethodVerification {
  id: string;
  methodId: string;
  employeeId: string;
  method: PayoutMethodType;
  status: PayoutMethodStatus;
  attempts: number;
  challenge: string; // mock micro-deposit code / signed-nonce reference (never a secret)
  createdAt: string;
  resolvedAt?: string;
}

export type BonusTemplate = "team_challenge" | "recognition" | "custom";
export type CampaignStatus = "draft" | "active" | "completed";

export interface BonusCampaign {
  id: string;
  companyId: string;
  name: string;
  template: BonusTemplate;
  reason: string;
  displayCurrency: CurrencyCode;
  status: CampaignStatus;
  environment: PayoutEnvironment;
  createdByUserId: string;
  createdByName: string;
  createdAt: string;
  payoutIds: string[];
}

/** A recorded approval on a payout — dual approval needs two distinct users. */
export interface PayoutApproval {
  userId: string;
  name: string;
  role: UserRole;
  at: string;
}

export type PayoutStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "processing"
  | "paid"
  | "confirmed"
  | "failed";

/** A single bonus payout to one employee's verified payout method. */
export interface BonusPayout {
  id: string;
  companyId: string;
  campaignId: string;
  employeeId: string;
  employeeName: string;
  amount: number;
  currency: CurrencyCode;
  reason: string;
  template: BonusTemplate;
  status: PayoutStatus;
  // Destination snapshot (masked) at creation — immutable for crypto once initiated.
  payoutMethodId: string;
  destinationType: PayoutMethodType;
  destinationMask: string;
  destinationNetwork?: CryptoNetwork;
  // Environment + provider settlement.
  environment: PayoutEnvironment;
  provider: string; // "Wise" | "PayPal Payouts" | "Custody (testnet)" | "Sandbox Simulator"
  // Engine bookkeeping.
  idempotencyKey: string;
  transactionRef?: string; // provider transaction / batch id (confirmation source of truth)
  failureReason?: string;
  retryCount: number;
  scheduledAt?: string;
  createdByUserId: string;
  reviewedByUserId?: string;
  reviewedByName?: string;
  /** Dual approval — distinct approvers required at/above the policy threshold. */
  approvals: PayoutApproval[];
  createdAt: string;
  updatedAt: string;
  /** Demo-only: force a first-attempt failure to exercise the retry/reconcile flow. */
  testFailFirst?: boolean;
}

export type PayoutEventType =
  | "created"
  | "submitted_review"
  | "approved"
  | "processing"
  | "provider_ack"
  | "settled"
  | "failed"
  | "retry";

/** Immutable, signed lifecycle event for a payout (webhook-style). */
export interface PayoutEvent {
  id: string;
  payoutId: string;
  type: PayoutEventType;
  message: string;
  actorName: string;
  signature: string; // mock HMAC over the event payload
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: "bonus" | "payout" | "system";
  title: string;
  body: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

// --- Production-foundation entities --------------------------------------

/** An attempt to verify a payout method (validation / micro-deposit / OAuth). */
export interface VerificationAttempt {
  id: string;
  methodId: string;
  employeeId: string;
  rail: PayoutMethodType;
  kind: "validation" | "micro_deposit" | "oauth" | "ownership_signature";
  outcome: "passed" | "failed";
  detail: string;
  createdAt: string;
}

/** An encrypted provider connection (e.g. PayPal/Wise tokens). Secrets are vault-encrypted. */
export interface ProviderConnection {
  id: string;
  companyId: string;
  provider: string;
  rail: PayoutMethodType;
  environment: PayoutEnvironment;
  status: "connected" | "disconnected";
  /** Vault-encrypted token blob (AES-256-GCM). Never stored or returned in clear. */
  encryptedToken?: string;
  createdAt: string;
}

/** Company funding — provider-hosted/tokenized; we never capture raw bank/card. */
export interface CompanyFundingSource {
  id: string;
  companyId: string;
  provider: string;
  label: string;
  currency: CurrencyCode;
  status: "active" | "pending";
  mask: string;
}

export type LedgerEntryType = "funding" | "payout_hold" | "payout_settled" | "payout_reversal";

/** Append-only balance ledger — every movement is a row; balance is derived. */
export interface BalanceLedgerEntry {
  id: string;
  companyId: string;
  type: LedgerEntryType;
  amount: number; // signed minor->major unit; positive = credit, negative = debit
  currency: CurrencyCode;
  payoutId?: string;
  memo: string;
  createdAt: string;
}

/** One provider call attempt for a payout (idempotent, with provider response). */
export interface PayoutAttempt {
  id: string;
  payoutId: string;
  attempt: number;
  idempotencyKey: string;
  provider: string;
  environment: PayoutEnvironment;
  outcome: "submitted" | "settled" | "failed";
  providerTxnId?: string;
  detail: string;
  createdAt: string;
}

/** A received provider webhook — recorded idempotently, signature-verified. */
export interface WebhookEvent {
  id: string;
  provider: string;
  eventType: string;
  payoutId?: string;
  providerTxnId?: string;
  signatureValid: boolean;
  dedupeKey: string;
  createdAt: string;
}

export type ComplianceStatus = "not_started" | "pending" | "cleared" | "blocked";
/** KYC/AML/sanctions case state. Live payouts require `cleared`. */
export interface ComplianceCase {
  id: string;
  subjectType: "company" | "employee";
  subjectId: string;
  kyc: ComplianceStatus;
  aml: ComplianceStatus;
  sanctions: ComplianceStatus;
  hold: boolean;
  updatedAt: string;
}

/** Re-exported config row type (see lib/finance-config CURRENCY_NETWORK_CONFIG). */
export interface CurrencyNetworkConfig {
  rail: PayoutMethodType;
  unit: string;
  network?: CryptoNetwork;
  environments: PayoutEnvironment[];
}
