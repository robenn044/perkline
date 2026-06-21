# Mock payment disclaimer

**Perkline is a hackathon prototype. It moves no real money and touches no real payment rail.**

- **Provider payments** (the PERX benefits loop) and optional **Rewards payouts** (Bank / PayPal / Crypto)
  are entirely **simulated** by in-process mock adapters (`MockBankAdapter`, `MockPayPalAdapter`,
  `MockCryptoAdapter`). No funds are debited, transferred, or settled anywhere.
- **Crypto is testnet/mock only.** Networks are limited to Sepolia / Amoy / Bitcoin testnet and the
  asset list is fixed. There is no mainnet path and no broadcast of any transaction.
- **No sensitive financial data is ever stored.** We persist only:
  - a **mock provider token** (e.g. `pom_tok_…`, `btok_…`),
  - **masked, non-sensitive display data** (e.g. `AL•• •••• •••• ••17`, `e•••@gmail.com`, `0xAb…9F2c`),
  - **verification state**, **currency/network**, and **audit metadata**.
- The welfare loop uses the canonical `PaymentDestination` union:
  - employee Perkline Credit has no financial inputs;
  - provider bank settlement stores a masked IBAN and conditional BIC;
  - PayPal Business stores masked verified email + connection state;
  - hosted card processor setup stores only a mock processor account token.
- We **never** store raw IBANs, full card numbers, CVVs, PayPal passwords, OAuth tokens, crypto
  private keys, or seed phrases. Inputs are validated, masked, and discarded server-side.

## What a real production rollout would require

Going live with actual payouts is **out of scope** for this prototype and would require, at minimum:

- **Licensed payment partners / PSPs** for each rail (e.g. a regulated bank/EMI or SEPA provider,
  PayPal Payouts, and a licensed/regulated crypto custodian or VASP). Business logic is isolated
  behind `PaymentProviderAdapter` precisely so these can be swapped in without rewrites.
- **KYC / KYB** identity verification for employees, employers and beneficiaries.
- **AML / CFT** monitoring, **sanctions / PEP screening**, and transaction monitoring.
- **Regulatory review & licensing** appropriate to each jurisdiction (e.g. e-money, payment
  institution, or money-transmitter authorization), tax treatment of bonuses, and payroll/benefits
  compliance.
- Hardened secrets management (KMS/HSM), PCI-DSS scope review, encryption at rest/in transit,
  signed & verified provider webhooks over the network, idempotent ledgering, and reconciliation
  against provider statements.

Treat all flows here as **illustrative architecture**, not a payment product.
