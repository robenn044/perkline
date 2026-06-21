import { keccak_256 } from "js-sha3";
import { createHash } from "crypto";
import type { CryptoNetwork } from "./types";

/**
 * Real financial-identifier validation — NOT regex-only.
 *
 *  - IBAN: ISO 13616 structure + ISO 7064 MOD-97-10 checksum + per-country length.
 *  - BIC/SWIFT: ISO 9362 structure.
 *  - Crypto: chain-aware — EIP-55 keccak checksum (EVM), bech32 (BTC), base58check.
 *
 * Pure + dependency-light (js-sha3 only) so it is fully unit-testable. A live
 * IBAN/BIC API can be layered on top (see finance-config) for bank-grade checks;
 * this offline layer is the always-available floor.
 */

// ---- IBAN ---------------------------------------------------------------

// ISO 13616 country IBAN lengths (subset incl. Albania + SEPA + common).
const IBAN_LENGTHS: Record<string, number> = {
  AL: 28, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, CZ: 24, DE: 22, DK: 18, EE: 20,
  ES: 24, FI: 18, FR: 27, GB: 22, GR: 27, HR: 21, HU: 28, IE: 22, IS: 26, IT: 27,
  LT: 20, LU: 20, LV: 21, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, SE: 24,
  SI: 19, SK: 24, XK: 20,
};

export interface IbanResult {
  valid: boolean;
  normalized: string;
  country?: string;
  reason?: string;
}

export function normalizeIban(input: string): string {
  return input.replace(/[\s-]/g, "").toUpperCase();
}

export function validateIban(input: string): IbanResult {
  const normalized = normalizeIban(input);
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]+$/.test(normalized)) {
    return { valid: false, normalized, reason: "Invalid IBAN structure." };
  }
  const country = normalized.slice(0, 2);
  const expected = IBAN_LENGTHS[country];
  if (expected && normalized.length !== expected) {
    return { valid: false, normalized, country, reason: `${country} IBANs must be ${expected} characters.` };
  }
  if (!expected && (normalized.length < 15 || normalized.length > 34)) {
    return { valid: false, normalized, country, reason: "IBAN length out of range." };
  }
  // MOD-97-10: move first 4 chars to the end, map letters A=10..Z=35, mod 97 === 1.
  const rearranged = normalized.slice(4) + normalized.slice(0, 4);
  const digits = rearranged
    .split("")
    .map((c) => (c >= "A" && c <= "Z" ? (c.charCodeAt(0) - 55).toString() : c))
    .join("");
  if (mod97(digits) !== 1) {
    return { valid: false, normalized, country, reason: "IBAN checksum failed (MOD-97-10)." };
  }
  return { valid: true, normalized, country };
}

function mod97(numeric: string): number {
  let remainder = 0;
  for (let i = 0; i < numeric.length; i += 7) {
    const block = remainder.toString() + numeric.slice(i, i + 7);
    remainder = Number(BigInt(block) % 97n);
  }
  return remainder;
}

// ---- BIC / SWIFT (ISO 9362) ---------------------------------------------

export function validateBic(input: string): { valid: boolean; normalized: string; reason?: string } {
  const normalized = input.replace(/\s/g, "").toUpperCase();
  // 4 bank + 2 country + 2 location + optional 3 branch.
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalized)) {
    return { valid: false, normalized, reason: "Invalid BIC/SWIFT format (ISO 9362)." };
  }
  return { valid: true, normalized };
}

// ---- Crypto addresses ----------------------------------------------------

const EVM_NETWORKS: CryptoNetwork[] = ["ETH-Sepolia", "MATIC-Amoy"];

export interface AddressResult {
  valid: boolean;
  reason?: string;
}

export function validateCryptoAddress(addr: string, network: CryptoNetwork): AddressResult {
  const a = addr.trim();
  if (EVM_NETWORKS.includes(network)) return validateEvm(a);
  if (network === "BTC-Testnet") return validateBtcTestnet(a);
  return { valid: false, reason: "Unsupported network." };
}

/** EVM: 0x + 40 hex, with EIP-55 checksum verification for mixed-case input. */
function validateEvm(a: string): AddressResult {
  if (!/^0x[0-9a-fA-F]{40}$/.test(a)) return { valid: false, reason: "EVM address must be 0x + 40 hex." };
  const body = a.slice(2);
  const isLower = body === body.toLowerCase();
  const isUpper = body === body.toUpperCase();
  if (isLower || isUpper) return { valid: true }; // no checksum case
  const hash = keccak_256(body.toLowerCase());
  for (let i = 0; i < 40; i++) {
    const c = body[i];
    if (!/[a-fA-F]/.test(c)) continue;
    const upper = parseInt(hash[i], 16) >= 8;
    if (upper ? c !== c.toUpperCase() : c !== c.toLowerCase()) {
      return { valid: false, reason: "EIP-55 checksum failed." };
    }
  }
  return { valid: true };
}

/** BTC testnet: bech32 (tb1…) or base58check (m/n/2…). Real checksum verification. */
function validateBtcTestnet(a: string): AddressResult {
  if (/^tb1[0-9ac-hj-np-z]+$/.test(a.toLowerCase())) {
    return bech32Verify(a.toLowerCase(), "tb") ? { valid: true } : { valid: false, reason: "bech32 checksum failed." };
  }
  if (/^[mn2][1-9A-HJ-NP-Za-km-z]{20,40}$/.test(a)) {
    return base58CheckValid(a) ? { valid: true } : { valid: false, reason: "base58check checksum failed." };
  }
  return { valid: false, reason: "Not a valid BTC testnet address." };
}

// bech32 (BIP-0173)
const BECH32_CHARSET = "qpzry9x8gf2tvdw0s3jn54khce6mua7l";
function bech32Polymod(values: number[]): number {
  const GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
  let chk = 1;
  for (const v of values) {
    const b = chk >> 25;
    chk = ((chk & 0x1ffffff) << 5) ^ v;
    for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= GEN[i];
  }
  return chk;
}
function bech32HrpExpand(hrp: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) >> 5);
  out.push(0);
  for (let i = 0; i < hrp.length; i++) out.push(hrp.charCodeAt(i) & 31);
  return out;
}
function bech32Verify(addr: string, expectedHrp: string): boolean {
  const pos = addr.lastIndexOf("1");
  if (pos < 1) return false;
  const hrp = addr.slice(0, pos);
  if (hrp !== expectedHrp) return false;
  const dataPart = addr.slice(pos + 1);
  const data: number[] = [];
  for (const c of dataPart) {
    const d = BECH32_CHARSET.indexOf(c);
    if (d === -1) return false;
    data.push(d);
  }
  return bech32Polymod(bech32HrpExpand(hrp).concat(data)) === 1;
}

// base58check
const B58 = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function base58Decode(s: string): Uint8Array | null {
  let num = 0n;
  for (const c of s) {
    const idx = B58.indexOf(c);
    if (idx === -1) return null;
    num = num * 58n + BigInt(idx);
  }
  const bytes: number[] = [];
  while (num > 0n) {
    bytes.unshift(Number(num & 0xffn));
    num >>= 8n;
  }
  for (const c of s) {
    if (c === "1") bytes.unshift(0);
    else break;
  }
  return Uint8Array.from(bytes);
}
function base58CheckValid(s: string): boolean {
  const raw = base58Decode(s);
  if (!raw || raw.length < 5) return false;
  const payload = raw.slice(0, raw.length - 4);
  const checksum = raw.slice(raw.length - 4);
  const h1 = createHash("sha256").update(Buffer.from(payload)).digest();
  const h2 = createHash("sha256").update(h1).digest();
  for (let i = 0; i < 4; i++) if (h2[i] !== checksum[i]) return false;
  return true;
}
