# Perkline — operating rules

This repo exists to win the **JunctionX Tirana · TeamSystem PERX** challenge. It is an AI benefits
marketplace ("Perkline") that turns employer welfare budgets into personalized, multi-provider
Tirana packages. Optimize every decision against the rubric: **45% Creativity, 35% Working
Prototype/Experience, 20% Smart AI.**

## Non-negotiables (protect the live demo above all)

- **Never break the core loop:** Employee discovers/asks → package → submit → Company admin approves →
  simulated payment splits **directly to providers** → Provider confirmation + Employee voucher.
- **The AI Concierge must always return a valid result.** The deterministic engine in
  `src/lib/concierge.ts` is the source of truth and the fallback. Any Codex path must re-validate
  every offer id against the seeded catalog and recompute totals server-side; on any doubt, fall
  back. No network call may be on the critical demo path by default.
- **Money is real-looking but simulated.** No real payment rails. Use the canonical
  `PaymentDestination` union: employee Perkline Credit has no inputs; provider bank details are masked;
  PayPal/processor setup is connected or hosted. Never store PAN/CVV or passwords. Employers pay
  providers; employees never receive benefit cash.
- **Keep one-click reset working** (`/api/reset`) for repeated judging.

## Two dashboards & auth (added in the upgrade)

- The product is **two secure, role-based dashboards**: Employee (`/employee/**`) and Company/Admin
  (`/admin/**`), plus a public simulated Provider portal (`/provider`).
- **Auth model:** signed JWT (HS256, `jose`) in an httpOnly SameSite cookie; bcrypt password hashes;
  `src/lib/session.ts` is edge-safe (middleware), `src/lib/auth.ts` is Node (bcrypt + store).
- **RBAC everywhere:** `middleware.ts` guards routes by role; every mutating route handler ALSO
  re-checks `getSession()` + role + company ownership (defense in depth — never trust the client).
- **Validate every input with Zod** (`src/lib/validation.ts`) before touching the store.
- **Audit-log** approvals, payouts, policy changes, logins and redemptions via `logAudit`.
- Demo logins: `employee@perkline.demo` / `admin@perkline.demo`, password `demo1234` (seeded, hashed).
- Request lifecycle: `draft → pending → approved → processing → paid → voucher_ready` (or `rejected`);
  splits: `pending → processing → paid`. The approve action is atomic server-side; the UI animates
  the progression.

## Perkline Bonus payouts (added in this upgrade)

- **Separate from provider payments.** Bonus = employer-funded reward paid to an employee's own
  destination. Never replace provider payments / vouchers with cash payouts.
- **Roles & separation of duties:** `company_admin` creates bonuses (`/admin/bonuses` → `pending_review`);
  `finance_admin` approves & settles (`/finance`). Enforce both in middleware AND in each handler.
- **Payout methods** (`PayoutMethod`, distinct from `PaymentMethod`): bank/paypal/crypto. Store ONLY a
  mock token + masked display + verification state + network/currency. NEVER a raw IBAN, card number,
  PayPal password, private key, or seed phrase. Crypto is **testnet/mock only**. Payouts require a
  **verified** destination.
- **Engine** (`src/lib/payout-engine.ts`): `PaymentProviderAdapter` + Mock{Bank,PayPal,Crypto}Adapter.
  Keep adapters swappable for licensed providers — business logic must not change. Use **idempotency
  keys**, transaction-safe transitions, and **HMAC-signed settlement events verified before
  `confirmed`**. Failed → retry/reconcile in the finance console.
- Payout lifecycle: `draft → pending_review → approved → processing → paid → confirmed | failed`.
- **Security on sensitive mutations:** Zod + same-origin (CSRF) check + per-user rate limit + audit.
  Demo finance login: `finance@perkline.demo` / `demo1234`.
- Always update the disclaimer/threat-model when payout behavior changes: production needs licensed
  partners + KYC/AML/sanctions/regulatory review. See `docs/`.
- Keep Rewards payouts hidden from the default welfare demo unless
  `NEXT_PUBLIC_ENABLE_REWARDS_PAYOUTS=true`.

## Canonical benefit settlement destinations

- `employee_perx_wallet` is internal allowance + vouchers only and renders no financial inputs.
- `provider_bank_settlement` accepts business name/country/currency/IBAN and BIC only when required;
  validate, mask and discard the full IBAN.
- `provider_paypal_business` uses connect/redirect state and verified business email; no password.
- `provider_card_processor` uses hosted/tokenized setup only; no raw card form.
- Switching type resets all dependent state. Persist only fields valid for the active discriminator.

## Product principles

- It must feel like a **premium consumer app, not an HR portal.** Polished cards, budget ring,
  staged reveals, the payment-routing animation, QR vouchers, restrained micro-animations.
- **Albania-first, internationally architected.** ALL currency + Tirana providers in the demo;
  currency codes, localizable categories, and a market registry prove global readiness (`/market`).
- **Habit, not chore.** Keep the feed alive: Fresh in Tirana, Friday Drops, streaks, activity.
- **Favor depth on the core loop over breadth.** Decline scope creep (provider onboarding wizards,
  analytics dashboards, real integrations) unless the core demo is already bulletproof.

## Engineering conventions

- **Stack:** Next.js App Router + TypeScript + Tailwind + shadcn-style primitives + framer-motion.
- **Data:** single in-memory store on `globalThis` (`src/lib/store.ts`), seeded by `src/lib/seed.ts`.
  The store is the only data boundary — keep it swappable for SQLite/Prisma later. Don't read seed
  data directly from UI; go through the store accessors.
- **Server-side authority:** totals, policy status, splits and vouchers are computed in
  `lib/policy.ts` / `lib/store.ts`, never trusted from the client.
- **Money:** integers in the major unit + `CurrencyCode`; format only via `src/lib/money.ts`
  (pinned to a deterministic locale — do NOT use locale-specific separators in rendered output, it
  causes SSR hydration mismatches).
- **Seed integrity:** if you change offer/provider/package ids, update `seed.ts`, the curated package
  item references, and `tests/perx.test.ts` together. Curated packages must reference real offers.
- **Components:** colocate feature components in `src/components`; primitives in `src/components/ui`.
  Client components only where interaction/animation needs them; prefer Server Components for reads.
- **After meaningful changes:** run `npm run typecheck`, `npm run build`, and `npm test`; fix before
  moving on. Every page must have loading/empty/error states and no broken routes.

## Design, accessibility & performance (polish pass)

- **Design system:** one restrained brand palette via semantic tokens in `globals.css`; consistent
  radii/shadows; a single subtle ambient wash. **No emoji as iconography** — use lucide (see
  `CATEGORY_ICON` in `category-chip.tsx`). Route hero cards use the cohesive `routeGradient()` palette
  (`utils.ts`); avatars use varied `gradientFromSeed()`. Employee = warm/discovery; admin/finance =
  calm/dense/trusted. Avoid random colorful cards, fake metrics, oversized headings, glass overload.
- **Accessibility (WCAG 2.2 AA):** keep the skip link (`layout.tsx` → `#main-content` on every
  `<main>`), labelled `<nav>` + `aria-current`, global `:focus-visible`, `aria-label` on icon-only
  buttons + `aria-hidden` on decorative icons, real form labels/errors. Maintain ≥4.5:1 contrast.
- **Reduced motion:** never animate unconditionally — `<MotionConfig reducedMotion="user">` wraps the
  app and a CSS `prefers-reduced-motion` query neutralizes transitions. New framer-motion is fine;
  it inherits this.
- **Performance:** default to Server Components; only mark `"use client"` for real interactivity.
  Keep route `loading.tsx` skeletons. Stable list keys, no layout shift, no unused deps.
- **Hygiene:** no `any` (one justified generic Slot), no dead exports, no hydration/console errors,
  no placeholder-only UI. Money formats only via `money.ts` (pinned locale).

## Definition of done for any feature

Premium, mobile-friendly, demoable in <15 seconds, mapped to a rubric category, and it does not
endanger the employee → employer → provider loop.
