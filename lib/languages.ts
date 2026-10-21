/**
 * Languages a letter can be translated into, as BCP 47 codes. Wider than the
 * interface (i18n/routing.ts) on purpose: the people who most need a letter
 * explained are often the ones who do not read the language it is written in.
 * The interface's languages come first, then the languages most spoken by
 * people who moved to Switzerland and Liechtenstein.
 */
export const TRANSLATION_LANGUAGES = [
  "en", "de", "fr", "it", "es",
  "pt", "sq", "sr", "hr", "tr", "ar", "uk", "ru", "fa", "ti", "ta", "zh", "vi", "tl",
] as const;
export type TranslationLanguage = (typeof TRANSLATION_LANGUAGES)[number];

/** The analysis translates into at most this many at once (lib/analyze.ts). */
export const MAX_TRANSLATIONS = 4;

/** A language's name in the reader's language, from the runtime's own tables. */
export function languageName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}
