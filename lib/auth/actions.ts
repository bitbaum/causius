"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./index";

/** Sign out and go to the home page of the language the person was reading. */
export async function signOutOfCausius(locale: string) {
  await getAuth().api.signOut({ headers: await headers() });
  redirect(`/${["en", "de", "fr"].includes(locale) ? locale : "en"}`);
}
