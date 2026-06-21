import { hashSync } from "bcryptjs";
import type {
  ActivityEvent,
  AuditEvent,
  BonusCampaign,
  BonusPayout,
  Company,
  Employee,
  EmployerPolicy,
  Market,
  Notification,
  Offer,
  Package,
  PaymentDestination,
  PayoutEvent,
  PayoutMethod,
  PayoutMethodVerification,
  Provider,
  QuestionnaireAnswer,
  User,
  BalanceLedgerEntry,
  ComplianceCase,
  CompanyFundingSource,
  PayoutAttempt,
  ProviderConnection,
  VerificationAttempt,
  WebhookEvent,
} from "./types";

/**
 * Deterministic Albania-first seed catalog. Re-run by the demo reset endpoint to
 * restore a pristine state in under a second.
 */

export interface SeedData {
  markets: Market[];
  companies: Company[];
  employees: Employee[];
  policies: EmployerPolicy[];
  providers: Provider[];
  offers: Offer[];
  packages: Package[];
  activity: ActivityEvent[];
  users: User[];
  paymentDestinations: PaymentDestination[];
  questionnaires: QuestionnaireAnswer[];
  audit: AuditEvent[];
  payoutMethods: PayoutMethod[];
  payoutVerifications: PayoutMethodVerification[];
  bonusCampaigns: BonusCampaign[];
  bonusPayouts: BonusPayout[];
  payoutEvents: PayoutEvent[];
  notifications: Notification[];
  verificationAttempts: VerificationAttempt[];
  providerConnections: ProviderConnection[];
  fundingSources: CompanyFundingSource[];
  ledger: BalanceLedgerEntry[];
  payoutAttempts: PayoutAttempt[];
  webhookEvents: WebhookEvent[];
  complianceCases: ComplianceCase[];
}

/**
 * Demo credentials (documented in README). Passwords are bcrypt-hashed at seed
 * time — never stored or compared in plain text.
 */
export const DEMO_PASSWORD = "demo1234";

export const ALBATECH_ID = "cmp_albatech";

const markets: Market[] = [
  {
    id: "mkt_al",
    countryCode: "AL",
    city: "Tirana",
    defaultCurrency: "ALL",
    defaultLocale: "en-AL",
    supportedLocales: ["en-AL", "sq-AL", "it-IT", "es-ES"],
    supportedCurrencies: ["ALL", "EUR", "USD"],
    categories: ["wellness", "food", "learning", "health", "fitness", "travel", "telecom"],
  },
  {
    // Present to prove "ready for the world" — Milan opens without a rewrite.
    id: "mkt_it",
    countryCode: "IT",
    city: "Milan",
    defaultCurrency: "EUR",
    defaultLocale: "it-IT",
    supportedLocales: ["it-IT", "en-AL"],
    supportedCurrencies: ["EUR", "USD"],
    categories: ["wellness", "food", "learning", "health", "fitness", "travel", "telecom"],
  },
];

const companies: Company[] = [
  { id: ALBATECH_ID, name: "AlbaTech", marketId: "mkt_al", roles: ["employer"], logoSeed: "albatech" },
  { id: "cmp_motive", name: "Motive Studio", marketId: "mkt_al", roles: ["provider"], logoSeed: "motive" },
  { id: "cmp_nova", name: "Nova Recovery", marketId: "mkt_al", roles: ["provider"], logoSeed: "nova" },
  { id: "cmp_green", name: "Green Plate Blloku", marketId: "mkt_al", roles: ["provider"], logoSeed: "green" },
  { id: "cmp_skill", name: "SkillSprint Tirana", marketId: "mkt_al", roles: ["provider"], logoSeed: "skill" },
  { id: "cmp_smile", name: "Tirana Smile Care", marketId: "mkt_al", roles: ["provider"], logoSeed: "smile" },
  { id: "cmp_urban", name: "Urban Move", marketId: "mkt_al", roles: ["provider"], logoSeed: "urban" },
  { id: "cmp_weekend", name: "Weekend South", marketId: "mkt_al", roles: ["provider"], logoSeed: "weekend" },
  { id: "cmp_connect", name: "Connect Mobile", marketId: "mkt_al", roles: ["provider"], logoSeed: "connect" },
];

const policies: EmployerPolicy[] = [
  {
    companyId: ALBATECH_ID,
    monthlyLimit: 25000,
    approvalThreshold: 8000,
    allowedCategories: ["wellness", "food", "learning", "health", "fitness", "travel", "telecom"],
    blockedCategories: [],
    maxProvidersPerPackage: 4,
    currency: "ALL",
  },
];

const employees: Employee[] = [
  {
    id: "emp_elira",
    companyId: ALBATECH_ID,
    name: "Elira Hoxha",
    role: "Product Designer",
    department: "Design",
    locale: "en-AL",
    currency: "ALL",
    avatarSeed: "elira-hoxha",
    monthlyBudget: 20000,
    budgetRemaining: 18500,
    preferences: ["wellness", "food", "learning"],
    interests: ["yoga", "specialty coffee", "design workshops"],
    history: ["ofr_yoga", "ofr_brunch"],
    streakWeeks: 3,
    points: 240,
  },
  {
    id: "emp_andi",
    companyId: ALBATECH_ID,
    name: "Andi Krasniqi",
    role: "Backend Engineer",
    department: "Engineering",
    locale: "en-AL",
    currency: "ALL",
    avatarSeed: "andi-krasniqi",
    monthlyBudget: 20000,
    budgetRemaining: 12000,
    preferences: ["fitness", "learning", "telecom"],
    interests: ["climbing", "AI", "5-a-side football"],
    history: ["ofr_gym_week"],
    streakWeeks: 1,
    points: 120,
  },
  {
    id: "emp_sara",
    companyId: ALBATECH_ID,
    name: "Sara Berisha",
    role: "Marketing Lead",
    department: "Marketing",
    locale: "en-AL",
    currency: "ALL",
    avatarSeed: "sara-berisha",
    monthlyBudget: 25000,
    budgetRemaining: 22000,
    preferences: ["food", "travel", "wellness"],
    interests: ["weekend trips", "brunch", "spa days"],
    history: ["ofr_daytrip", "ofr_brunch"],
    streakWeeks: 5,
    points: 410,
  },
];

const providers: Provider[] = [
  {
    id: "prov_motive",
    companyId: "cmp_motive",
    displayName: "Motive Studio",
    category: "wellness",
    marketId: "mkt_al",
    blurb: "Boutique yoga & breathwork studio in the heart of Blloku.",
    neighborhood: "Blloku",
    rating: 4.8,
    logoSeed: "motive",
    status: "active",
  },
  {
    id: "prov_nova",
    companyId: "cmp_nova",
    displayName: "Nova Recovery",
    category: "wellness",
    marketId: "mkt_al",
    blurb: "Sports recovery, deep-tissue massage and contrast therapy.",
    neighborhood: "Pazari i Ri",
    rating: 4.7,
    logoSeed: "nova",
    status: "active",
  },
  {
    id: "prov_green",
    companyId: "cmp_green",
    displayName: "Green Plate Blloku",
    category: "food",
    marketId: "mkt_al",
    blurb: "Seasonal, mostly-plant kitchen with all-day healthy brunch.",
    neighborhood: "Blloku",
    rating: 4.6,
    logoSeed: "green",
    status: "active",
  },
  {
    id: "prov_skill",
    companyId: "cmp_skill",
    displayName: "SkillSprint Tirana",
    category: "learning",
    marketId: "mkt_al",
    blurb: "Hands-on weekend workshops for tech & creative skills.",
    neighborhood: "Qendër",
    rating: 4.9,
    logoSeed: "skill",
    status: "active",
  },
  {
    id: "prov_smile",
    companyId: "cmp_smile",
    displayName: "Tirana Smile Care",
    category: "health",
    marketId: "mkt_al",
    blurb: "Modern dental clinic — cleaning, whitening and check-ups.",
    neighborhood: "Komuna e Parisit",
    rating: 4.5,
    logoSeed: "smile",
    status: "active",
  },
  {
    id: "prov_urban",
    companyId: "cmp_urban",
    displayName: "Urban Move",
    category: "fitness",
    marketId: "mkt_al",
    blurb: "Full-equipment gym & climbing wall near Don Bosko.",
    neighborhood: "Don Bosko",
    rating: 4.4,
    logoSeed: "urban",
    status: "active",
  },
  {
    id: "prov_weekend",
    companyId: "cmp_weekend",
    displayName: "Weekend South",
    category: "travel",
    marketId: "mkt_al",
    blurb: "Curated day-trips and weekend escapes to the Albanian Riviera.",
    neighborhood: "Tirana",
    rating: 4.7,
    logoSeed: "weekend",
    status: "active",
  },
  {
    id: "prov_connect",
    companyId: "cmp_connect",
    displayName: "Connect Mobile",
    category: "telecom",
    marketId: "mkt_al",
    blurb: "Mobile data & device perks for teams on the move.",
    neighborhood: "Qendër",
    rating: 4.2,
    logoSeed: "connect",
    status: "active",
  },
];

const offers: Offer[] = [
  // Motive Studio — wellness
  { id: "ofr_yoga", providerId: "prov_motive", title: "Yoga Day Pass", description: "Unlimited classes for a day — vinyasa, yin and breathwork.", category: "wellness", price: 1500, currency: "ALL", tags: ["relax", "mindful", "beginner"], availability: ["weekend", "weekday", "morning"], durationLabel: "Day pass", popularity: 82, isFresh: true },
  { id: "ofr_yoga_sunrise", providerId: "prov_motive", title: "Sunrise Rooftop Yoga", description: "Golden-hour rooftop flow over the Tirana skyline.", category: "wellness", price: 1800, currency: "ALL", tags: ["relax", "scenic", "morning"], availability: ["weekend", "morning"], durationLabel: "75 min", popularity: 74, isFridayDrop: true },
  { id: "ofr_meditation", providerId: "prov_motive", title: "Meditation & Breathwork", description: "Guided session to reset a stressful week.", category: "wellness", price: 1200, currency: "ALL", tags: ["relax", "stress", "calm"], availability: ["weekday", "evening", "weekend"], durationLabel: "45 min", popularity: 69 },

  // Nova Recovery — wellness
  { id: "ofr_massage", providerId: "prov_nova", title: "Recovery Massage", description: "60-minute full-body recovery massage by sports therapists.", category: "wellness", price: 5500, currency: "ALL", tags: ["relax", "recovery", "premium"], availability: ["weekend", "weekday", "evening"], durationLabel: "60 min", popularity: 88, isFresh: true },
  { id: "ofr_massage_deep", providerId: "prov_nova", title: "Sports Deep-Tissue Massage", description: "Targeted deep-tissue work for tight backs and shoulders.", category: "wellness", price: 6200, currency: "ALL", tags: ["recovery", "premium", "sport"], availability: ["weekend", "evening"], durationLabel: "75 min", popularity: 71 },
  { id: "ofr_sauna", providerId: "prov_nova", title: "Sauna + Cold Plunge Ritual", description: "Contrast therapy circuit — sauna, cold plunge, rest.", category: "wellness", price: 3200, currency: "ALL", tags: ["relax", "recovery", "calm"], availability: ["weekend", "evening"], durationLabel: "90 min", popularity: 77, isFridayDrop: true },

  // Green Plate Blloku — food
  { id: "ofr_brunch", providerId: "prov_green", title: "Healthy Brunch Set", description: "Seasonal brunch plate, cold-press juice and coffee.", category: "food", price: 2200, currency: "ALL", tags: ["healthy", "light", "social"], availability: ["weekend", "weekday", "morning"], durationLabel: "For 1", popularity: 90, isFresh: true },
  { id: "ofr_bowl", providerId: "prov_green", title: "Plant-Based Lunch Bowl", description: "Grain bowl with seasonal veg, legumes and tahini.", category: "food", price: 1600, currency: "ALL", tags: ["healthy", "light", "vegan"], availability: ["weekday", "weekend"], durationLabel: "For 1", popularity: 79 },
  { id: "ofr_juice", providerId: "prov_green", title: "Cold-Press Juice Cleanse", description: "Three-bottle cold-press cleanse to go.", category: "food", price: 2400, currency: "ALL", tags: ["healthy", "detox"], availability: ["weekday", "weekend"], durationLabel: "3 bottles", popularity: 63 },

  // SkillSprint Tirana — learning
  { id: "ofr_excel_ai", providerId: "prov_skill", title: "AI for Excel Workshop", description: "Automate reports and analysis with AI — hands-on.", category: "learning", price: 7500, currency: "ALL", tags: ["skill", "career", "ai"], availability: ["weekend"], durationLabel: "3 hours", popularity: 81, isFresh: true },
  { id: "ofr_ux", providerId: "prov_skill", title: "UX Design Crash Course", description: "Practical UX fundamentals for product teams.", category: "learning", price: 8500, currency: "ALL", tags: ["skill", "design", "career"], availability: ["weekend"], durationLabel: "Half day", popularity: 72 },
  { id: "ofr_speaking", providerId: "prov_skill", title: "Public Speaking Bootcamp", description: "Confidence, structure and delivery in one intensive.", category: "learning", price: 6000, currency: "ALL", tags: ["skill", "career", "confidence"], availability: ["weekend", "evening"], durationLabel: "3 hours", popularity: 66 },

  // Tirana Smile Care — health
  { id: "ofr_dental", providerId: "prov_smile", title: "Dental Cleaning Voucher", description: "Professional scaling, polish and check-up.", category: "health", price: 4800, currency: "ALL", tags: ["health", "essential"], availability: ["weekday", "weekend"], durationLabel: "45 min", popularity: 70 },
  { id: "ofr_whitening", providerId: "prov_smile", title: "Teeth Whitening Session", description: "In-clinic whitening for a brighter smile.", category: "health", price: 7000, currency: "ALL", tags: ["health", "premium"], availability: ["weekday"], durationLabel: "60 min", popularity: 58 },

  // Urban Move — fitness
  { id: "ofr_gym_week", providerId: "prov_urban", title: "Weekly Gym Pass", description: "7 days of full gym & class access.", category: "fitness", price: 3500, currency: "ALL", tags: ["fitness", "active", "popular"], availability: ["weekday", "weekend"], durationLabel: "7 days", popularity: 85, isFresh: true },
  { id: "ofr_gym_month", providerId: "prov_urban", title: "Monthly Gym Pass", description: "30 days unlimited — gym, classes and sauna.", category: "fitness", price: 9000, currency: "ALL", tags: ["fitness", "active", "value"], availability: ["weekday", "weekend"], durationLabel: "30 days", popularity: 76 },
  { id: "ofr_boulder", providerId: "prov_urban", title: "Bouldering Intro Session", description: "Guided intro to indoor climbing with gear included.", category: "fitness", price: 2000, currency: "ALL", tags: ["fitness", "fun", "social"], availability: ["weekend", "evening"], durationLabel: "90 min", popularity: 68, isFridayDrop: true },

  // Weekend South — travel
  { id: "ofr_daytrip", providerId: "prov_weekend", title: "Riviera Day-Trip Voucher", description: "Guided day-trip to the southern coast — transport included.", category: "travel", price: 3000, currency: "ALL", tags: ["travel", "nature", "weekend"], availability: ["weekend"], durationLabel: "1 day", popularity: 83, isFresh: true },
  { id: "ofr_escape", providerId: "prov_weekend", title: "Riviera Weekend Escape", description: "Two nights on the Albanian Riviera, breakfast included.", category: "travel", price: 8800, currency: "ALL", tags: ["travel", "premium", "weekend"], availability: ["weekend"], durationLabel: "2 nights", popularity: 64, isFridayDrop: true },

  // Connect Mobile — telecom
  { id: "ofr_data", providerId: "prov_connect", title: "20GB Data Perk", description: "20GB mobile data top-up valid for 30 days.", category: "telecom", price: 1200, currency: "ALL", tags: ["telecom", "essential", "value"], availability: ["weekday", "weekend"], durationLabel: "30 days", popularity: 75 },
];

function pkgItems(ids: [string, number][]): Package["items"] {
  return ids.map(([offerId, sortOrder], i) => {
    const offer = offers.find((o) => o.id === offerId)!;
    return { offerId, providerId: offer.providerId, price: offer.price, sortOrder: sortOrder ?? i };
  });
}

function pkgTotal(ids: string[]): number {
  return ids.reduce((sum, id) => sum + offers.find((o) => o.id === id)!.price, 0);
}

const curatedPackages: Package[] = [
  {
    id: "pkg_reset",
    source: "curated",
    title: "Tirana Reset",
    tagline: "Unwind across the city in one weekend",
    reason: "A relaxation arc that pairs gentle movement, deep recovery and a nourishing meal — ideal after a heavy week.",
    items: pkgItems([["ofr_yoga", 0], ["ofr_massage", 1], ["ofr_brunch", 2]]),
    total: pkgTotal(["ofr_yoga", "ofr_massage", "ofr_brunch"]),
    currency: "ALL",
    categoryTags: ["wellness", "food"],
    heroSeed: "tirana-reset",
    image: "/routes/tirana-reset.png",
  },
  {
    id: "pkg_healthy",
    source: "curated",
    title: "Healthy Week",
    tagline: "Stay active, eat clean, stay connected",
    reason: "Keeps momentum all week: a gym pass to move daily, a clean brunch and data so you never miss a class booking.",
    items: pkgItems([["ofr_gym_week", 0], ["ofr_brunch", 1], ["ofr_data", 2]]),
    total: pkgTotal(["ofr_gym_week", "ofr_brunch", "ofr_data"]),
    currency: "ALL",
    categoryTags: ["fitness", "food", "telecom"],
    heroSeed: "healthy-week",
  },
  {
    id: "pkg_skill",
    source: "curated",
    title: "Skill Recharge",
    tagline: "Level up and refuel",
    reason: "Invest in a career-boosting AI workshop, then refuel with a healthy brunch between sessions.",
    items: pkgItems([["ofr_excel_ai", 0], ["ofr_brunch", 1]]),
    total: pkgTotal(["ofr_excel_ai", "ofr_brunch"]),
    currency: "ALL",
    categoryTags: ["learning", "food"],
    heroSeed: "skill-recharge",
  },
  {
    id: "pkg_escape",
    source: "curated",
    title: "Weekend Escape Lite",
    tagline: "Get out of the city without overspending",
    reason: "A budget-friendly taste of the coast: a guided day-trip, a brunch for the road and data to navigate.",
    items: pkgItems([["ofr_daytrip", 0], ["ofr_brunch", 1], ["ofr_data", 2]]),
    total: pkgTotal(["ofr_daytrip", "ofr_brunch", "ofr_data"]),
    currency: "ALL",
    categoryTags: ["travel", "food", "telecom"],
    heroSeed: "weekend-escape",
  },
];

const activity: ActivityEvent[] = [
  { id: "act_seed_1", actorType: "system", actorId: "system", eventType: "seeded", message: "Marketplace seeded with 8 Tirana providers and 20 offers.", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString() },
  { id: "act_seed_2", actorType: "provider", actorId: "prov_weekend", eventType: "offer_new", message: "Weekend South added 'Riviera Weekend Escape' to Friday Drops.", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString() },
  { id: "act_seed_3", actorType: "employee", actorId: "emp_sara", eventType: "streak", message: "Sara reached a 5-week wellness streak.", createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString() },
];

// Demo login accounts. Elira is the signed-in employee; her colleagues exist as
// data the admin reviews. Passwords hashed at seed time.
function users(): User[] {
  const hash = hashSync(DEMO_PASSWORD, 10);
  return [
    {
      id: "usr_employee",
      email: "employee@perkline.demo",
      passwordHash: hash,
      role: "employee",
      name: "Elira Hoxha",
      companyId: ALBATECH_ID,
      employeeId: "emp_elira",
      avatarSeed: "elira-hoxha",
    },
    {
      id: "usr_admin",
      email: "admin@perkline.demo",
      passwordHash: hash,
      role: "company_admin",
      name: "Besa Kola",
      companyId: ALBATECH_ID,
      title: "People & Culture Lead",
      avatarSeed: "besa-kola",
    },
    {
      id: "usr_finance",
      email: "finance@perkline.demo",
      passwordHash: hash,
      role: "finance_admin",
      name: "Ardit Mema",
      companyId: ALBATECH_ID,
      title: "Finance Controller",
      avatarSeed: "ardit-mema",
    },
  ];
}

// Elira starts with one VERIFIED bank destination so a bonus can be paid
// immediately, plus a pending crypto method to demo the verify flow.
const payoutMethods: PayoutMethod[] = [
  {
    id: "pom_tok_bankseed",
    employeeId: "emp_elira",
    type: "bank",
    label: "Personal IBAN",
    status: "verified",
    isDefault: true,
    currency: "ALL",
    environment: "sandbox",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(),
    verifiedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 11).toISOString(),
    holderName: "Elira Hoxha",
    country: "AL",
    bankName: "BKT — Banka Kombëtare Tregtare",
    bic: "NCBAALTX",
    accountType: "checking",
    mask: "AL•• •••• •••• ••17",
    bankToken: "btok_seed_417",
  },
];

// Company is funded (sandbox) so the finance balance/ledger demo has cleared funds.
const fundingSources: CompanyFundingSource[] = [
  {
    id: "fund_seed_1",
    companyId: ALBATECH_ID,
    provider: "Wise",
    label: "AlbaTech operating balance (sandbox)",
    currency: "ALL",
    status: "active",
    mask: "Wise •• 8842",
  },
];

const ledger: BalanceLedgerEntry[] = [
  { id: "led_seed_all", companyId: ALBATECH_ID, type: "funding", amount: 500000, currency: "ALL", memo: "Initial sandbox funding", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString() },
  { id: "led_seed_eur", companyId: ALBATECH_ID, type: "funding", amount: 5000, currency: "EUR", memo: "Initial sandbox funding", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString() },
  { id: "led_seed_usd", companyId: ALBATECH_ID, type: "funding", amount: 5000, currency: "USD", memo: "Initial sandbox funding", createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString() },
];

// Compliance baseline: company cleared in sandbox; live still gated by env flag.
const complianceCases: ComplianceCase[] = [
  {
    id: "cmp_case_albatech",
    subjectType: "company",
    subjectId: ALBATECH_ID,
    kyc: "cleared",
    aml: "cleared",
    sanctions: "cleared",
    hold: false,
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 8).toISOString(),
  },
];

const payoutVerifications: PayoutMethodVerification[] = [];
const bonusCampaigns: BonusCampaign[] = [];
const bonusPayouts: BonusPayout[] = [];
const payoutEvents: PayoutEvent[] = [];
const notifications: Notification[] = [];
const verificationAttempts: VerificationAttempt[] = [];
const providerConnections: ProviderConnection[] = [];
const payoutAttempts: PayoutAttempt[] = [];
const webhookEvents: WebhookEvent[] = [];

const destinationTimestamp = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString();

/**
 * Canonical benefit/settlement destinations.
 * Employee rows are internal Perkline Credits only. Provider rows store masked or
 * hosted connection metadata; no raw card data, PayPal password, or full IBAN.
 */
const paymentDestinations: PaymentDestination[] = [
  {
    id: "dest_wallet_elira",
    ownerId: "emp_elira",
    ownerType: "employee",
    type: "employee_perx_wallet",
    currency: "ALL",
    status: "active",
    createdAt: destinationTimestamp,
    updatedAt: destinationTimestamp,
  },
  {
    id: "dest_wallet_andi",
    ownerId: "emp_andi",
    ownerType: "employee",
    type: "employee_perx_wallet",
    currency: "ALL",
    status: "active",
    createdAt: destinationTimestamp,
    updatedAt: destinationTimestamp,
  },
  {
    id: "dest_wallet_sara",
    ownerId: "emp_sara",
    ownerType: "employee",
    type: "employee_perx_wallet",
    currency: "ALL",
    status: "active",
    createdAt: destinationTimestamp,
    updatedAt: destinationTimestamp,
  },
  {
    id: "dest_bank_motive",
    ownerId: "prov_motive",
    ownerType: "provider",
    type: "provider_bank_settlement",
    legalBusinessName: "Motive Studio sh.p.k.",
    country: "AL",
    currency: "ALL",
    ibanMask: "AL•• •••• •••• •417",
    bic: "NCBAALTX",
    status: "active",
    createdAt: destinationTimestamp,
    updatedAt: destinationTimestamp,
  },
  {
    id: "dest_bank_nova",
    ownerId: "prov_nova",
    ownerType: "provider",
    type: "provider_bank_settlement",
    legalBusinessName: "Nova Recovery sh.p.k.",
    country: "AL",
    currency: "ALL",
    ibanMask: "AL•• •••• •••• •921",
    bic: "SGSBALTX",
    status: "active",
    createdAt: destinationTimestamp,
    updatedAt: destinationTimestamp,
  },
  {
    id: "dest_paypal_green",
    ownerId: "prov_green",
    ownerType: "provider",
    type: "provider_paypal_business",
    currency: "ALL",
    connectionState: "connected",
    verifiedBusinessEmailMask: "p•••@greenplate.al",
    status: "connected",
    createdAt: destinationTimestamp,
    updatedAt: destinationTimestamp,
  },
  ...["prov_skill", "prov_smile", "prov_urban", "prov_weekend", "prov_connect"].map(
    (providerId): PaymentDestination => ({
      id: `dest_processor_${providerId}`,
      ownerId: providerId,
      ownerType: "provider",
      type: "provider_card_processor",
      currency: "ALL",
      processor: "TeamSystem Payments Demo",
      connectionState: "connected",
      hostedAccountToken: `acct_demo_${providerId.replace("prov_", "")}`,
      status: "connected",
      createdAt: destinationTimestamp,
      updatedAt: destinationTimestamp,
    }),
  ),
];

const questionnaires: QuestionnaireAnswer[] = [
  {
    employeeId: "emp_elira",
    goals: ["reduce stress", "stay healthy"],
    stressLevel: 4,
    preferredCategories: ["wellness", "food"],
    groupPreference: "solo",
    timePreference: "weekend",
    priority: "wellness",
    completedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
];

export function buildSeed(): SeedData {
  // Deep clone so the live store can mutate freely without touching the seed.
  return JSON.parse(
    JSON.stringify({
      markets,
      companies,
      employees,
      policies,
      providers,
      offers,
      packages: curatedPackages,
      activity,
      users: users(),
      paymentDestinations,
      questionnaires,
      audit: [] as AuditEvent[],
      payoutMethods,
      payoutVerifications,
      bonusCampaigns,
      bonusPayouts,
      payoutEvents,
      notifications,
      verificationAttempts,
      providerConnections,
      fundingSources,
      ledger,
      payoutAttempts,
      webhookEvents,
      complianceCases,
    }),
  );
}
