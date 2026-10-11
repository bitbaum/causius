import { getLocale, getTranslations, setRequestLocale } from "next-intl/server";
import { CapabilityList } from "@/components/site/CapabilityList";
import { EntryLinks } from "@/components/site/EntryLinks";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { CAPABILITY_KEYS } from "@/lib/capabilities";
import { loadFleetPresence } from "@/lib/fleet";
import { ROUTES } from "@/lib/routes";

const STEPS = ["describe", "work", "approve"] as const;
const TIERS = ["ai", "assistant", "lawyer"] as const;
const PRIVACY = ["redact", "sealed", "pseudonymous"] as const;
/** The order a reader is owed it in: what hurts, what we built, why, where it goes. */
const IDENTITY = ["problem", "solution", "mission", "vision"] as const;
const EXAMPLE_STEPS = ["s1", "s2", "s3", "s4"] as const;

/**
 * The front door. A visitor should leave knowing three things: Causius does
 * legal work rather than chatting about it, it cannot read what it handles,
 * and they decide what leaves. Then what is real today, and the way in.
 *
 * Nothing here is claimed unless it is true today: no helper count, no
 * testimonial, no "trusted by". The example matter is labelled as one.
 */
export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  setRequestLocale(toLocale((await params).locale));
  const t = await getTranslations("Home");
  const locale = await getLocale();
  const [{ identity }, session] = await Promise.all([loadFleetPresence(), auth()]);
  // Rendered from the Loki project profile, never authored here (fleet
  // AGENTS.md, "The identity contract"). Written once, in English, so marked so.
  const stated = IDENTITY.filter((key) => identity[key]);

  return (
    <main>
      <section className="public-backdrop border-b border-border-subtle">
        <div className="section-shell grid gap-14 py-section lg:grid-cols-[1.25fr_1fr] lg:items-center">
          <div className="rise">
            <div className="kicker">{t("hero.kicker")}</div>
            <h1 className="headline-caps mt-5 text-4xl sm:text-6xl lg:text-7xl">
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
          <figure lang={locale} className="rise border border-border bg-surface-base/80 p-6" aria-label={t("example.label")}>
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
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="border border-border-subtle p-3">
                <div className="kicker">{t("example.dueLabel")}</div>
                <div className="tabular mt-1 font-semibold text-accent">{t("example.due")}</div>
              </div>
              <div className="border border-border-subtle p-3">
                <div className="kicker">{t("example.waitLabel")}</div>
                <div className="mt-1 font-semibold text-fg-primary">{t("example.wait")}</div>
              </div>
            </div>
          </figure>
        </div>
      </section>

      <section className="section-shell py-section">
        <div className="kicker">{t("how.kicker")}</div>
        <h2 className="headline-caps mt-5 max-w-3xl text-4xl sm:text-5xl">{t("how.title")}</h2>
        <ol className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
          {STEPS.map((step, i) => (
            <li key={step} className="border-t border-border-strong pt-6">
              <div className="font-mono text-sm text-fg-tertiary">0{i + 1}</div>
              <h3 className="mt-4 text-2xl font-bold tracking-tight text-fg-primary">{t(`how.${step}.title`)}</h3>
              <p className="mt-4 text-base leading-relaxed text-fg-secondary">{t(`how.${step}.body`)}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="border-y border-border-subtle bg-surface-public py-section">
        <div className="section-shell grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <div>
            <div className="kicker">{t("privacy.kicker")}</div>
            <h2 className="headline-caps mt-5 text-4xl sm:text-5xl">{t("privacy.title")}</h2>
            <div className="mt-9">
              <Link href={ROUTES.security} className="btn-frame">
                {t("privacy.cta")}
              </Link>
            </div>
          </div>
          <div className="grid gap-10 sm:grid-cols-3">
            {PRIVACY.map((p) => (
              <div key={p}>
                <span className="block h-1 w-6 bg-accent" aria-hidden="true" />
                <h3 className="mt-5 text-lg font-semibold text-fg-primary">{t(`privacy.${p}.title`)}</h3>
                <p className="mt-3 text-sm leading-relaxed text-fg-secondary">{t(`privacy.${p}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-shell py-section">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <div>
            <div className="kicker">{t("capabilities.kicker")}</div>
            <h2 className="headline-caps mt-5 text-4xl sm:text-5xl">{t("capabilities.title")}</h2>
            <p className="mt-6 text-fg-secondary">{t("capabilities.lede")}</p>
            <div className="mt-8 flex flex-wrap gap-x-6 text-sm">
              <Link href={ROUTES.roadmap} className="text-link inline-flex min-h-11 items-center">
                {t("capabilities.roadmap")}
              </Link>
              <Link href={ROUTES.changelog} className="text-link inline-flex min-h-11 items-center">
                {t("capabilities.changelog")}
              </Link>
            </div>
          </div>
          <CapabilityList items={CAPABILITY_KEYS} />
        </div>
      </section>

      <section className="border-t border-border-subtle py-section">
        <div className="section-shell">
          <div className="kicker">{t("tiers.kicker")}</div>
          <h2 className="headline-caps mt-5 max-w-4xl text-4xl sm:text-5xl">{t("tiersTitle")}</h2>
          <p className="mt-6 max-w-2xl text-lg text-fg-secondary">{t("tiersLead")}</p>
          <div className="mt-14 grid gap-4 md:grid-cols-3">
            {TIERS.map((tier) => (
              <article key={tier} className="flex flex-col justify-between border border-border p-8">
                <div>
                  <h3 className="text-2xl font-bold tracking-tight text-fg-primary">{t(`tiers.${tier}.name`)}</h3>
                  <p className="mt-4 text-fg-secondary">{t(`tiers.${tier}.can`)}</p>
                </div>
                <p className="mt-8 border-t border-border-subtle pt-4 text-sm text-fg-tertiary">{t(`tiers.${tier}.limit`)}</p>
              </article>
            ))}
          </div>
          <p className="mt-8">
            <Link href={ROUTES.helpers} className="text-link inline-flex min-h-11 items-center text-sm">
              {t("marketplaceLink")}
            </Link>
          </p>
        </div>
      </section>

      {stated.length > 0 && (
        <section className="border-t border-border-subtle py-section-tight">
          <dl className="section-shell grid gap-x-16 gap-y-12 sm:grid-cols-2">
            {stated.map((key) => (
              <div key={key}>
                <dt className="kicker">{t(`identity.${key}`)}</dt>
                <dd lang="en" className="mt-4 max-w-copy text-lg leading-relaxed text-fg-primary">
                  {identity[key]}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <section className="public-backdrop border-t border-border-subtle py-section">
        <div className="section-shell grid gap-12 lg:grid-cols-2 lg:items-end lg:gap-20">
          <div>
            <div className="kicker">{t("fleet.kicker")}</div>
            <h2 className="headline-caps mt-5 text-4xl sm:text-5xl">{t("fleet.title")}</h2>
            <p className="mt-6 max-w-xl text-lg text-fg-secondary">{t("fleet.lede")}</p>
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
