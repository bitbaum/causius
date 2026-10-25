import { isStaff } from "@bitbaum/accountkit/auth";
import { createAuthRuntime } from "@bitbaum/accountkit/auth/next";
import { dbConfigured, getDb } from "../db";
import { mailConfigured, sendAuthMail } from "../mail";
import { SITE } from "../site";
import { adoptLegacyMatters } from "./legacy";

/**
 * Accounts for Causius: the same account system as every fleet product
 * (@bitbaum/accountkit/auth) — email and password, a link, a passkey, two-step
 * codes, and, where configured, the shared bitbaum sign-in and OrangeCat. A
 * person does not need an OrangeCat account; with one, it is one click.
 */
export const { GET, POST, getSession, requireUser, authStatus, getAuth } =
  createAuthRuntime({
    site: SITE,
    mail: {
      get configured() {
        return mailConfigured();
      },
      send: sendAuthMail,
    },
    isDatabaseConfigured: () => dbConfigured(),
    getDatabase: () => getDb(),
    // Matters made while OrangeCat was the only way in belong to the same person.
    onAccountCreated: async ({ userId, providerId, accountId }) => {
      if (providerId === "orangecat")
        await adoptLegacyMatters(getDb(), accountId, userId);
    },
  });

/**
 * The signed-in person as the rest of the app reads them: `actorId` is the
 * account's id, kept under the name every call site already uses.
 */
export async function auth(): Promise<{
  actorId: string;
  user: { name: string; image: string | null };
} | null> {
  const session = await getSession();
  if (!session) return null;
  return {
    actorId: session.user.id,
    user: { name: session.user.name, image: session.user.image ?? null },
  };
}

/**
 * The signed-in person if they may review credentials: staff or admin, the
 * role only `pnpm run role:grant` (or the Grant role workflow) changes. Nobody
 * reviews by holding an email address or by asking.
 */
export async function reviewer(): Promise<{ actorId: string } | null> {
  const session = await getSession();
  return session && isStaff(session.user.role)
    ? { actorId: session.user.id }
    : null;
}
