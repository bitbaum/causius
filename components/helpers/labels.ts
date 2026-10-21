import { jurisdictionLabel } from "@/lib/jurisdictions";

/** A language's name in the reader's language, from the browser's own tables. */
export function languageName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export const placeList = (codes: readonly string[], locale: string) =>
  codes.map((c) => jurisdictionLabel(c, locale)).join(" · ");

export const languageList = (codes: readonly string[], locale: string) =>
  codes.map((c) => languageName(c, locale)).join(" · ");

/** "orangecat.ch" from a service link, to say where someone is paid without printing a URL. */
export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
