/**
 * The site's security headers, in one place.
 *
 * Causius holds the most private paperwork people have — migration, tax,
 * court, debt — so the browser is told to trust as little as possible:
 *
 *  - scripts only from this origin, and only those carrying this response's
 *    nonce (`strict-dynamic` lets those load their own chunks, nothing else);
 *  - network requests only to this origin: a case can be read only by the page
 *    that made it, and a script that slipped in still has nowhere to send it;
 *  - no framing (clickjacking), no plugins, no <base> rewriting, forms post
 *    only here;
 *  - HTTPS only, for two years, subdomains included;
 *  - no referrer leaves the site: a case URL never shows up in someone else's
 *    logs;
 *  - camera, microphone, location and payment APIs are off for every frame.
 *
 * The Loki feedback widget is the one third party, and it is allowed only when
 * this deployment turns the widget on.
 */
const LOKI = "https://loki.orangecat.ch";

export function contentSecurityPolicy(
  nonce: string,
  { dev = false, widget = false }: { dev?: boolean; widget?: boolean } = {},
): string {
  const extra = widget ? ` ${LOKI}` : "";
  return [
    "default-src 'self'",
    // `unsafe-eval` only in development, where React needs it for its stacks.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`,
    // Next and bip-kit set a few inline style attributes; styles cannot run
    // code, and blocking them would only break layout.
    "style-src 'self' 'unsafe-inline'",
    // blob: and data: for the page photos previewed before they are sent.
    "img-src 'self' blob: data:",
    "font-src 'self'",
    `connect-src 'self'${extra}${dev ? " ws:" : ""}`,
    widget ? `frame-src ${LOKI}` : "frame-src 'none'",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

/** Headers for every response, pages and API alike. Read by next.config.ts. */
export const SECURITY_HEADERS: { key: string; value: string }[] = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  {
    key: "Permissions-Policy",
    value:
      "camera=(), microphone=(), geolocation=(), payment=(), usb=(), serial=(), bluetooth=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
];
