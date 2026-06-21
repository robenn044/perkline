import { z } from "zod";

/**
 * Zod schemas for every server input. Each API route parses with these before
 * touching the store, so malformed or malicious payloads are rejected at the
 * boundary with safe, structured errors.
 */

const categoryEnum = z.enum([
  "wellness",
  "food",
  "learning",
  "health",
  "fitness",
  "travel",
  "telecom",
]);

export const loginSchema = z.object({
  email: z.string().email().max(120),
  password: z.string().min(1).max(200),
});

const packageItemSchema = z.object({
  offerId: z.string().min(1).max(60),
  providerId: z.string().min(1).max(60),
  price: z.number().int().nonnegative(),
  sortOrder: z.number().int().nonnegative(),
});

export const packageSchema = z.object({
  id: z.string().max(80).optional().default(""),
  source: z.enum(["curated", "ai", "manual"]),
  title: z.string().min(1).max(120),
  tagline: z.string().max(200).default(""),
  reason: z.string().max(600).default(""),
  items: z.array(packageItemSchema).min(1).max(6),
  total: z.number().int().nonnegative(),
  currency: z.enum(["ALL", "EUR", "USD"]),
  categoryTags: z.array(categoryEnum).min(1),
  heroSeed: z.string().max(120).default("perx"),
  confidence: z.number().min(0).max(1).optional(),
});

export const submitRequestSchema = z.object({
  package: packageSchema,
  origin: z.enum(["concierge", "route", "offer"]).default("offer"),
});

export const conciergeSchema = z.object({
  prompt: z.string().min(2).max(400),
});

export const decisionSchema = z.object({
  comment: z.string().max(400).optional(),
});

export const rejectDecisionSchema = z.object({
  comment: z.string().min(2).max(400),
});

export const bulkDecisionSchema = z
  .object({
    requestIds: z.array(z.string().min(1).max(80)).min(1).max(20),
    action: z.enum(["approve", "reject"]),
    comment: z.string().max(400).optional(),
  })
  .superRefine((value, context) => {
    if (value.action === "reject" && !value.comment?.trim()) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["comment"],
        message: "A rejection reason is required.",
      });
    }
  });

export const employeePerxWalletDestinationSchema = z
  .object({
    type: z.literal("employee_perx_wallet"),
  })
  .strict();

const providerBankSettlementSchema = z
  .object({
    type: z.literal("provider_bank_settlement"),
    providerId: z.string().min(1).max(60),
    legalBusinessName: z.string().min(2).max(120),
    country: z.string().length(2).transform((value) => value.toUpperCase()),
    currency: z.enum(["ALL", "EUR", "USD"]),
    iban: z.string().min(10).max(42),
    bic: z.string().min(8).max(11).optional(),
  })
  .strict();

const providerPayPalBusinessSchema = z
  .object({
    type: z.literal("provider_paypal_business"),
    providerId: z.string().min(1).max(60),
    currency: z.enum(["ALL", "EUR", "USD"]),
    verifiedBusinessEmail: z.string().email().max(120),
  })
  .strict();

const providerCardProcessorSchema = z
  .object({
    type: z.literal("provider_card_processor"),
    providerId: z.string().min(1).max(60),
    currency: z.enum(["ALL", "EUR", "USD"]),
  })
  .strict();

export const providerPaymentDestinationSchema = z.discriminatedUnion("type", [
  providerBankSettlementSchema,
  providerPayPalBusinessSchema,
  providerCardProcessorSchema,
]);

export const paymentDestinationSchema = z.discriminatedUnion("type", [
  employeePerxWalletDestinationSchema,
  providerBankSettlementSchema,
  providerPayPalBusinessSchema,
  providerCardProcessorSchema,
]);

export const questionnaireSchema = z.object({
  goals: z.array(z.string().max(40)).max(6),
  stressLevel: z.number().int().min(1).max(5),
  preferredCategories: z.array(categoryEnum).min(1).max(7),
  groupPreference: z.enum(["solo", "team", "either"]),
  timePreference: z.enum(["weekday", "weekend", "either"]),
  priority: z.enum(["wellness", "learning", "travel", "balance"]),
});

export const profileSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  role: z.string().min(1).max(80).optional(),
  department: z.string().min(1).max(80).optional(),
  locale: z.enum(["en-AL", "sq-AL", "it-IT", "es-ES"]).optional(),
  currency: z.enum(["ALL", "EUR", "USD"]).optional(),
  interests: z.array(z.string().max(40)).max(12).optional(),
  preferences: z.array(categoryEnum).max(7).optional(),
});

export const policySchema = z.object({
  monthlyLimit: z.number().int().min(1000).max(1000000).optional(),
  approvalThreshold: z.number().int().min(0).max(1000000).optional(),
  allowedCategories: z.array(categoryEnum).min(1).optional(),
  maxProvidersPerPackage: z.number().int().min(1).max(6).optional(),
});

export const providerStatusSchema = z.object({
  status: z.enum(["active", "pending_review", "paused"]),
});

// --- Perkline Bonus payouts ---

const currencyEnum = z.enum(["ALL", "EUR", "USD"]);
const cryptoNetworkEnum = z.enum(["ETH-Sepolia", "MATIC-Amoy", "BTC-Testnet"]);

/**
 * Add a payout method. We accept a raw IBAN / email / testnet address ONLY to
 * validate + mask it server-side; the raw value is never persisted.
 */
export const addPayoutMethodSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("bank"),
    label: z.string().min(1).max(40),
    currency: currencyEnum,
    holderName: z.string().min(2).max(80),
    country: z.string().length(2).optional(),
    iban: z.string().min(10).max(42),
    bic: z.string().min(8).max(11).optional(),
    bankName: z.string().min(2).max(80).optional(),
    accountType: z.enum(["checking", "savings"]).optional(),
  }),
  z.object({
    type: z.literal("paypal"),
    label: z.string().min(1).max(40),
    currency: currencyEnum,
    email: z.string().email().max(120),
  }),
  z.object({
    type: z.literal("crypto"),
    label: z.string().min(1).max(40),
    currency: currencyEnum,
    network: cryptoNetworkEnum,
    asset: z.string().min(2).max(10),
    address: z.string().min(20).max(80),
  }),
]);

export const createBonusSchema = z.object({
  template: z.enum(["team_challenge", "recognition", "custom"]),
  name: z.string().min(2).max(80),
  reason: z.string().min(2).max(200),
  displayCurrency: currencyEnum,
  scheduledAt: z.string().max(40).optional(),
  items: z
    .array(
      z.object({
        employeeId: z.string().min(1).max(60),
        amount: z.number().int().min(1).max(10_000_000),
        testFailFirst: z.boolean().optional(),
      }),
    )
    .min(1)
    .max(25),
});
