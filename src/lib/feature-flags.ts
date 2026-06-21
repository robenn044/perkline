/**
 * Feature flags — derived from public env, safe to read on both server and
 * client (NEXT_PUBLIC_* values are inlined at build time).
 *
 * Rewards payouts (employer-funded cash bonuses settled to an employee's OWN
 * bank / PayPal / crypto destination) are an OPTIONAL module that sits OUTSIDE
 * the core welfare loop the brief requires — where "the money never passes
 * through their hands" and payment goes directly to providers. To keep the
 * default demo a clean, coherent welfare experience (and to avoid surfacing
 * bank/card/IBAN inputs where an employee only expects a wallet + vouchers),
 * the entire module — navigation, pages and API routes — stays hidden unless
 * this flag is explicitly enabled.
 *
 * Enable with:  NEXT_PUBLIC_ENABLE_REWARDS_PAYOUTS=true
 */
export function rewardsPayoutsEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_REWARDS_PAYOUTS === "true";
}
