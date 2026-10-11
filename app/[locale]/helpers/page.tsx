import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { btnPrimary, card, eyebrow, link, shell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { EXTERNAL, ROUTES } from "@/lib/routes";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale: toLocale(locale), namespace: "Helpers" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/**
 * NOBODY IS LISTED HERE YET, AND THE PAGE SAYS SO.
 *
 * The earlier Lex demo in Botsmann filled this space with invented lawyers,
 * ratings and response times. For a demo that reads as "illustrative"; on a
 * live legal site it reads as real people who can be hired, and a person with a
 * deadline will try. So: the rules, the roles and where to list yourself — and
 * profiles only when there are real ones.
 *
 * WHERE A HELPER LIVES. Fleet STACK.md, "Identity": if an app needs profiles,
 * payments or a public presence, those live at OrangeCat, and rebuilding them
 * here is the same mistake in a different repo. A helper is an OrangeCat actor
 * offering a service; they are paid there by the person they helped. What
 * Causius adds on top — the label, and checking a lawyer's admission — is not
 * built yet, and the page says that too ("Planned:").
 */
const ROLES = ["assistant", "lawyer"] as const;
const RULES = ["label", "pseudonym", "share", "place"] as const;
const DOES = ["does1", "does2", "does3"] as const;

export default async function HelpersPage({ params }: Params) {
  const { locale } = await params;
  setRequestLocale(toLocale(locale));
  const t = await getTranslations("Helpers");
  const inlineLink = `${link} inline-flex min-h-11 items-center`;

  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <p className={eyebrow}>{t("eyebrow")}</p>
      <h1 className="mt-4 max-w-[22ch] font-heading text-4xl font-semibold leading-tight tracking-display sm:text-5xl">
        {t("title")}
      </h1>
      <p className="mt-5 max-w-prose text-lg leading-relaxed text-fg-secondary">{t("lead")}</p>

      <div className="mt-8 rounded-card border border-accent-fg px-5 py-4">
        <p className="font-medium">{t("noneTitle")}</p>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-fg-secondary">{t("noneBody")}</p>
      </div>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {ROLES.map((role) => (
          <article key={role} className={`${card} sm:p-8`}>
            <h2 className="font-heading text-2xl font-semibold">{t(`${role}.name`)}</h2>
            <p className="mt-1 font-mono text-xs uppercase tracking-caps text-fg-secondary">
              {t("listedUnder", { identity: t(`${role}.identity`) })}
            </p>
            <ul className="mt-5 grid list-disc gap-2 pl-5 text-sm leading-relaxed">
              {DOES.map((d) => (
                <li key={d}>{t(`${role}.${d}`)}</li>
              ))}
            </ul>
            <p className="mt-4 text-sm leading-relaxed text-fg-secondary">{t(`${role}.doesNot`)}</p>
            <p className="mt-4 border-t border-border-subtle pt-4 text-sm leading-relaxed text-fg-secondary">
              {t(`${role}.checks`)}
            </p>
          </article>
        ))}
      </div>

      <section className={`${card} mt-5 sm:p-8`}>
        <h2 className="font-heading text-2xl font-semibold">{t("wantTitle")}</h2>
        <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-secondary">{t("wantBody")}</p>
        <p className="mt-3 flex flex-wrap gap-x-8">
          <a href={EXTERNAL.orangecatOfferService} className={inlineLink}>
            {t("offer")}
          </a>
          <Link href={ROUTES.roadmap} className={inlineLink}>
            {t("seeRoadmap")}
          </Link>
        </p>
      </section>

      <section className="mt-16">
        <h2 className="font-heading text-3xl font-semibold tracking-display">{t("rulesTitle")}</h2>
        <dl className="mt-6 grid gap-x-10 gap-y-8 sm:grid-cols-2">
          {RULES.map((rule) => (
            <div key={rule}>
              <dt className="font-heading text-lg font-semibold">{t(`rules.${rule}.title`)}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-fg-secondary">
                {t(`rules.${rule}.body`)}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <p className="mt-14">
        <Link href={ROUTES.newCase} className={btnPrimary}>
          {t("start")} <span aria-hidden="true">&rarr;</span>
        </Link>
      </p>
    </main>
  );
}
