# Perkline operating rules

Optimize for the JunctionX Tirana TeamSystem PERX rubric: 45% creativity, 35% working
prototype/experience, 20% smart AI.

## Protect the welfare loop

Never break:

`discover/Perkline Match → request → policy or manager approval → provider splits → provider confirmation → employee voucher`

- Benefit money always moves from employer to providers.
- Perkline Credit is internal allowance plus vouchers only. It has no card, IBAN, PayPal, crypto or
  cash-out inputs.
- Rewards payouts are a separate optional module and hidden from the default demo unless
  `NEXT_PUBLIC_ENABLE_REWARDS_PAYOUTS=true`.
- Keep `/api/reset` working for repeated judging.

## Canonical settlement model

Use only the `PaymentDestination` discriminated union in `src/lib/types.ts`:

- `employee_perx_wallet`
- `provider_bank_settlement`
- `provider_paypal_business`
- `provider_card_processor`

Type switches must create fresh type-specific state. Persist only fields valid for the selected
type. Mask full IBANs after validation. Never capture raw card data or PayPal passwords.

## Server authority

- Treat all client/model package fields as untrusted except catalog IDs.
- `canonicalizePackage()` must resolve every offer from the store and derive provider, price,
  currency, category tags and total.
- Revalidate again at approval.
- Use Zod before store mutations; enforce session, role and company/market ownership; apply
  same-origin checks and rate limits to sensitive actions.
- Audit request decisions, policy/provider/destination changes, settlements and voucher redemption.

## Perkline Match

- `src/lib/concierge.ts` is the source of truth and offline fallback.
- Optional model output must be strict JSON containing catalog-only offer/Route IDs, reported total,
  reason and eligibility.
- Server code recomputes totals and policy. Any unknown ID, invalid policy state, budget breach or
  parse error falls back immediately.
- Never place a network call on the default critical demo path.

## Design system

- Tokenized in `src/app/globals.css` (+ `tailwind.config.ts`). Warm-neutral base + ONE brand accent
  (petrol teal). No second hue, no random gradients, no glass content cards, no glow, no huge text.
- Use semantic tokens, never ad-hoc Tailwind colors: `primary`, `secondary`, `muted`, `success`,
  `warning`, `destructive`, `border`, surfaces. Add new roles as tokens, keep `.dark` in sync.
- Status chips are `rounded-md` (Badge variants); buttons `rounded-lg`; cards `rounded-xl` with
  restrained `shadow-soft`. Avatars/Route heroes use the curated muted gradients in `utils.ts`.
- Real lucide icons only (no emoji). Motion is reserved for approval, settlement, voucher issuance.
- AI is a quiet assistive capability inside Perkline Match — never a hero block or empty chat screen.

## Product and engineering

- Employee navigation: Home, Discover, My Benefits, Vouchers, Profile (Perkline Match is a quiet assistive
  entry reached from Home/Discover, not a top-level tab).
- Admin navigation: Overview, Requests, Budget & Policy, Catalog, Settlements, Insights, Audit.
- Albania-first: ALL, Tirana providers and EN/SQ-ready content; international-ready data contracts.
- Premium consumer feel for employees; calm, dense and trusted admin surfaces.
- WCAG 2.2 AA, reduced-motion support, deterministic money formatting and no emoji iconography.
- Prefer Server Components for reads and client components only for interaction.
- Store accessors are the only UI data source; do not import seed data into UI.
- If offer/provider/Route IDs change, update seed references and tests together.

After meaningful changes run:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Definition of done: mobile-friendly, accessible, demoable in under 15 seconds, grounded in the
catalog/policy, and harmless to the employer-to-provider core loop.

