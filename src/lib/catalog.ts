import type { Category, LocaleCode } from "./types";

/**
 * Category registry. Labels are localizable per market — the Albania demo runs
 * en-AL with an sq-AL table ready, proving the i18n architecture.
 */

export const CATEGORY_LABELS: Record<Category, Partial<Record<LocaleCode, string>>> = {
  wellness: { "en-AL": "Wellness", "sq-AL": "Mirëqenie", "it-IT": "Benessere", "es-ES": "Bienestar" },
  food: { "en-AL": "Food", "sq-AL": "Ushqim", "it-IT": "Cibo", "es-ES": "Comida" },
  learning: { "en-AL": "Learning", "sq-AL": "Mësim", "it-IT": "Formazione", "es-ES": "Aprendizaje" },
  health: { "en-AL": "Health", "sq-AL": "Shëndet", "it-IT": "Salute", "es-ES": "Salud" },
  fitness: { "en-AL": "Fitness", "sq-AL": "Fitnes", "it-IT": "Fitness", "es-ES": "Fitness" },
  travel: { "en-AL": "Travel", "sq-AL": "Udhëtim", "it-IT": "Viaggi", "es-ES": "Viajes" },
  telecom: { "en-AL": "Telecom", "sq-AL": "Telekom", "it-IT": "Telecom", "es-ES": "Telecom" },
};

export function categoryLabel(category: Category, locale: LocaleCode = "en-AL"): string {
  return CATEGORY_LABELS[category]?.[locale] ?? CATEGORY_LABELS[category]?.["en-AL"] ?? category;
}
