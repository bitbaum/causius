import { defineRouting } from "next-intl/routing";

/**
 * The languages Causius speaks — the one list every other file reads.
 *
 * English is the source every translation is made from. Every page lives
 * under its language (`/en/cases`, `/de/cases`, `/fr/cases`), and `/` redirects.
 * German follows Swiss spelling (ss, never ß) — the first readers are in
 * Switzerland.
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
  // "always", not "as-needed". With an unprefixed default language, next-intl
  // serves `/cases` by REWRITING it to `/en/cases`, and a standalone Next
  // server behind the box's HTTPS proxy performs that rewrite as a request to
  // https://localhost:<port> — plain HTTP on that port, so every English page
  // answered 500 in production while /de and /fr worked (2026-10-11). A prefix
  // on every language means no rewrite exists to go wrong; `/` is a redirect.
  localePrefix: "always",
  // Only `/` has no language in it. There, the browser's language picks one
  // (German browser → /de) and the choice is remembered; any URL that already
  // names a language is served in that language, so a shared link stays as sent.
  localeDetection: true,
});
