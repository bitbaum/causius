import { getLocale, getTranslations } from "next-intl/server";
import { entryHref } from "@/lib/auth/entry";

/**
 * The way in, wherever someone turns out to be signed out. Both links open
 * OrangeCat's one sign-in screen — on "Create an account" or "Sign in" — and
 * carry `from`, so the person lands back where they were. The account they make
 * there is the same account for Solon, Loki and OrangeCat, and the page says so.
 *
 * Plain <a>, never a prefetching <Link>: a prefetch would start a sign-in in
 * the background on every page that shows the button.
 */
export async function EntryLinks({ from, frame = false }: { from: string; frame?: boolean }) {
  const locale = await getLocale();
  const t = await getTranslations("Entry");
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
        <a href={entryHref("sign-up", locale, from)} className={frame ? "btn-frame-accent" : "btn-primary"}>
          {t("signUp")}
        </a>
        <a
          href={entryHref("sign-in", locale, from)}
          className="inline-flex min-h-11 items-center text-sm font-semibold text-fg-secondary underline-offset-4 transition-colors hover:text-fg-primary hover:underline"
        >
          {t("signIn")}
        </a>
      </div>
      <p className="max-w-xl text-sm text-fg-secondary">{t("cost")}</p>
    </div>
  );
}
