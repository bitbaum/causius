import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { Compare } from "@/components/home/Compare";
import { MatterDemo } from "@/components/home/MatterDemo";
import { Markets } from "@/components/home/Markets";
import { PrivacyFlow } from "@/components/home/PrivacyFlow";
import { TimeCompare } from "@/components/home/TimeCompare";
import { EntryLinks } from "@/components/site/EntryLinks";
import { chip } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";
import { WORKFLOWS } from "@/lib/workflows";
import { jurisdictionLabel, MARKETS } from "@/lib/jurisdictions";

/**
 * The front door. Each section shows one true thing rather than telling it:
 * the product working a letter, the days it saves, what it is and is not next
 * to a chatbot and a lawyer, the anonymisation itself, where it works, and who
 * to turn to when a person is needed. Prose is a line or two; the pictures
 * carry the rest (lib/copy-budget.test.ts holds the words).
 *
 * Nothing is claimed that is not true today: no counts of users or helpers,
 * no testimonials, no "trusted by". The example letter is invented, and says so.
 */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(toLocale((await params).locale));
  const t = await getTranslations("Home");
  const w = await getTranslations("Workflows");
  const session = await auth();
  const locale = await getLocale();
  const headline = (key: string) => (
    <>
      {t(`${key}.title`)} <em>{t(`${key}.titleEm`)}</em>
    </>
  );

  return (
    <main>
      <section className="public-backdrop border-b border-border-subtle">
        <div className="section-shell grid gap-12 py-section-tight lg:grid-cols-[1.15fr_1fr] lg:items-center lg:gap-16">
          <div className="rise">
            <p className="kicker">{MARKETS.map((m) => jurisdictionLabel(m.code, locale)).join(" · ")}</p>
            <h1 className="headline mt-5 text-5xl sm:text-6xl lg:text-7xl">{headline("hero")}</h1>
            <p className="mt-7 max-w-lede text-lg text-fg-primary sm:text-xl">{t("hero.lede")}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href={ROUTES.newCase} className="btn-frame-accent">
                {t("hero.quick")}
              </Link>
              <Link href={ROUTES.matters} className="btn-frame">
                {t("hero.open")}
              </Link>
            </div>
            <p className="mt-4 text-sm text-fg-tertiary">{t("hero.noAccount")}</p>
          </div>
          <div className="rise">
            <MatterDemo />
          </div>
        </div>
      </section>

      <section className="section-shell py-section-tight">
        <h2 className="headline max-w-3xl text-4xl sm:text-5xl">{headline("time")}</h2>
        <div className="mt-10">
          <TimeCompare />
        </div>
      </section>

      <section className="border-y border-border-subtle bg-surface-public py-section-tight">
        <div className="section-shell">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="headline max-w-3xl text-4xl sm:text-5xl">{headline("privacy")}</h2>
            <Link href={ROUTES.security} className="text-link inline-flex min-h-11 items-center text-sm">
              {t("privacy.cta")}
            </Link>
          </div>
          <div className="mt-10">
            <PrivacyFlow />
          </div>
          <p className="mt-6 text-fg-secondary">{t("privacy.sealed")}</p>
        </div>
      </section>

      <section className="section-shell py-section-tight">
        <h2 className="headline text-4xl sm:text-5xl">{t("compare.title")}</h2>
        <div className="mt-10">
          <Compare />
        </div>
      </section>

      <section className="section-shell pb-section-tight">
        <h2 className="headline text-3xl sm:text-4xl">{t("problems.title")}</h2>
        <ul className="mt-6 flex flex-wrap gap-2">
          {WORKFLOWS.map((x) => (
            <li key={x.id}>
              <Link href={{ pathname: ROUTES.matters, query: { workflow: x.id } }} className={chip}>
                {w(`items.${x.id}.name`)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-border-subtle bg-surface-public py-section-tight">
        <div className="section-shell grid gap-12 lg:grid-cols-2">
          <div>
            <h2 className="headline text-3xl sm:text-4xl">{t("where.title")}</h2>
            <div className="mt-8">
              <Markets />
            </div>
          </div>
          <div>
            <h2 className="headline text-3xl sm:text-4xl">{t("help.title")}</h2>
            <ul className="mt-8 grid gap-4 text-fg-secondary">
              <li className="border-l-2 border-border-strong pl-4">{t("help.assistant")}</li>
              <li className="border-l-2 border-accent pl-4">{t("help.lawyer")}</li>
            </ul>
            <p className="mt-6 flex flex-wrap gap-x-6">
              <Link href={ROUTES.helpers} className="text-link inline-flex min-h-11 items-center">
                {t("help.find")}
              </Link>
              <Link href={ROUTES.helperDesk} className="text-link inline-flex min-h-11 items-center">
                {t("help.offer")}
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section className="public-backdrop py-section-tight">
        <div className="section-shell grid gap-10 lg:grid-cols-2 lg:items-end">
          <h2 className="headline text-4xl sm:text-5xl">{headline("end")}</h2>
          <div>
            {session?.actorId ? (
              <Link href={ROUTES.matters} className="btn-frame-accent">
                {t("end.signedIn")}
              </Link>
            ) : (
              <EntryLinks from={ROUTES.matters} frame />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
