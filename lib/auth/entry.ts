import { authorizationParams, returnPath, type EntryMode } from "@bitbaum/accountkit/orangecat";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { ROUTES } from "@/lib/routes";
import { auth, authEnabled, signIn } from "./index";

/**
 * GET /<locale>/sign-in and /<locale>/sign-up: straight to OrangeCat's one
 * sign-in screen (email and password, an emailed code, Google, GitHub, or
 * "Create an account"), titled for Causius. There is no Causius sign-in screen
 * in front of it: one screen, the same in every fleet product — the account
 * made there opens Solon and Loki as well. Same shape as Solon's entry routes.
 *
 * `from` arrives in a URL anyone can write; accountkit's returnPath refuses
 * anything that is not a path on this site, so sign-in is no open redirect.
 */
export function entryRoute(mode: EntryMode) {
  return async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
    const locale = toLocale((await params).locale);
    const from = returnPath(request.nextUrl.searchParams.get("from"), ROUTES.matters);
    const target = getPathname({ href: from, locale });
    if ((await auth())?.actorId) redirect(target);
    if (!authEnabled) redirect(getPathname({ href: `${ROUTES.authError}?error=Configuration`, locale }));
    await signIn("orangecat", { redirectTo: target }, authorizationParams({ mode }));
    throw new Error("signIn did not redirect");
  };
}

/** The link that starts it. A plain <a>, never a prefetching <Link>. */
export function entryHref(mode: EntryMode, locale: string, from?: string): string {
  return getPathname({
    href: { pathname: mode === "sign-up" ? ROUTES.signUp : ROUTES.signIn, query: from ? { from } : {} },
    locale: toLocale(locale),
  });
}
