# Test results

Last verified: June 20, 2026.

| Gate | Result |
|---|---|
| `npm run lint` | Pass, no warnings |
| `npm run typecheck` | Pass |
| `npm test` | Pass, 18/18 |
| `npm run build` | Pass, 27 pages generated |

The automated suite covers:

- intent parsing and deterministic multi-provider matching;
- canonical Tirana Reset output;
- package total/category/provider recomputation from catalog IDs;
- payment-destination type switching with stale-field removal;
- fieldless employee Perkline Credit;
- request submission through approval, direct provider splits and vouchers;
- policy blocking;
- catalog-only Perkline Match fallback;
- questionnaire personalization and grounded employer insights;
- IBAN/BIC/crypto validation and payout-secret encryption for the isolated Rewards module.
