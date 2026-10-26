import { redirect as redirectTo } from "next/navigation";
import { authLabelsFor } from "@bitbaum/accountkit/auth";
import { accountDestination } from "@/lib/auth/entry";
import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SignInForm } from "@/components/auth/SignInForm";
import { AccountsUnavailable } from "@/components/auth/Unavailable";
import { card, shell } from "@/components/ui";
import { getPathname } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { signInMethods } from "@bitbaum/accountkit/auth";
import { authStatus, getSession } from "@/lib/auth";
import { mailConfigured } from "@/lib/mail";
import { ROUTES } from "@/lib/routes";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    next?: string;
    from?: string;
    method?: string; error?: string;
    token?: string;
  }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const t = await getTranslations({
    locale: toLocale((await params).locale),
    namespace: "Auth",
  });
  return { title: t("signIn"), robots: { index: false } };
}

export default async function SignInPage({ params, searchParams }: Props) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("Auth");
  const query = await searchParams;
  const next = accountDestination(locale, query.next ?? query.from);
  const recovering = Boolean(query.token) || (query.error === "INVALID_TOKEN" && query.method !== "magic-link");
  if ((await getSession()) && !recovering) redirectTo(next);

  return (
    <div className={`${shell} py-12 sm:py-16`}>
      <div className={`${card} mx-auto max-w-md`}>
        <h1 className="mb-6 text-2xl font-semibold">
          {recovering
            ? authLabelsFor(locale).recovery?.reset
            : t("signInTitle")}
        </h1>
        {authStatus().ready ? (
          <SignInForm
            methods={signInMethods(process.env, mailConfigured())}
            next={next}
            signInPath={getPathname({ href: ROUTES.signIn, locale })}
            initialError={Boolean(query.error)}
          />
        ) : (
          <AccountsUnavailable />
        )}
      </div>
    </div>
  );
}
