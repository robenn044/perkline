/**
 * Perkline — single source of brand truth.
 *
 * Every user-facing brand string lives here so a rebrand is one file, never a
 * scatter hunt. "PerX" is only the TeamSystem challenge name; the product is
 * Perkline. Keep internal identifiers (the `employee_perx_wallet` destination
 * type, the `perx_session` cookie, env var names) untouched — those are data
 * contracts, not brand copy.
 */

export const BRAND = {
  name: "Perkline",
  /** Brand line. */
  tagline: "Benefits, made useful.",
  /** One-sentence product description (metadata, hero, social preview). */
  description:
    "Perkline turns an employer benefit allowance into curated, multi-provider perks employees actually use — discovered, approved, settled directly to providers, and redeemed as vouchers. Albania-first, international-ready.",
  /** Small, honest attribution — the only place "PerX" stays user-visible. */
  attribution: "Built for the TeamSystem PerX Challenge",

  /** Petrol-teal brand accent (matches the design tokens in globals.css). */
  color: {
    accent: "#1f6266",
    accentInk: "#173539",
  },

  /** Product concept names — clear, functional labels preferred over branding. */
  concepts: {
    /** Assistive recommendation experience. */
    match: "Perkline Match",
    /** Internal benefit allowance + vouchers. NEVER a bank/card/cash destination. */
    credit: "Perkline Credit",
    /** Curated multi-provider bundles. */
    collections: "Perkline Collections",
    collection: "Collection",
    /** Optional employer cash-reward module (gated off by default). */
    bonus: "Perkline Bonus",
    /** Engagement points. */
    points: "Perkline points",
  },

  /** Functional navigation labels (employee + company). */
  nav: {
    employee: {
      home: "Home",
      discover: "Discover",
      benefits: "My Benefits",
      vouchers: "Vouchers",
      profile: "Profile",
    },
  },

  /** Demo identity. */
  emailDomain: "perkline.demo",
  support: "support@perkline.demo",
  demo: {
    password: "demo1234",
    employee: "employee@perkline.demo",
    admin: "admin@perkline.demo",
    finance: "finance@perkline.demo",
  },

  /** Metadata helpers. */
  meta: {
    title: "Perkline — Benefits, made useful.",
    titleTemplate: "%s · Perkline",
  },
} as const;

export type Brand = typeof BRAND;
