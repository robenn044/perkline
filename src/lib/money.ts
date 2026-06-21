import type { CurrencyCode } from "./types";

/**
 * Currency formatting. Albania-first (ALL, no decimals) but international-ready:
 * every monetary value carries a currency code and is rendered with the right
 * symbol, separators, and fraction digits via Intl.NumberFormat.
 */

const FRACTION_DIGITS: Record<CurrencyCode, number> = {
  ALL: 0,
  EUR: 2,
  USD: 2,
};

/**
 * Format an integer major-unit amount, e.g. formatMoney(9200, "ALL") -> "9,200 ALL".
 *
 * We deliberately pin grouping to a single, deterministic locale ("en-US":
 * comma thousands, dot decimal). Locale-specific separators (e.g. sq-AL uses a
 * non-breaking space) differ between Node's ICU on the server and the browser's
 * ICU, which causes React hydration mismatches. A fixed format is both safe and
 * cleanly readable; the trailing currency code still proves multi-currency.
 */
export function formatMoney(amount: number, currency: CurrencyCode = "ALL"): string {
  const digits = FRACTION_DIGITS[currency] ?? 0;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    useGrouping: true,
  }).format(amount);
  // ALL renders best as a trailing code ("9,200 ALL"); keep it predictable.
  return `${formatted} ${currency}`;
}

export function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}
