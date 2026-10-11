import { getTranslations, setRequestLocale } from "next-intl/server";
import { btnPrimary, card, eyebrow, link, shell } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { loadFleetPresence } from "@/lib/fleet";
import { ROUTES } from "@/lib/routes";

/**
 * The front page.
 *
 * One rule carried over from the day-zero placeholder it replaced: nothing here
 * is claimed unless it is true today. There is no helper count, no testimonial
 * and no "trusted by" — nobody is listed in the marketplace yet, and the
 * helpers page says exactly that.
 */
const STEPS = ["one", "two", "three"] as const;
const TIERS = ["ai", "assistant", "lawyer"] as const;
/** The order a reader is owed it in: what hurts, what we built, why, where it goes. */
const IDENTITY = ["problem", "solution", "mission", "vision"] as const;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(toLocale(locale));
  const t = await getTranslations("Home");

  // Rendered from the Loki project profile, never authored here (fleet
  // AGENTS.md, "The identity contract"). An empty field renders nothing. The
  // profile is written once, in English, so it is marked as English.
  const { identity } = await loadFleetPresence();
  const stated = IDENTITY.filter((key) => identity[key]);

  return (
    <main>
      <section className={`${shell} py-16 sm:py-24`}>
        <p className={eyebrow}>{t("eyebrow")}</p>
        <h1 className="mt-5 max-w-[20ch] font-heading text-5xl font-semibold leading-[1.02] tracking-display sm:text-7xl">
          {t("title")}
        </h1>
        <p className="mt-7 max-w-prose text-lg leading-relaxed text-fg-secondary">{t("lead")}</p>
        <div className="mt-9 flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-8">
          <Link href={ROUTES.newCase} className={btnPrimary}>
            {t("start")} <span aria-hidden="true">&rarr;</span>
          </Link>
          <Link href={ROUTES.sampleCase} className={`${link} inline-flex min-h-11 items-center`}>
            {t("example")}
          </Link>
        </div>
      </section>

      <section className="border-y border-border-subtle">
        <ol className={`${shell} grid gap-10 py-12 sm:grid-cols-3`}>
          {STEPS.map((step, i) => (
            <li key={step}>
              <p className={eyebrow}>0{i + 1}</p>
              <h2 className="mt-3 font-heading text-xl font-semibold">{t(`steps.${step}.title`)}</h2>
              <p className="mt-2 text-sm leading-relaxed text-fg-secondary">
                {t(`steps.${step}.body`)}
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section className={`${shell} py-16`}>
        <h2 className="max-w-[26ch] font-heading text-3xl font-semibold tracking-display sm:text-4xl">
          {t("tiersTitle")}
        </h2>
        <p className="mt-4 max-w-prose leading-relaxed text-fg-secondary">{t("tiersLead")}</p>
        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <article key={tier} className={card}>
              <h3 className="font-heading text-xl font-semibold">{t(`tiers.${tier}.name`)}</h3>
              <p className="mt-3 text-sm leading-relaxed text-fg-primary">{t(`tiers.${tier}.can`)}</p>
              <p className="mt-3 border-t border-border-subtle pt-3 text-sm leading-relaxed text-fg-secondary">
                {t(`tiers.${tier}.limit`)}
              </p>
            </article>
          ))}
        </div>
        <p className="mt-8">
          <Link href={ROUTES.helpers} className={`${link} inline-flex min-h-11 items-center`}>
            {t("marketplaceLink")}
          </Link>
        </p>
      </section>

      {stated.length > 0 && (
        <section className="border-t border-border-subtle">
          <dl className={`${shell} grid gap-x-12 gap-y-10 py-16 sm:grid-cols-2`}>
            {stated.map((key) => (
              <div key={key}>
                <dt className={eyebrow}>{t(`identity.${key}`)}</dt>
                <dd lang="en" className="mt-3 max-w-prose leading-relaxed">
                  {identity[key]}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className={`${shell} pb-4`}>
        <div className={`${card} sm:p-8`}>
          <h2 className="font-heading text-2xl font-semibold">{t("privacyTitle")}</h2>
          <p className="mt-3 max-w-prose text-sm leading-relaxed text-fg-secondary">
            {t("privacyBody")}
          </p>
        </div>
      </section>
    </main>
  );
}
