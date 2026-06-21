import type { CryptoNetwork, CurrencyCode, PayoutMethodType } from "./types";

/**
 * Single source of truth for payout-rail configuration, capability checks and
 * the compliance gate. Reads env (no secrets leak to the client — only derived
 * booleans/modes are ever surfaced). Live payouts are OFF unless BOTH the rail
 * is configured for `live` AND `LIVE_PAYOUTS_ENABLED=true`.
 */

export type RailMode = "unconfigured" | "sandbox" | "live";

export interface RailStatus {
  rail: PayoutMethodType;
  provider: string;
  mode: RailMode;
  /** Provider environment selected via *_ENV (sandbox/live, testnet/mainnet). */
  environment: string;
  /** Env var names still required to configure this rail. */
  missing: string[];
}

export function livePayoutsEnabled(): boolean {
  return process.env.LIVE_PAYOUTS_ENABLED === "true";
}

function railProvider(rail: PayoutMethodType): string {
  return rail === "bank" ? "Wise" : rail === "paypal" ? "PayPal Payouts" : "Custody (testnet)";
}

export function getRailStatus(rail: PayoutMethodType): RailStatus {
  const provider = railProvider(rail);
  const live = livePayoutsEnabled();

  if (rail === "bank") {
    const missing: string[] = [];
    if (!process.env.WISE_API_TOKEN) missing.push("WISE_API_TOKEN");
    if (!process.env.WISE_PROFILE_ID) missing.push("WISE_PROFILE_ID");
    const environment = process.env.WISE_ENV || "sandbox";
    return { rail, provider, environment, missing, mode: railMode(missing, environment, live) };
  }
  if (rail === "paypal") {
    const missing: string[] = [];
    if (!process.env.PAYPAL_CLIENT_ID) missing.push("PAYPAL_CLIENT_ID");
    if (!process.env.PAYPAL_CLIENT_SECRET) missing.push("PAYPAL_CLIENT_SECRET");
    const environment = process.env.PAYPAL_ENV || "sandbox";
    return { rail, provider, environment, missing, mode: railMode(missing, environment, live) };
  }
  const missing: string[] = [];
  if (!process.env.CRYPTO_CUSTODY_API_KEY) missing.push("CRYPTO_CUSTODY_API_KEY");
  const environment = process.env.CRYPTO_ENV || "testnet";
  return { rail, provider, environment, missing, mode: railMode(missing, environment, live) };
}

function railMode(missing: string[], environment: string, live: boolean): RailMode {
  if (missing.length > 0) return "unconfigured";
  const isLiveEnv = environment === "live" || environment === "mainnet";
  return isLiveEnv && live ? "live" : "sandbox";
}

export function getAllRailStatuses(): RailStatus[] {
  return (["bank", "paypal", "crypto"] as PayoutMethodType[]).map(getRailStatus);
}

// --- Currency / network capability matrix -------------------------------

export interface CurrencyNetworkConfigEntry {
  rail: PayoutMethodType;
  /** Fiat currency (bank/paypal) or crypto asset symbol. */
  unit: string;
  network?: CryptoNetwork;
  environments: RailMode[];
}

export const CURRENCY_NETWORK_CONFIG: CurrencyNetworkConfigEntry[] = [
  { rail: "bank", unit: "ALL", environments: ["sandbox", "live"] },
  { rail: "bank", unit: "EUR", environments: ["sandbox", "live"] },
  { rail: "bank", unit: "USD", environments: ["sandbox", "live"] },
  { rail: "paypal", unit: "EUR", environments: ["sandbox", "live"] },
  { rail: "paypal", unit: "USD", environments: ["sandbox", "live"] },
  { rail: "crypto", unit: "USDC", network: "ETH-Sepolia", environments: ["sandbox"] },
  { rail: "crypto", unit: "ETH", network: "ETH-Sepolia", environments: ["sandbox"] },
  { rail: "crypto", unit: "USDC", network: "MATIC-Amoy", environments: ["sandbox"] },
  { rail: "crypto", unit: "MATIC", network: "MATIC-Amoy", environments: ["sandbox"] },
  { rail: "crypto", unit: "tBTC", network: "BTC-Testnet", environments: ["sandbox"] },
];

export function bankCurrencySupported(currency: CurrencyCode): boolean {
  return CURRENCY_NETWORK_CONFIG.some((c) => c.rail === "bank" && c.unit === currency);
}

export function assetSupportedOnNetwork(asset: string, network: CryptoNetwork): boolean {
  return CURRENCY_NETWORK_CONFIG.some((c) => c.rail === "crypto" && c.unit === asset && c.network === network);
}

/** Country gate — payout destinations restricted to supported corridors. */
export const SUPPORTED_PAYOUT_COUNTRIES = ["AL", "IT", "ES", "DE", "FR", "GB", "US", "XK"];
export function countrySupported(country: string): boolean {
  return SUPPORTED_PAYOUT_COUNTRIES.includes(country.toUpperCase());
}
