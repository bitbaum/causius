import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CapabilityList } from "@/components/site/CapabilityList";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { CAPABILITY_KEYS } from "@/lib/capabilities";
import { loadFleetPresence } from "@/lib/fleet";
import { EXTERNAL, ROUTES } from "@/lib/routes";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const t = await getTranslations({ locale: toLocale((await params).locale), namespace: "Platform" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const LAYERS = ["intake", "matter", "agent", "models", "identity"] as const;
/** The order a reader is owed it in: what hurts, what we built, why, where it goes. */
const IDENTITY = ["problem", "solution", "mission", "vision"] as const;
const PRINCIPLES = ["human", "honest", "open", "shared"] as const;
const STACK = ["framework", "data", "models", "signin", "chat", "design", "record", "limits", "languages", "tests"] as const;

/**
 * The technical narrative: what Causius is, how it is built and why it is
 * built that way. Every sentence describes code in this repository as it is
 * today; where it is going is labelled as such and points at the roadmap.
 */
export default async function PlatformPage({ params }: Params) {
  setRequestLocale(toLocale((await params).locale));
  const t = await getTranslations("Platform");
  const { identity } = await loadFleetPresence();
  // Rendered from the Loki project profile, never authored here (fleet
  // AGENTS.md, "The identity contract"). Written once, in English, so marked so.
  const stated = IDENTITY.filter((key) => identity[key]);

  return (
    <main>
      <section className="section-shell pb-16 pt-section-tight">
        <div className="kicker">{t("kicker")}</div>
        <h1 className="headline-caps mt-5 max-w-4xl text-4xl sm:text-6xl lg:text-7xl">{t("title")}</h1>
        <p className="mt-6 max-w-2xl text-lg text-fg-secondary">{t("lede")}</p>
      </section>

      <section className="section-shell grid gap-12 border-t border-border-subtle py-section-tight lg:grid-cols-[1fr_2fr] lg:gap-20">
        <h2 className="headline-caps text-3xl sm:text-4xl">{t("why.title")}</h2>
        <div className="grid max-w-copy gap-5 text-lg leading-relaxed text-fg-secondary">
          <p>{t("why.p1")}</p>
          <p className="text-fg-primary">{t("why.p3")}</p>
        </div>
      </section>

      <section className="border-y border-border-subtle bg-surface-public py-section">
        <div className="section-shell">
          <div className="kicker">{t("architecture.kicker")}</div>
          <h2 className="headline-caps mt-5 max-w-3xl text-4xl sm:text-5xl">{t("architecture.title")}</h2>
          <ol className="mt-16 divide-y divide-border-subtle border-y border-border-subtle">
            {LAYERS.map((layer, i) => (
              <li key={layer} className="grid gap-3 py-8 md:grid-cols-[4rem_16rem_1fr] md:gap-8">
                <span className="font-mono text-sm text-fg-tertiary">0{i + 1}</span>
                <h3 className="text-xl font-bold tracking-tight text-fg-primary">{t(`architecture.${layer}.title`)}</h3>
                <p className="max-w-copy text-fg-secondary">{t(`architecture.${layer}.body`)}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section-shell py-section">
        <div className="grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <div>
            <h2 className="headline-caps text-3xl sm:text-4xl">{t("capabilities.title")}</h2>
            <p className="mt-5 text-fg-secondary">{t("capabilities.lede")}</p>
            <div className="mt-6 flex flex-wrap gap-x-6 text-sm">
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
          <h2 className="headline-caps text-3xl sm:text-4xl">{t("principles.title")}</h2>
          <div className="mt-12 grid gap-x-10 gap-y-12 md:grid-cols-2">
            {PRINCIPLES.map((p) => (
              <div key={p} className="border-t border-border-strong pt-6">
                <h3 className="text-xl font-semibold text-fg-primary">{t(`principles.${p}.title`)}</h3>
                <p className="mt-3 max-w-xl text-fg-secondary">{t(`principles.${p}.body`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border-subtle py-section">
        <div className="section-shell grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-20">
          <div>
            <h2 className="headline-caps text-3xl sm:text-4xl">{t("stack.title")}</h2>
            <p className="mt-5 text-fg-secondary">{t("stack.lede")}</p>
          </div>
          <dl className="divide-y divide-border-subtle border-y border-border-subtle">
            {STACK.map((row) => (
              <div key={row} className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-6">
                <dt className="text-sm font-semibold text-fg-primary">{t(`stack.${row}.label`)}</dt>
                <dd className="font-mono text-sm text-fg-secondary">{t(`stack.${row}.value`)}</dd>
              </div>
            ))}
          </dl>
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
        <div className="section-shell max-w-4xl">
          <div className="kicker">{t("next.kicker")}</div>
          <h2 className="headline-caps mt-5 text-4xl sm:text-5xl">{t("next.title")}</h2>
          <p className="mt-6 max-w-2xl text-lg text-fg-secondary">{t("next.lede")}</p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href={ROUTES.roadmap} className="btn-frame-accent">
              {t("next.roadmap")}
            </Link>
            <Link href={ROUTES.ecosystem} className="btn-frame">
              {t("next.ecosystem")}
            </Link>
            <a href={EXTERNAL.repo} className="btn-frame">
              {t("next.source")}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
