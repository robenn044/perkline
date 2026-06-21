import type { CryptoNetwork } from "./types";

/**
 * Pure masking + lightweight validation helpers for payout destinations.
 * No secrets are ever persisted — raw input is validated then reduced to a mask.
 * Kept dependency-free (no `server-only`) so it is unit-testable in isolation.
 */

export function maskIban(iban: string): string {
  const clean = iban.replace(/\s+/g, "").toUpperCase();
  const cc = clean.slice(0, 2);
  const last4 = clean.slice(-4);
  return `${cc}•• •••• •••• ••${last4}`;
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return "•••";
  const head = user.slice(0, 1);
  return `${head}•••@${domain}`;
}

export function maskAddress(addr: string): string {
  if (addr.length <= 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Basic IBAN shape check (length + alphanumeric + country prefix). Not a checksum. */
export function isLikelyIban(iban: string): boolean {
  const clean = iban.replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{2}\d{2}[A-Z0-9]{8,30}$/.test(clean);
}

export function isLikelyCryptoAddress(addr: string, network: CryptoNetwork): boolean {
  const a = addr.trim();
  if (network === "BTC-Testnet") return /^(tb1|[mn2])[a-zA-HJ-NP-Z0-9]{20,60}$/.test(a);
  // EVM testnets (Sepolia / Amoy)
  return /^0x[a-fA-F0-9]{40}$/.test(a);
}

export const CRYPTO_ASSETS: Record<CryptoNetwork, string[]> = {
  "ETH-Sepolia": ["ETH", "USDC"],
  "MATIC-Amoy": ["MATIC", "USDC"],
  "BTC-Testnet": ["tBTC"],
};
