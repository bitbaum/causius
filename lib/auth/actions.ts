"use server";

import { signIn, signOut } from "./index";

/**
 * Sign-in and sign-out as server actions, so the client never handles a
 * token. `returnTo` is constrained to this site's own paths: an open redirect
 * through a sign-in flow is a classic phishing aid.
 */
export async function signInWithOrangecat(returnTo: string) {
  const safe = /^\/(en|de|fr)(\/[\w\-/]*)?$/.test(returnTo) ? returnTo : "/en/matters";
  await signIn("orangecat", { redirectTo: safe });
}

export async function signOutOfCausius(locale: string) {
  await signOut({ redirectTo: `/${["en", "de", "fr"].includes(locale) ? locale : "en"}` });
}
