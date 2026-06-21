import { NextResponse } from "next/server";
import { rewardsPayoutsEnabled } from "@/lib/feature-flags";
import { verifyPayPalWebhook } from "@/lib/payout-engine";
import { confirmPayoutFromWebhook } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PayPal Payouts webhook. The ONLY path that confirms a LIVE payout — and only
 * after PayPal's verify-webhook-signature API validates the message. Idempotent
 * via the PayPal event id. Sandbox-simulator payouts never reach here.
 */
export async function POST(req: Request) {
  if (!rewardsPayoutsEnabled()) return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  const raw = await req.text();
  const signatureValid = await verifyPayPalWebhook(req.headers, raw);

  let event: {
    id?: string;
    event_type?: string;
    resource?: { batch_header?: { payout_batch_id?: string; batch_status?: string }; payout_item_id?: string };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const providerTxnId = event.resource?.batch_header?.payout_batch_id;
  const eventType = event.event_type ?? "unknown";
  const dedupeKey = `paypal:${event.id ?? providerTxnId ?? raw.length}`;

  // SUCCESS events settle; DENIED/FAILED are recorded but don't confirm.
  const isSuccess = /SUCCESS|COMPLETED|PROCESSED/i.test(eventType);

  const result = confirmPayoutFromWebhook({
    provider: "PayPal Payouts",
    eventType,
    providerTxnId,
    signatureValid: signatureValid && isSuccess,
    dedupeKey,
  });

  // Always 200 on a well-formed, signature-checked request so the provider stops
  // retrying; the internal result is recorded in the WebhookEvent ledger.
  if (!signatureValid) return NextResponse.json({ ok: false, error: "Signature not verified." }, { status: 400 });
  return NextResponse.json({ ok: result.ok });
}
