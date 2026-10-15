import { SignInError } from "@bitbaum/accountkit";
import "@bitbaum/accountkit/styles.css";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { shell } from "@/components/ui";
import { toLocale } from "@/i18n/routing";
import { redirect } from "@/i18n/navigation";
import { ROUTES } from "@/lib/routes";

/**
 * Auth.js `pages.error`. "Try again" restarts sign-in rather than going home,
 * and the provider's error code is never shown (accountkit's rule).
 */
export default async function AuthErrorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("AuthError");
  const { error } = await searchParams;
  return (
    <main className={`${shell} py-16`}>
      <SignInError
        error={error ?? null}
        retry={async () => {
          "use server";
          redirect({ href: ROUTES.signIn, locale });
        }}
        home={`/${locale}`}
        labels={{
          kicker: t("kicker"),
          failedTitle: t("failedTitle"),
          failedBody: t("failedBody"),
          deniedTitle: t("deniedTitle"),
          deniedBody: t("deniedBody"),
          configurationTitle: t("configurationTitle"),
          configurationBody: t("configurationBody"),
          tryAgain: t("tryAgain"),
          home: t("home"),
        }}
      />
    </main>
  );
}
