import type { CurrencyCode, PaymentDestination, ProviderPaymentDestination } from "./types";

export type ProviderDestinationDraft =
  | {
      type: "provider_bank_settlement";
      legalBusinessName: string;
      country: string;
      currency: CurrencyCode;
      iban: string;
      bic: string;
    }
  | {
      type: "provider_paypal_business";
      currency: CurrencyCode;
      verifiedBusinessEmail: string;
    }
  | {
      type: "provider_card_processor";
      currency: CurrencyCode;
    };

/** A type change always starts from a clean, type-specific state. */
export function createProviderDestinationDraft(
  type: ProviderDestinationDraft["type"],
  currency: CurrencyCode = "ALL",
): ProviderDestinationDraft {
  if (type === "provider_bank_settlement") {
    return {
      type,
      legalBusinessName: "",
      country: "AL",
      currency,
      iban: "",
      bic: "",
    };
  }
  if (type === "provider_paypal_business") {
    return { type, currency, verifiedBusinessEmail: "" };
  }
  return { type, currency };
}

export function switchProviderDestinationType(
  _current: ProviderDestinationDraft,
  next: ProviderDestinationDraft["type"],
): ProviderDestinationDraft {
  return createProviderDestinationDraft(next);
}

const IBAN_ONLY_COUNTRIES = new Set(["AT", "BE", "DE", "ES", "FR", "IT", "NL", "PT"]);

export function countryRequiresBic(country: string): boolean {
  return !IBAN_ONLY_COUNTRIES.has(country.trim().toUpperCase());
}

export function paymentDestinationDisplay(destination: PaymentDestination): string {
  if (destination.type === "employee_perx_wallet") return "Perkline Credit · internal benefit allowance";
  if (destination.type === "provider_bank_settlement") {
    return `Bank · ${destination.ibanMask}${destination.bic ? ` · ${destination.bic}` : ""}`;
  }
  if (destination.type === "provider_paypal_business") {
    return destination.connectionState === "connected"
      ? `PayPal Business · ${destination.verifiedBusinessEmailMask ?? "connected"}`
      : "PayPal Business · connection pending";
  }
  return destination.connectionState === "connected"
    ? "Hosted card processor · connected"
    : "Hosted card processor · setup pending";
}

export function isProviderPaymentDestination(
  destination: PaymentDestination,
): destination is ProviderPaymentDestination {
  return destination.ownerType === "provider";
}
