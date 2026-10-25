import { returnPath } from "@bitbaum/accountkit/orangecat";
import { routing } from "@/i18n/routing";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { ROUTES } from "@/lib/routes";

/** The link to the sign-in or sign-up screen, carrying where to come back to. */
export function entryHref(
  mode: "sign-in" | "sign-up",
  locale: string,
  from?: string,
): string {
  return getPathname({
    href: {
      pathname: mode === "sign-up" ? ROUTES.signUp : ROUTES.signIn,
      query: from ? { next: from } : {},
    },
    locale: toLocale(locale),
  });
}

/** Localize once, preserving safe callback paths and rejecting auth-page loops. */
export function accountDestination(locale: string, requested?: string) {
  const safe = returnPath(requested, ROUTES.matters);
  const prefix = new RegExp(`^/(?:${routing.locales.join("|")})(?=/|$)`);
  const plain = safe.replace(prefix, "") || "/";
  if (/^\/(?:sign-in|sign-up)(?:[/?#]|$)/.test(plain)) {
    return getPathname({ href: ROUTES.matters, locale: toLocale(locale) });
  }
  return prefix.test(safe)
    ? safe
    : getPathname({ href: safe, locale: toLocale(locale) });
}
