# Provider Decision Record — Perkline Bonus payout rails

> Status: **prototype foundation**. Live payouts are **OFF** (`LIVE_PAYOUTS_ENABLED=false`) until a
> legal entity, licensed providers, KYC/AML + sanctions screening, and compliance sign-off are in
> place. This record captures the rail selection, why, and what each requires to go live.

## Context

- **Legal entity / market:** Albania-first (Tirana). Employer (company) is the funding party; the
  employee is the payee. Payout currencies in scope: **ALL, EUR, USD**.
- **Two separate money flows:** (1) benefit purchases = employer-approved **provider** payments
  (`ProviderPaymentSplit` + `Voucher`) — unchanged; (2) **Perkline Bonus** = employer→employee reward
  payouts via the rails below. These are kept strictly separate in code and data.
- **Corridors required:** payout INTO Albanian bank accounts (ALL), SEPA (EUR), and international
  (USD); PayPal verified-recipient payouts; crypto on testnet (dev) only.

## Rails

### Bank — **Wise (TransferWise) Platform / Payouts API**
- **Why:** Broad corridor coverage including Albania/ALL and SEPA/EUR; recipient-account model
  (holder name + IBAN + BIC) with provider-side validation; sandbox environment; quotes + transfers;
  webhooks for state. Strong fit for "pay into an employee bank account abroad."
- **Albania support:** Wise supports payouts to Albanian recipients and ALL is supported as a target
  currency on supported corridors (verify exact corridor + fees at integration time in the Wise
  dashboard; corridor availability changes and must be re-checked before go-live).
- **Verification required to go live:** business profile + KYC/KYB, funding (balance top-up via
  provider-hosted flow — never raw bank capture in our app), recipient validation, SCA where
  applicable.
- **Env:** `WISE_API_TOKEN`, `WISE_PROFILE_ID`, `WISE_ENV`. Validation also via an IBAN/BIC API
  (`IBAN_API_URL`/`IBAN_API_KEY`); offline ISO 7064 mod-97 + ISO 9362 BIC checks are the fallback.
- **Alternatives considered:** Stripe Connect/Payouts (excellent, but ALL/Albania payout corridor is
  limited); Airwallex (strong APAC/EU). Wise chosen for Albania corridor breadth.

### PayPal — **PayPal Payouts REST API (verified recipient by email)**
- **Why:** Ubiquitous, employee already owns the account, no bank details collected — we send to a
  verified email/`receiver`. Official OAuth2 client-credentials + `/v1/payments/payouts`. Sandbox
  available. Webhooks with verifiable signatures.
- **What we store:** only the verified PayPal **email**, provider **payout-batch/item IDs**, consent
  + connection **state** — never a password. (A full Connect-with-PayPal OAuth identity flow is the
  production upgrade for proving account ownership.)
- **Env:** `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_ENV`, `PAYPAL_WEBHOOK_ID`.

### Crypto — **licensed custodian / wallet-infra (testnet only here)**
- **Why testnet-only:** custody, signing, travel-rule, and sanctions screening for crypto require a
  licensed custodian/VASP (e.g. Fireblocks, Circle). We never hold keys. In dev we validate addresses
  (real chain-aware checksums) and simulate on testnet; mainnet is gated behind custody + compliance.
- **Validation:** EIP-55 checksum (EVM: Sepolia/Amoy via keccak-256), bech32 (BTC testnet), and
  base58check — all real, in `lib/finance-validation.ts`. Asset↔network matching is enforced.
- **Env:** `CRYPTO_CUSTODY_API_URL`, `CRYPTO_CUSTODY_API_KEY`, `CRYPTO_ENV` (mainnet gated).

## Cross-cutting

- **Sandbox vs live** is explicit per rail (`*_ENV`) and per payout (`environment` field). Sandbox
  results are labelled "Sandbox — simulated" and are **never** shown as live money movement.
- **Capability checks:** each adapter advertises supported `(currency, network)` pairs and an account
  `mode` of `unconfigured | sandbox | live`. Unconfigured rails show a **setup screen**, not a fake
  success.
- **Confirmation source of truth:** a payout is `paid/confirmed` **only** from a verified provider
  webhook or a confirmed API state — never optimistically.
