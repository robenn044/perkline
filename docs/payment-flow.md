# Benefit payment flow

```mermaid
sequenceDiagram
  participant E as Employee
  participant P as Perkline
  participant A as Company admin / policy
  participant S as Provider settlement adapters (simulated)
  participant V as Provider

  E->>P: Select offer/Route or ask Perkline Match
  P->>P: Resolve catalog IDs and recompute total
  P->>P: Evaluate allowance, eligibility and policy
  E->>P: Submit request
  alt Below auto-approval threshold
    P->>A: Apply configured auto-approval rule
  else Manager approval required
    A->>P: Approve with optional note
  end
  P->>P: Revalidate catalog and policy
  P->>S: Create one split per provider destination
  S-->>V: Simulated paid confirmation
  P-->>E: Issue QR/code voucher per experience
  V->>P: Confirm redemption
```

## Destination behavior

| Type | Inputs | Persisted |
|---|---|---|
| Employee Perkline Credit | None | Internal wallet ID, currency, status |
| Provider bank settlement | Business name, country, currency, IBAN, conditional BIC | Masked IBAN, BIC, status |
| PayPal Business | Verified business email through simulated connect | Masked email, connection state |
| Hosted card processor | No raw card fields; simulated hosted setup | Processor account token, connection state |

Switching type resets the draft, so irrelevant fields cannot survive. Crypto is not available in
benefit settlement or voucher redemption.

## Production note

All movement is simulated. Production requires licensed payment partners, KYB/KYC, AML/sanctions
review, durable ledgering, signed provider webhooks and jurisdiction-specific welfare/tax review.

