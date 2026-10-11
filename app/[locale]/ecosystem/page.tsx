import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { EntryLinks } from "@/components/site/EntryLinks";
import { PageLayout } from "@/components/site/PageLayout";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { auth } from "@/lib/auth";
import { FLEET_SLUG, loadFleetPresence } from "@/lib/fleet";
import { ROUTES } from "@/lib/routes";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const t = await getTranslations({ locale: toLocale((await params).locale), namespace: "Ecosystem" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

const SEAMS = ["account", "pay", "build", "law"] as const;

/**
 * Where Causius sits in the fleet, and the way into the rest of it.
 *
 * The products are NOT typed here: they are read from the fleet map's pillars
 * (fleet AGENTS.md: "A page that types the portfolio is a copy"). The map's
 * role lines are written once, in English, and are marked so. What is Causius's
 * own to say — how it connects to each — is in the messages.
 */
export default async function EcosystemPage({ params }: Params) {
  setRequestLocale(toLocale((await params).locale));
  const t = await getTranslations("Ecosystem");
  const [{ pillars }, session] = await Promise.all([loadFleetPresence(), auth()]);
  const others = pillars.filter((p) => p.slug !== FLEET_SLUG);

  return (
    <PageLayout kicker={t("kicker")} title={t("title")} lede={t("lede")}>
      {others.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-3">
          {others.map((p) => (
            <article key={p.slug} className="flex min-h-72 flex-col justify-between border border-border p-8">
              <div>
                <div className="kicker">{t("layer", { layer: p.layer })}</div>
                <h2 className="headline-caps mt-4 text-4xl">{p.name}</h2>
                <p lang="en" className="mt-6 text-fg-secondary">
                  {p.role}
                </p>
              </div>
              {p.url && (
                <a href={p.url} className="text-link mt-8 inline-flex min-h-11 items-center text-sm font-semibold">
                  {t("open", { name: p.name })}
                </a>
              )}
            </article>
          ))}
        </div>
      ) : (
        <p className="max-w-xl text-fg-secondary">{t("unavailable")}</p>
      )}

      <section className="mt-24 grid gap-12 border-t border-border-subtle pt-16 lg:grid-cols-[1fr_2fr] lg:gap-20">
        <div>
          <h2 className="headline-caps text-3xl sm:text-4xl">{t("layerTitle")}</h2>
          <p className="mt-5 text-lg text-fg-secondary">{t("layerBody")}</p>
        </div>
        <dl className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
          {SEAMS.map((s) => (
            <div key={s} className="border-t border-border-strong pt-5">
              <dt className="text-lg font-semibold text-fg-primary">{t(`seams.${s}.title`)}</dt>
              <dd className="mt-2 text-fg-secondary">{t(`seams.${s}.body`)}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="mt-24 border border-border p-8 sm:p-12">
        <div className="kicker">{t("account.kicker")}</div>
        <h2 className="headline-caps mt-4 text-3xl sm:text-4xl">{t("account.title")}</h2>
        <p className="mt-5 max-w-2xl text-fg-secondary">{t("account.body")}</p>
        <div className="mt-8">
          {session?.actorId ? (
            <Link href={ROUTES.matters} className="btn-primary">
              {t("account.signedIn")}
            </Link>
          ) : (
            <EntryLinks from={ROUTES.ecosystem} />
          )}
        </div>
      </section>
    </PageLayout>
  );
}
