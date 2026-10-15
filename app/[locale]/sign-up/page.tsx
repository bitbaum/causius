import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { AccountsUnavailable } from "@/components/auth/Unavailable";
import { card, shell } from "@/components/ui";
import { getPathname, redirect } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { signInMethods } from "@bitbaum/accountkit/auth";
import { authStatus, getSession } from "@/lib/auth";
import { mailConfigured } from "@/lib/mail";
import { ROUTES, safeNext } from "@/lib/routes";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ next?: string; from?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: "Auth",
  });
  return { title: t("createAccount"), robots: { index: false } };
}

export default async function SignUpPage({ params, searchParams }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("Auth");
  const query = await searchParams;

  if (await getSession())
    redirect({ href: safeNext(query.next ?? query.from), locale });

  return (
    <div className={`${shell} py-12 sm:py-16`}>
      <div className={`${card} mx-auto max-w-md`}>
        <h1 className="mb-2 text-2xl font-semibold">{t("signUpTitle")}</h1>
        <p className="mb-6 text-fg-secondary">{t("signUpLede")}</p>
        {authStatus().ready ? (
          <SignUpForm
            methods={signInMethods(process.env, mailConfigured())}
            next={getPathname({
              href: safeNext(query.next ?? query.from),
              locale,
            })}
            signUpPath={getPathname({ href: ROUTES.signUp, locale })}
          />
        ) : (
          <AccountsUnavailable />
        )}
      </div>
    </div>
  );
}
