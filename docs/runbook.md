# Perkline payouts — operations runbook

## Modes at a glance

| State | What happens | How to reach it |
|---|---|---|
| **Sandbox (default)** | Rails unconfigured → labelled **Sandbox Simulator**. Settlement via internal HMAC-signed event. Never shown as live money. | Run with no provider env vars. |
| **Sandbox + provider** | Real provider sandbox calls (e.g. PayPal sandbox) but `LIVE_PAYOUTS_ENABLED=false` keeps environment = sandbox. | Set `PAYPAL_*` with `PAYPAL_ENV=sandbox`. |
| **Live** | Real money. Payout `confirmed` only from a verified provider webhook. | Provider `*_ENV=live` **and** `LIVE_PAYOUTS_ENABLED=true` **and** compliance cleared. |

## Local / sandbox setup

```bash
cp .env.example .env
# (optional) PayPal sandbox: set PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET / PAYPAL_ENV=sandbox / PAYPAL_WEBHOOK_ID
npm install && npm run dev
```
No keys are required — the sandbox simulator runs and is clearly labelled. Demo logins:
`employee@perkline.demo`, `admin@perkline.demo`, `finance@perkline.demo` (password `demo1234`).

## Encryption keys (rotation)

```bash
# Generate a 32-byte key
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
# .env
ENCRYPTION_KEYS={"k1":"<base64>"}
ENCRYPTION_ACTIVE_KEY_ID=k1
```
Rotation: add `k2`, set `ENCRYPTION_ACTIVE_KEY_ID=k2`, keep `k1`. New writes use `k2`; old ciphertext
(which embeds its keyId) still decrypts. Remove `k1` only after re-encrypting historical rows.

## Go-live checklist (all required before `LIVE_PAYOUTS_ENABLED=true`)

1. Legal entity verified; provider business onboarding (Wise / PayPal) complete.
2. KYC/KYB + AML + sanctions screening **cleared** (company ComplianceCase = cleared, no hold).
3. Corridors/currencies confirmed in the provider dashboard for Albania/ALL + EUR/USD.
4. Real `ENCRYPTION_KEYS`, `AUTH_SECRET`, provider creds set with `*_ENV=live`.
5. Webhooks configured (`PAYPAL_WEBHOOK_ID`) and signature verification passing.
6. Funding source connected via provider-hosted flow (no raw bank/card capture).
7. Set `LIVE_PAYOUTS_ENABLED=true`. Verify a small real payout end-to-end.

## Operating procedures

- **Approve a payout:** finance opens `/finance`, reviews destination mask + reason, confirms. Amounts
  ≥ 50,000 require a **second distinct approver** (dual control).
- **Failed payout:** appears as `failed` with reason → **Retry** (idempotency key prevents double-send).
- **Reconciliation:** the `/finance` "Reconciliation" panel lists verified provider webhooks. Live
  payouts move `paid → confirmed` only when a signed webhook matches the provider transaction id.
- **Webhook endpoint:** `POST /api/webhooks/paypal` — verifies the signature via PayPal's
  verify-webhook-signature API, records a `WebhookEvent` idempotently, and settles the matching payout.
- **Demo reset:** `POST /api/reset` (or the header button) restores the seeded sandbox state.

## Incident notes

- A payout never auto-confirms in live mode without a verified webhook — if a webhook is missed,
  the payout stays `paid` (funds reserved via ledger hold) until reconciled.
- Suspicious activity: set `ComplianceCase.hold = true` to block further live settlement for a subject.
