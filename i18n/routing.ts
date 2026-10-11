import { defineRouting } from "next-intl/routing";

/**
 * The languages Causius speaks — the one list every other file reads.
 *
 * English is the source every translation is made from, and the default: it
 * serves unprefixed (`/cases`), the others under their code (`/de/cases`).
 * German follows Swiss spelling (ss, never ß) — the first readers are in
 * Switzerland. Same convention as Solon's `i18n/routing.ts`.
 */
export const locales = ["en", "de", "fr"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

/** A route's `[locale]` segment as a Locale — English for anything unknown. */
export function toLocale(value: string): Locale {
  return (locales as readonly string[]).includes(value) ? (value as Locale) : defaultLocale;
}

/** Each language named in itself, as the switcher shows it. */
export const localeNames: Record<Locale, string> = {
  en: "English",
  de: "Deutsch",
  fr: "Français",
};

/** Each language named in English, for the instruction the model is given. */
export const localeEnglishNames = {
  en: "English",
  de: "German",
  fr: "French",
} as const satisfies Record<Locale, string>;

export const routing = defineRouting({
  locales,
  defaultLocale,
  localePrefix: "as-needed",
  // The URL decides, never the browser's Accept-Language: a reader who opened
  // an English link keeps reading English until they choose otherwise. The
  // switcher is in the header on every page for exactly that choice.
  localeDetection: false,
});
