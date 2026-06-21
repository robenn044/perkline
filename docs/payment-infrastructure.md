# Perkline — payment infrastructure blueprint

How Perkline models a real benefits-marketplace payment stack, the existing systems it
copies, the UX research it follows, and the rules that keep the demo coherent.
Use this as the spec when touching anything money-related.

## The problem (from the brief)

> The employer reviews and approves the selection, and payment goes directly to the
> relevant provider or providers. The employee enjoys the benefit; **the money never
> passes through their hands.**

So there is exactly **one** money flow: employer → provider. Anything that puts
bank/card/IBAN/crypto inputs in front of an employee is outside the brief and must
not appear in the default experience.

## What we copy (don't reinvent)

### Provider settlement = Stripe Connect "destination charges → connected accounts"
Marketplaces (Uber, DoorDash, Lyft) don't hand sellers raw card data. The platform
charges, then **transfers** each provider's share to their **connected account**.
Account readiness is expressed as status + capabilities, not free-form text:
`details_submitted`, `charges_enabled`, `payouts_enabled`, plus a `requirements`
list of what's still needed.

Perkline mirrors this:
- `PaymentSplit` = one transfer per provider (employer charge → provider destination).
- `ProviderPaymentDestination` = the connected account, stored **masked/tokenized**.
- Destination status maps to human, Connect-style labels in the settlement UI:
  `active → "Payouts enabled"`, `connected → "Connected"`,
  `pending_verification → "Verification pending"`, else `"Setup required"`.
- We never store a full IBAN, PAN/CVV, PayPal password, or processor secret — only a
  mask + connection state (the Connect "hosted onboarding" principle).

Sources: [Stripe Connect charges](https://docs.stripe.com/connect/charges),
[Destination charges](https://docs.stripe.com/connect/destination-charges),
[Account capabilities](https://docs.stripe.com/connect/account-capabilities).

### Employee wallet = Forma "Lifestyle Spending Account" (LSA)
Forma gives employees an allowance they spend in a curated store / card / claim — not
a bank account. Perkline Credit is the LSA equivalent: **internal allowance + vouchers,
no cash-out, no financial inputs.** Spend happens by selecting catalog offers, never
by moving money to the employee.

Sources: [Forma LSA benchmark](https://www.prnewswire.com/news-releases/forma-releases-third-annual-lifestyle-spending-accounts-lsas-benchmark-report-highlighting-unexpected-shifts-in-flexible-benefits-program-design-and-utilization-302366482.html),
[Forma reviews/features (G2)](https://www.g2.com/products/formabenefits/reviews).

## Payment-method UX rules (applied)

From Baymard and UX Movement payment-method research:
- **Select-cards, not a dropdown.** Settlement method is chosen via an accessible
  `radiogroup` of cards (large targets, high-contrast selected state), not a `<select>`.
- **Progressive disclosure.** Only the chosen method's fields render; switching method
  resets to fresh, type-specific state (no field bleed — the cause of the original
  "wallet shows bank card fields" bug).
- **Sensible default + ordering.** Bank (SEPA/IBAN) is first/default for the Albania market.
- **Accessibility.** Every input has an associated label; decorative icons are
  `aria-hidden`; the group is keyboard-navigable via native radios.

Sources: [Baymard — Payment Method Selection](https://baymard.com/blog/payment-method-selection),
[UX Movement — Selecting a Payment Method](https://uxmovement.com/forms/payment-flow-ux-selecting-a-payment-method/).

## Canonical model (source of truth: `src/lib/types.ts`)

`PaymentDestination` is a discriminated union on `type`:
- `employee_perx_wallet` — internal allowance + vouchers; **no** account/card fields.
- `provider_bank_settlement` — legal name, country, currency, masked IBAN, BIC when required.
- `provider_paypal_business` — connect/redirect state + verified business email mask.
- `provider_card_processor` — hosted/tokenized setup state only.

Switching `type` MUST create fresh state via `switchProviderDestinationType()` and
persist only fields valid for the active discriminator. Enforced by the test
"destination type switching clears stale dependent fields".

## Optional module: Rewards payouts (gated OFF by default)

Employer **cash bonuses** paid to an employee's own bank/PayPal/crypto destination are
a separate module — they intentionally break the "money never reaches the employee"
rule, so they're hidden unless `NEXT_PUBLIC_ENABLE_REWARDS_PAYOUTS=true`. When off:
pages redirect to the role home and the APIs return 404 (see `src/lib/feature-flags.ts`).
This keeps the default demo a clean welfare loop with no stray bank/card inputs.

## Server authority (non-negotiable)

- Treat all client fields as untrusted except catalog IDs; `canonicalizePackage()`
  re-derives provider, price, currency and total from the store; revalidate at approval.
- Validate with Zod before any store mutation; enforce session/role/company ownership;
  same-origin + rate-limit on sensitive POSTs; audit every money decision.
- No real payment rail on the default demo path; settlements are simulated.
