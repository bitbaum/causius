import { orangecatClient, orangecatProvider, syncOcSession } from "@bitbaum/accountkit/orangecat";
import NextAuth from "next-auth";

/**
 * "Sign in with OrangeCat" — the only login Causius has.
 *
 * NO USERS TABLE, no password, no reset flow, no session table: the JWT
 * carries the OrangeCat actor id (`id_token.sub`) and nothing else is kept.
 * A person can be a pseudonym at OrangeCat and is the same pseudonym here.
 * Provider, refresh and their contract tests live once, in
 * @bitbaum/accountkit/orangecat (client_secret_post, PKCE, no email in the
 * profile, a session that ends when OrangeCat revokes the grant).
 */
const orangecat = orangecatClient();

/** False until the OrangeCat client is configured; the UI then hides sign-in. */
export const authEnabled = orangecat !== null;

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Behind Caddy the app never sees its public URL; AUTH_URL is pinned in the
  // box env as well (fleet nextauth-origin-audit).
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { error: "/en/auth/error" },
  // The session cookie is HttpOnly, Secure and SameSite=Lax by Auth.js default.
  providers: orangecat ? [orangecatProvider(orangecat)] : [],
  callbacks: {
    jwt({ token, profile, account }) {
      return syncOcSession({ token, profile, account }, orangecat);
    },
    session({ session, token }) {
      if (typeof token.actorId === "string") session.actorId = token.actorId;
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    /** OrangeCat actor id (id_token.sub). The only identity Causius knows. */
    actorId?: string;
  }
}
