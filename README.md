# Perkline

Perkline is a TeamSystem-native corporate-welfare marketplace built for the JunctionX Tirana
PERX challenge. It turns employer benefit allowance into personalized Tirana offers and
multi-provider collections, then proves the full economic loop:

`employee selects → policy/manager approval → employer settles providers → vouchers unlock`

The employee never receives benefit cash. “Perkline Credit” means internal allowance and vouchers only.

## Run locally

```bash
npm install
npm run dev
```

Quality gates:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The app is offline-safe by default: seeded in-memory data, deterministic Perkline Match, simulated
settlements and one-click reset.

## Demo accounts

| Experience | Email | Password |
|---|---|---|
| Employee | `employee@perkline.demo` | `demo1234` |
| Company admin | `admin@perkline.demo` | `demo1234` |

The separate Rewards payouts prototype remains available behind
`NEXT_PUBLIC_ENABLE_REWARDS_PAYOUTS=true`; its finance account is
`finance@perkline.demo` / `demo1234`. It is hidden from the default welfare demo.

## Product experiences

Employee navigation: **Home · Discover · My Benefits · Vouchers · Profile** (persistent on desktop,
compact scroll on mobile).

- **Home** — remaining allowance, curated recommendations, timely drops, recent status and one quiet
  Perkline Match entry.
- **Discover** — Tirana offers, categories and curated multi-provider collections.
- **My Benefits** — submitted requests with clear policy, approval, settlement and voucher states.
- **Vouchers** — QR/code, provider, expiry, redemption steps and support.
- **Profile** — language, interests, editable five-question personalization and a fieldless internal
  Perkline Credit.
- **Perkline Match** (assistive, reached from Home/Discover) — ranks catalog-only offers using role,
  onboarding preferences, allowance, policy, season and prior activity, and explains why each result
  fits. AI is a quiet capability here, never the centerpiece or an empty chat.

### Company admin

- **Overview** — budget position, grounded demand insight and approval snapshot.
- **Requests** — policy checks, provider breakdown, approve/reject reasons and bulk triage.
- **Budget & Policy** — allowance, auto-approval threshold, categories and provider-count rules.
- **Catalog** — provider status, real offers and curated collection integrity.
- **Settlements** — canonical provider destinations, direct splits and “How payments work.”
- **Insights** — adoption, unused allowance, demand and explainable next-catalog recommendations.
- **Audit** — logins, decisions, policy, provider, settlement and voucher events.

The public `/provider` portal demonstrates incoming settlements and voucher confirmation.

## PaymentDestination: one canonical model

`src/lib/types.ts` defines one discriminated union:

- `employee_perx_wallet` — internal allowance only; no inputs and no cash-out capability.
- `provider_bank_settlement` — legal business name, country, currency, IBAN and conditional
  BIC/SWIFT; the IBAN is validated, masked and discarded after saving.
- `provider_paypal_business` — simulated redirect/connection plus verified business email; no
  password collection.
- `provider_card_processor` — hosted/tokenized onboarding only; Perkline never captures PAN/CVV.

Switching settlement type creates a fresh type-specific draft, so bank fields cannot leak into
PayPal or hosted-processor state. Crypto has no role in benefits or voucher redemption.

## Server authority and safety

- Signed HS256 JWT in an httpOnly SameSite cookie; bcrypt password hashes.
- Middleware RBAC plus role/market/company checks in mutation handlers.
- Zod validation, same-origin checks and rate limiting on sensitive mutations.
- Request packages are rebuilt from seeded offer IDs in `canonicalizePackage()`. Client/model
  provider IDs, categories, currency, prices and totals are ignored and recomputed.
- Approval revalidates the current catalog and policy before deducting allowance.
- One settlement split is created per provider, attached to a valid provider destination.
- Every approved item receives a voucher with deterministic redemption instructions.
- The deterministic engine in `src/lib/concierge.ts` is always available. Optional LLM output is
  strict catalog-only JSON and is discarded on any invalid ID, policy issue or budget breach.

## Design system

Perkline is tokenized for a calm, mature B2B2C feel — trusted by finance/HR, enjoyable for employees —
and is Albania-first, international-ready. Tokens live in `src/app/globals.css`; Tailwind maps them
in `tailwind.config.ts`.

- **Palette** — a warm-neutral base (bone surfaces, warm ink) plus **one** controlled brand accent,
  deep **petrol teal**. No second competing hue, no random gradients, no glass content cards.
- **Status roles** — semantic `success` / `warning` / `destructive` tokens drive every chip and
  state; muted, never neon. Identity gradients (avatars, Route heroes) are drawn from a curated,
  harmonious set, not full-spectrum rainbow.
- **Type & spacing** — tight, restrained headings on an 8px spacing rhythm (Tailwind scale);
  tabular numerals and deterministic `ALL` formatting for money.
- **Elevation & shape** — restrained, warm-tinted shadows (`xs`/`soft`/`card`); calmer radii
  (`--radius: 0.625rem`); status chips are `rounded-md`, not loud pills.
- **Icons** — real line icons (lucide), never emoji.
- **Dark-mode-ready** — a full `.dark` token set ships in `globals.css`.
- **Accessibility** — WCAG 2.2 AA contrast, visible `:focus-visible`, labelled nav with
  `aria-current`, `prefers-reduced-motion` respected; motion is reserved for approval, settlement and
  voucher issuance.

Settlement methods use accessible **select-cards with progressive disclosure** (only the chosen
method's fields render), modeled on the Stripe Connect connected-account pattern. Wallet/voucher
surfaces never show bank/card inputs. See [docs/payment-infrastructure.md](docs/payment-infrastructure.md).

## Changelog

- **Rebrand → Perkline** — the product is now **Perkline** ("Benefits, made useful."). A single brand
  config (`src/lib/brand.ts`) holds name, tagline, description, accent color, demo accounts, support
  address, product-concept names, nav labels and metadata. All user-facing copy, page metadata, Open
  Graph/Twitter tags, favicon (`src/app/icon.svg`), wordmark, demo logins (`@perkline.demo`) and docs
  were updated; **"PerX" survives only as the "Built for the TeamSystem PerX Challenge" attribution.**
  Internal data contracts (`employee_perx_wallet` type, `perx_session` cookie, env vars) are
  intentionally unchanged.
- **Concept renames** — Perkline Match (assistive recommendations), Perkline Credit (internal benefit
  allowance), Perkline Collections (curated multi-provider bundles); functional nav labels.
- **Enterprise visual overhaul** — retokenized from a blue/glass/gradient hackathon look to a
  warm-neutral + petrol-teal system: rebuilt color/elevation/radius tokens, calmed avatars and Route
  gradients, neutral category chips, dark-ready architecture.
- **IA** — employee navigation simplified to Home · Discover · My Benefits · Vouchers · Profile; Perkline
  Match demoted to a quiet assistive entry.
- **Components** — Badge/Button/Card variants aligned to semantic tokens; calmer nav (desktop +
  compact mobile); admin request history rebuilt as a readable data table.
- **AI** — the Home "ask the AI" hero replaced by a restrained Perkline Match card.

## Architecture and docs

- [Architecture](docs/architecture.md)
- [Payment flow](docs/payment-flow.md)
- [Demo script](docs/demo-script.md)
- [Test results](docs/test-results.md)
- [Threat model](docs/threat-model.md)
- [Mock-money disclaimer](docs/mock-payment-disclaimer.md)

## Data and reset

`src/lib/store.ts` is the only data boundary. State lives on `globalThis`, is seeded by
`src/lib/seed.ts`, and resets through `POST /api/reset`. Albania is the live market (`ALL`,
Tirana providers, `en-AL`/`sq-AL`); the market registry demonstrates international expansion.

