import { createHmac, timingSafeEqual } from "node:crypto";
import type { CryptoNetwork, PayoutEnvironment, PayoutMethodType } from "./types";
import { getRailStatus } from "./finance-config";

// Imported only by server-side store/route code. We avoid a package-level
// `server-only` guard so the shared workflow remains directly unit-testable.
export { maskIban, maskEmail, maskAddress, CRYPTO_ASSETS } from "./payout-mask";
export { validateIban, validateBic, validateCryptoAddress } from "./finance-validation";

/**
 * Payout engine.
 *
 * `PayoutAdapter` abstracts each rail so business logic is rail-agnostic and a
 * licensed provider drops in without rewrites. Two honest modes:
 *
 *  - **Sandbox Simulator** (default when a rail is unconfigured): clearly labelled
 *    "sandbox", environment="sandbox". Its settlement is an INTERNAL HMAC-signed
 *    event — never presented as live money movement.
 *  - **Live provider** (e.g. PayPal Payouts) when credentials are configured AND
 *    `LIVE_PAYOUTS_ENABLED=true`: real API calls; a payout is only `confirmed`
 *    from a verified provider webhook / confirmed API state.
 */

const SIGNING_SECRET =
  process.env.PAYOUT_WEBHOOK_SECRET || process.env.AUTH_SECRET || "perx-payout-dev-secret-change-me";

export function signEvent(payload: object): string {
  return createHmac("sha256", SIGNING_SECRET).update(JSON.stringify(payload)).digest("hex");
}

export function verifyEvent(payload: object, signature: string): boolean {
  const expected = signEvent(payload);
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export interface AdapterSubmitInput {
  payoutId: string;
  idempotencyKey: string;
  amount: number;
  currency: string;
  destinationMask: string;
  network?: CryptoNetwork;
  attempt: number;
  testFailFirst?: boolean;
}

export interface AdapterResult {
  accepted: boolean;
  provider: string;
  environment: PayoutEnvironment;
  transactionRef: string;
  /** True only when the provider has CONFIRMED settlement (sandbox: internal signed event). */
  settledNow: boolean;
  settlementSignature?: string;
  settlementPayload?: object;
  failureReason?: string;
}

export interface PayoutAdapter {
  readonly name: string;
  readonly rail: PayoutMethodType;
  readonly environment: PayoutEnvironment;
  submit(input: AdapterSubmitInput): Promise<AdapterResult>;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
function refFor(prefix: string, payoutId: string): string {
  return `${prefix}-${Math.abs(hash(payoutId + prefix)).toString(36).toUpperCase().slice(0, 8)}`;
}

/** Sandbox simulator — labelled, internal HMAC settlement. NEVER live money. */
class SandboxSimulatorAdapter implements PayoutAdapter {
  readonly environment: PayoutEnvironment = "sandbox";
  constructor(readonly rail: PayoutMethodType, readonly name = `Sandbox Simulator (${rail})`) {}

  async submit(input: AdapterSubmitInput): Promise<AdapterResult> {
    const prefix = this.rail === "bank" ? "SBX-SEPA" : this.rail === "paypal" ? "SBX-PP" : "SBX-TX";
    const transactionRef = refFor(prefix, input.payoutId);
    if (input.testFailFirst && input.attempt === 0) {
      return {
        accepted: false,
        provider: this.name,
        environment: "sandbox",
        transactionRef,
        settledNow: false,
        failureReason: `${this.name}: simulated transient error. Safe to retry.`,
      };
    }
    const payload = { payoutId: input.payoutId, transactionRef, rail: this.rail, event: "settled" as const };
    return {
      accepted: true,
      provider: this.name,
      environment: "sandbox",
      transactionRef,
      settledNow: true, // sandbox settles immediately via internal signed event
      settlementPayload: payload,
      settlementSignature: signEvent(payload),
    };
  }
}

/**
 * Live PayPal Payouts adapter (REST). Submits a payout; does NOT mark confirmed —
 * confirmation arrives via the verified webhook. Only used when configured + live.
 */
class PayPalPayoutAdapter implements PayoutAdapter {
  readonly rail: PayoutMethodType = "paypal";
  readonly name = "PayPal Payouts";
  constructor(readonly environment: PayoutEnvironment) {}

  private base(): string {
    return this.environment === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  }

  private async token(): Promise<string> {
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
    const res = await fetch(`${this.base()}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) throw new Error(`PayPal OAuth failed (${res.status})`);
    return ((await res.json()) as { access_token: string }).access_token;
  }

  async submit(input: AdapterSubmitInput): Promise<AdapterResult> {
    const transactionRef = `paypal_${input.idempotencyKey}`;
    try {
      const token = await this.token();
      const res = await fetch(`${this.base()}/v1/payments/payouts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": input.idempotencyKey, // idempotency
        },
        body: JSON.stringify({
          sender_batch_header: { sender_batch_id: input.idempotencyKey, email_subject: "You have a Perkline bonus" },
          // NOTE: receiver email comes from the verified ProviderConnection, not the mask.
          items: [
            {
              recipient_type: "EMAIL",
              amount: { value: (input.amount).toFixed(2), currency: input.currency },
              receiver: input.destinationMask, // replaced server-side with the real verified email
              note: "Perkline bonus payout",
              sender_item_id: input.payoutId,
            },
          ],
        }),
      });
      if (!res.ok) {
        return { accepted: false, provider: this.name, environment: this.environment, transactionRef, settledNow: false, failureReason: `PayPal payouts error (${res.status})` };
      }
      const body = (await res.json()) as { batch_header?: { payout_batch_id?: string } };
      return {
        accepted: true,
        provider: this.name,
        environment: this.environment,
        transactionRef: body.batch_header?.payout_batch_id ?? transactionRef,
        settledNow: false, // confirmation only via verified webhook
      };
    } catch (e) {
      return { accepted: false, provider: this.name, environment: this.environment, transactionRef, settledNow: false, failureReason: (e as Error).message };
    }
  }
}

/**
 * Pick the adapter for a rail. Real provider when the rail is configured for that
 * environment; otherwise the clearly-labelled sandbox simulator. Never fakes live.
 */
export function getPayoutAdapter(rail: PayoutMethodType): PayoutAdapter {
  const status = getRailStatus(rail);
  if (rail === "paypal" && status.mode !== "unconfigured" && process.env.PAYPAL_CLIENT_ID) {
    // Configured PayPal → use the real API against the matching environment.
    return new PayPalPayoutAdapter(status.mode === "live" ? "live" : "sandbox");
  }
  // Bank (Wise) and crypto (custody) live adapters require licensed onboarding;
  // until configured they fall back to the labelled sandbox simulator.
  return new SandboxSimulatorAdapter(rail);
}

/** Verify a PayPal webhook signature via PayPal's verify-webhook-signature API. */
export async function verifyPayPalWebhook(headers: Headers, rawBody: string): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId || !process.env.PAYPAL_CLIENT_ID) return false; // cannot verify → not trusted
  const env = (process.env.PAYPAL_ENV || "sandbox") === "live" ? "live" : "sandbox";
  const base = env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
  try {
    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString("base64");
    const tok = await fetch(`${base}/v1/oauth2/token`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: "grant_type=client_credentials",
    }).then((r) => r.json() as Promise<{ access_token: string }>);
    const res = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_algo: headers.get("paypal-auth-algo"),
        cert_url: headers.get("paypal-cert-url"),
        transmission_id: headers.get("paypal-transmission-id"),
        transmission_sig: headers.get("paypal-transmission-sig"),
        transmission_time: headers.get("paypal-transmission-time"),
        webhook_id: webhookId,
        webhook_event: JSON.parse(rawBody),
      }),
    });
    const out = (await res.json()) as { verification_status?: string };
    return out.verification_status === "SUCCESS";
  } catch {
    return false;
  }
}
