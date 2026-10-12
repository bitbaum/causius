import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { contentSecurityPolicy } from "./lib/security";

const handleI18nRouting = createMiddleware(routing);

/**
 * Every page request gets two things here:
 *
 *  1. A language. `/de/cases` renders German; `/` redirects to the reader's.
 *  2. A Content-Security-Policy with a fresh nonce. Causius handles legal
 *     letters, so a script injected into a page could read a case straight
 *     out of the browser's storage. With this policy the browser runs only
 *     scripts this response vouched for: Next's own, carrying the nonce.
 *
 * Next reads the nonce from the REQUEST's CSP header and stamps it on its own
 * scripts, so the policy is forwarded on the request as well as set on the
 * response. next-intl builds its own response, so the request headers are
 * forwarded with Next's override mechanism rather than NextResponse.next().
 */
export default function proxy(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const csp = contentSecurityPolicy(nonce, {
    dev: process.env.NODE_ENV === "development",
    widget: Boolean(process.env.NEXT_PUBLIC_FC_WIDGET_TOKEN),
  });

  const response = handleI18nRouting(request);

  const overridden = response.headers.get("x-middleware-override-headers");
  const names = new Set(overridden ? overridden.split(",") : []);
  if (!overridden) {
    // Next replaces the request's headers with exactly the overridden list,
    // so the first override has to carry every original header along.
    request.headers.forEach((value, key) => {
      names.add(key);
      response.headers.set(`x-middleware-request-${key}`, value);
    });
  }
  for (const [key, value] of [
    ["content-security-policy", csp],
    ["x-nonce", nonce],
  ] as const) {
    names.add(key);
    response.headers.set(`x-middleware-request-${key}`, value);
  }
  response.headers.set("x-middleware-override-headers", [...names].join(","));
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|_vercel|.*\\.(?:ico|png|jpe?g|svg|webp|gif|txt|xml|json|webmanifest|woff2?|map|js|css)$).*)",
      // A prefetch is not rendered for a reader and needs no nonce.
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
