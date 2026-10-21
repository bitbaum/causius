import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";
import { HelperDirectory } from "@/components/helpers/HelperDirectory";
import { btnPrimary, btnQuiet, card, eyebrow, shell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { dbConfigured, getDb } from "@/lib/db";
import { directory, type PublicHelper } from "@/lib/helpers/store";
import { ROUTES } from "@/lib/routes";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "Helpers" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const RULES = ["label", "pseudonym", "share"] as const;

/**
 * The directory of helpers, with Causius AI first because it is always there.
 *
 * NOBODY IS INVENTED. Every profile below is a real account that listed itself,
 * and a lawyer appears only for the places a reviewer checked (lib/helpers).
 * The earlier Lex demo filled this page with invented lawyers and ratings; a
 * person with a deadline will try to hire them. There are no ratings here at
 * all until there are real ones.
 */
export default async function HelpersPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(toLocale(locale));
  const t = await getTranslations("Helpers");
  const p = await getTranslations("Professions");

  let helpers: PublicHelper[] | null = null;
  if (dbConfigured()) {
    try {
      helpers = await directory(getDb());
    } catch (error) {
      console.error("[helpers] directory unavailable", error instanceof Error ? error.message : error);
    }
  }

  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <p className={eyebrow}>{t("eyebrow")}</p>
      <h1 className="mt-4 max-w-[22ch] headline text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-5 max-w-prose text-lg leading-relaxed text-fg-secondary">{t("lead")}</p>

      <div className="mt-8 grid gap-4 md:grid-cols-2">
        <section className={`${card} grid content-start gap-3`}>
          <p className="kicker">{p("kinds.ai.name")}</p>
          <h2 className="text-xl font-semibold tracking-tight">{p("causius")}</h2>
          <p className="text-sm text-fg-secondary">{t("ai.line")}</p>
          <p>
            <Link href={ROUTES.matters} className={btnPrimary}>
              {t("ai.start")}
            </Link>
          </p>
        </section>
        <section className={`${card} grid content-start gap-3`}>
          <h2 className="text-xl font-semibold tracking-tight">{t("offerTitle")}</h2>
          <p className="text-sm text-fg-secondary">{t("offerBody")}</p>
          <p>
            <Link href={ROUTES.helperDesk} className={btnQuiet}>
              {t("offerCta")}
            </Link>
          </p>
        </section>
      </div>

      <section className="mt-12">
        {helpers ? (
          <Suspense>
            <HelperDirectory helpers={helpers} />
          </Suspense>
        ) : (
          <p className="text-fg-secondary">{t("unavailable")}</p>
        )}
      </section>

      <section className="mt-16">
        <h2 className="headline text-3xl">{t("rulesTitle")}</h2>
        <dl className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-3">
          {RULES.map((rule) => (
            <div key={rule}>
              <dt className="text-lg font-semibold tracking-tight">{t(`rules.${rule}.title`)}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-fg-secondary">{t(`rules.${rule}.body`)}</dd>
            </div>
          ))}
        </dl>
      </section>
    </main>
  );
}
