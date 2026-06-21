# Perkline — threat model (prototype scope)

A lightweight STRIDE-style review of the bonus-payout ecosystem and the controls implemented in this
prototype. Production controls that are out of scope are listed under "Residual / production".

## Assets
- Auth sessions & roles (employee / company_admin / finance_admin)
- Internal employee allowance/vouchers and provider settlement destinations
- Employee payout destinations (tokenized + masked only)
- Bonus payouts & their lifecycle, the audit trail, and the (mock) money movement

## Trust boundaries
- Browser ↔ server (cookie-authenticated requests)
- Server ↔ payout provider adapters (simulated; HMAC-signed events)

## Threats & controls

| # | Threat (STRIDE) | Control in this prototype |
|---|---|---|
| 1 | **Spoofing** — forged identity/session | Signed JWT (HS256, `jose`) in an **httpOnly, SameSite=Lax, Secure-in-prod** cookie; not readable by JS; verified in middleware and on every mutation. Passwords are **bcrypt** hashed; login returns a generic error (no user enumeration). |
| 2 | **Tampering** — client alters role/amount/destination | Server **never trusts client role/state**: role + company ownership re-checked server-side on every read/mutation; amounts/totals recomputed server-side; **Zod** validates every payload; destination must be an employee-owned **verified** method resolved server-side. |
| 3 | **Repudiation** — "I didn't approve that" | Immutable **`AuditEvent`** trail for logins, approvals, payouts, policy and method changes; per-payout **`PayoutEvent`** log; each event carries an **HMAC signature**; `reviewedByName` recorded on approval. |
| 4 | **Information disclosure** — leaking financial data | **No secrets stored**: only mock tokens + masked display data + verification state. Raw IBAN/email/address validated then masked & discarded. Security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`). |
| 4a | **Stale-field disclosure** — bank/card fields survive destination switching | `PaymentDestination` is a strict discriminated union; each type has a separate schema/component and switching creates a clean draft. Employee Perkline Credit accepts no additional fields. |
| 5 | **Denial of service / abuse** — hammering sensitive actions | In-memory **rate limiting** on add-method, verify, bonus-create, process and retry (per user, fixed window → 429). |
| 6 | **Elevation of privilege** — employee acting as finance | **RBAC** in `middleware.ts` (subtree per role) **and** explicit role checks in handlers; **separation of duties** (admin creates, finance settles); cross-company access returns 403. |
| 7 | **CSRF** — cross-site state change | Cookie is **SameSite=Lax**; sensitive POSTs additionally assert **same-origin** (`Origin` host == request host) → 403 on mismatch. |
| 8 | **Double payment / replay** | **Idempotency keys** per payout; `approveAndProcessPayout` is a no-op once `confirmed`; illegal status transitions rejected. |
| 9 | **Forged provider callback** | Settlement events are **HMAC-signed** and **verified** before a payout is `confirmed`; an invalid signature forces `failed`. |

## Residual / production hardening (out of scope here)
- KYC/KYB, AML/CFT, sanctions & PEP screening before any real payout.
- Licensed PSP/bank/crypto-custody partners; real signed webhooks over the network with replay
  windows; durable double-entry ledger + reconciliation against provider statements.
- Secrets in a KMS/HSM; rotating `AUTH_SECRET` / `PAYOUT_WEBHOOK_SECRET`; per-tenant key isolation.
- Distributed rate limiting & WAF; anomaly detection; full PCI-DSS scoping review.
- MFA / step-up auth for finance approvals above thresholds; maker-checker on policy changes.

See also [mock-payment-disclaimer.md](mock-payment-disclaimer.md).
