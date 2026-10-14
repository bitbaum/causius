import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { EntryLinks } from "@/components/site/EntryLinks";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { ROUTES } from "@/lib/routes";

const STEPS = ["describe", "work", "approve"] as const;
const TIERS = ["ai", "assistant", "lawyer"] as const;
const PRIVACY = ["redact", "sealed", "pseudonymous"] as const;
const EXAMPLE_STEPS = ["s1", "s2", "s3", "s4"] as const;

/**
 * The front door, and deliberately short: a first visit is a decision to try,
 * not a document to read. One screen says what it is and shows a matter being
 * worked; the rest says how it works, why it is private and who can help, in a
 * line or two each. Depth lives one click away (/platform, /security,
 * /helpers), and lib/copy-budget.test.ts holds the page to a word budget so it
 * cannot quietly grow back.
 *
 * Nothing here is claimed unless it is true today: no helper count, no
 * testimonial, no "trusted by". The example matter is labelled as one. What is
 * real today, and the identity statement, are on /platform.
 */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(toLocale((await params).locale));
  const t = await getTranslations("Home");
  const locale = await getLocale();
  const session = await auth();

  return (
    <main>
      <section className="public-backdrop border-b border-border-subtle">
        <div className="section-shell grid gap-12 py-section-tight lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div className="rise">
            <div className="kicker">{t("hero.kicker")}</div>
            <h1 className="headline-caps mt-5 text-5xl sm:text-6xl lg:text-7xl">
              {t("hero.line1")}
              <br />
              {t("hero.line2")}
            </h1>
            <p className="mt-7 max-w-lede text-lg text-fg-primary sm:text-xl">{t("hero.lede")}</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Link href={ROUTES.matters} className="btn-frame-accent">
                {t("hero.open")}
              </Link>
              <Link href={ROUTES.newCase} className="btn-frame">
                {t("hero.quick")}
              </Link>
            </div>
          </div>

          {/* What a matter looks like. Invented, and labelled so. */}
          <figure lang={locale} className="rise rounded-surface border border-border bg-surface-base/80 p-6" aria-label={t("example.label")}>
            <figcaption className="flex items-center justify-between gap-4">
              <span className="kicker">{t("example.label")}</span>
              <span className="font-mono text-xs text-fg-tertiary">CH-ZH</span>
            </figcaption>
            <div className="mt-4 text-xl font-semibold text-fg-primary">{t("example.title")}</div>
            <ol className="mt-5 divide-y divide-border-subtle border-y border-border-subtle text-sm">
              {EXAMPLE_STEPS.map((s) => (
                <li key={s} className="grid grid-cols-[6.5rem_1fr] gap-3 py-2.5">
                  <span className="font-mono text-xs uppercase text-fg-tertiary">{t(`example.${s}.tool`)}</span>
                  <span className="text-fg-secondary">{t(`example.${s}.text`)}</span>
                </li>
              ))}
            </ol>
          </figure>
        </div>
      </section>

      <section className="section-shell py-section-tight">
        <h2 className="headline-caps max-w-3xl text-3xl sm:text-4xl">{t("how.title")}</h2>
        <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, i) => (
            <li key={step} className="border-t border-border-strong pt-6">
              <div className="font-mono text-sm text-fg-tertiary">0{i + 1}</div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-fg-primary">{t(`how.${step}.title`)}</h3>
              <p className="mt-2 text-fg-secondary">{t(`how.${step}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border-subtle bg-surface-public py-section-tight">
        <div className="section-shell">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="headline-caps text-3xl sm:text-4xl">{t("privacy.title")}</h2>
            <Link href={ROUTES.security} className="text-link inline-flex min-h-11 items-center text-sm">
              {t("privacy.cta")}
            </Link>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {PRIVACY.map((p) => (
              <div key={p}>
                <span className="block h-1 w-6 bg-accent" aria-hidden="true" />
                <h3 className="mt-4 text-lg font-semibold text-fg-primary">{t(`privacy.${p}.title`)}</h3>
                <p className="mt-2 text-fg-secondary">{t(`privacy.${p}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell py-section-tight">
        <h2 className="headline-caps text-3xl sm:text-4xl">{t("tiersTitle")}</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {TIERS.map((tier) => (
            <article key={tier} className="flex flex-col justify-between rounded-surface border border-border p-6">
              <div>
                <h3 className="text-xl font-semibold tracking-tight text-fg-primary">{t(`tiers.${tier}.name`)}</h3>
                <p className="mt-3 text-fg-secondary">{t(`tiers.${tier}.can`)}</p>
              </div>
              <p className="mt-6 border-t border-border-subtle pt-3 text-sm text-fg-tertiary">{t(`tiers.${tier}.limit`)}</p>
            </article>
          ))}
        </div>
        <p className="mt-6">
          <Link href={ROUTES.helpers} className="text-link inline-flex min-h-11 items-center text-sm">
            {t("marketplaceLink")}
          </Link>
        </p>
      </section>

      <section className="public-backdrop border-t border-border-subtle py-section-tight">
        <div className="section-shell grid gap-10 lg:grid-cols-2 lg:items-end lg:gap-20">
          <div>
            <h2 className="headline-caps text-3xl sm:text-4xl">{t("fleet.title")}</h2>
            <p className="mt-4 max-w-xl text-fg-secondary">{t("fleet.lede")}</p>
            <Link href={ROUTES.ecosystem} className="text-link mt-6 inline-flex min-h-11 items-center text-sm">
              {t("fleet.more")}
            </Link>
          </div>
          <div>
            {session?.actorId ? (
              <Link href={ROUTES.matters} className="btn-frame-accent">
                {t("fleet.signedIn")}
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
