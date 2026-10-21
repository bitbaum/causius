import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { AccountsUnavailable } from "@/components/auth/Unavailable";
import { card, shell } from "@/components/ui";
import { getPathname, Link, redirect } from "@/i18n/navigation";
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
  const h = await getTranslations("HelperDesk");
  const query = await searchParams;
  const asHelper = safeNext(query.next ?? query.from) === ROUTES.helperDesk;

  if (await getSession())
    redirect({ href: safeNext(query.next ?? query.from), locale });

  return (
    <div className={`${shell} py-12 sm:py-16`}>
      <div className={`${card} mx-auto max-w-md`}>
        <h1 className="mb-2 text-2xl font-semibold">{t("signUpTitle")}</h1>
        <p className="mb-6 text-fg-secondary">{t("signUpLede")}</p>
        {/* Who is signing up decides where they land; both are the same account. */}
        <nav aria-label={h("roleLegend")} className="mb-6 grid grid-cols-2 gap-2">
          {(
            [
              { key: "forClient", next: ROUTES.matters },
              { key: "forHelper", next: ROUTES.helperDesk },
            ] as const
          ).map((r) => {
            const on = asHelper === (r.next === ROUTES.helperDesk);
            return (
              <Link
                key={r.key}
                href={{ pathname: ROUTES.signUp, query: { next: r.next } }}
                aria-current={on ? "true" : undefined}
                className="flex min-h-14 items-center justify-center rounded-control border border-border px-3 py-2 text-center text-sm font-medium aria-[current=true]:border-accent aria-[current=true]:bg-accent/10"
              >
                {h(r.key)}
              </Link>
            );
          })}
        </nav>
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
