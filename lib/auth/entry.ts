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
