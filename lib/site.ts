/** Where Causius is served. The issuer of every attestation, whatever origin a dev server runs on. */
export const CANONICAL_URL = "https://causius.orangecat.ch";

/**
 * Who this deployment is, for accounts (cookie prefix, authenticator and passkey
 * names) and for a reader's own model (the referer it names).
 *
 * Accounts pin their origin rather than reading it from the request (behind
 * Caddy the app sees its internal one), so a local `pnpm dev` on localhost
 * would refuse every sign-in. `CAUSIUS_DEV_URL` names the local origin, and is
 * honoured only outside production: on the box it cannot move the origin.
 */
export const SITE = {
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NODE_ENV !== "production" && process.env.CAUSIUS_DEV_URL
      ? process.env.CAUSIUS_DEV_URL
      : CANONICAL_URL),
  title: "Causius",
  slug: "causius",
} as const;
