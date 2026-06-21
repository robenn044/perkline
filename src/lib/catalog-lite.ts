import type { Category, Offer, Provider } from "./types";

/**
 * Compact, serializable catalog lookup passed from server components to client
 * components so package items (which only carry offerId/providerId) can render
 * rich rows without another fetch.
 */
export interface CatalogLiteItem {
  offerId: string;
  title: string;
  description: string;
  category: Category;
  durationLabel?: string;
  providerId: string;
  providerName: string;
  providerSeed: string;
  neighborhood: string;
  rating: number;
}

export type CatalogLite = Record<string, CatalogLiteItem>;

export function buildCatalogLite(offers: Offer[], providers: Provider[]): CatalogLite {
  const byId = new Map(providers.map((p) => [p.id, p]));
  const out: CatalogLite = {};
  for (const o of offers) {
    const p = byId.get(o.providerId);
    out[o.id] = {
      offerId: o.id,
      title: o.title,
      description: o.description,
      category: o.category,
      durationLabel: o.durationLabel,
      providerId: o.providerId,
      providerName: p?.displayName ?? o.providerId,
      providerSeed: p?.logoSeed ?? o.providerId,
      neighborhood: p?.neighborhood ?? "",
      rating: p?.rating ?? 0,
    };
  }
  return out;
}
