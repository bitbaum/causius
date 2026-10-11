import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MattersHome } from "@/components/matters/MattersHome";
import { btnPrimary, card, link, shell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { auth, authEnabled } from "@/lib/auth";
import { signInWithOrangecat } from "@/lib/auth/actions";
import { ROUTES } from "@/lib/routes";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const t = await getTranslations({ locale: toLocale((await params).locale), namespace: "Matters" });
  return { title: t("title") };
}

export default async function MattersPage({ params }: Params) {
  const locale = toLocale((await params).locale);
  setRequestLocale(locale);
  const t = await getTranslations("Matters");
  const session = await auth();

  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <h1 className="font-heading text-4xl font-semibold tracking-display">{t("title")}</h1>
      <p className="mt-3 max-w-prose leading-relaxed text-fg-secondary">{t("lead")}</p>
      <div className="mt-10">
        {session?.actorId ? (
          <MattersHome />
        ) : (
          <div className={`${card} grid gap-4 sm:p-8`}>
            <h2 className="font-heading text-2xl font-semibold">{t("signInTitle")}</h2>
            <p className="max-w-prose text-sm leading-relaxed text-fg-secondary">{t("signInLead")}</p>
            {authEnabled ? (
              <form action={signInWithOrangecat.bind(null, `/${locale}${ROUTES.matters}`)}>
                <button type="submit" className={btnPrimary}>
                  {t("signIn")}
                </button>
              </form>
            ) : (
              <p className="text-sm">{t("signInOff")}</p>
            )}
            <p className="text-sm">
              <Link href={ROUTES.newCase} className={`${link} inline-flex min-h-11 items-center`}>
                {t("quickCheckSignedOut")}
              </Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
