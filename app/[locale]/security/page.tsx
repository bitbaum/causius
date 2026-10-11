import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PageLayout } from "@/components/site/PageLayout";
import { Link } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { EXTERNAL, ROUTES } from "@/lib/routes";

type Params = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const t = await getTranslations({ locale: toLocale((await params).locale), namespace: "Security" });
  return { title: t("metaTitle"), description: t("metaDescription") };
}

/** Each guarantee and the detail lines it carries in the messages. */
const GUARANTEES = [
  { key: "anon", details: ["d1", "d2", "d3"] },
  { key: "sealed", details: ["d1", "d2", "d3"] },
  { key: "minimal", details: ["d1", "d2"] },
  { key: "browser", details: ["d1", "d2", "d3"] },
  { key: "access", details: ["d1", "d2", "d3"] },
] as const;

const BREACH = ["database", "provider", "operator"] as const;

/**
 * The trust page, for someone deciding whether to put a legal matter here.
 * Every claim maps to code in this repository (lib/redact.ts, lib/crypto.ts,
 * lib/security.ts, lib/matters/) — nothing aspirational is stated as fact.
 */
export default async function SecurityPage({ params }: Params) {
  setRequestLocale(toLocale((await params).locale));
  const t = await getTranslations("Security");

  return (
    <PageLayout kicker={t("kicker")} title={t("title")} lede={t("lede")}>
      <div className="grid gap-x-10 gap-y-14 md:grid-cols-2">
        {GUARANTEES.map((g) => (
          <section key={g.key} className="border-t border-border-strong pt-6">
            <h2 className="text-2xl font-semibold text-fg-primary">{t(`${g.key}.title`)}</h2>
            <p className="mt-3 max-w-xl text-fg-secondary">{t(`${g.key}.body`)}</p>
            <ul className="mt-5 space-y-2 text-sm text-fg-secondary">
              {g.details.map((d) => (
                <li key={d} className="flex gap-3">
                  <span className="mt-2 h-1 w-3 shrink-0 bg-accent" aria-hidden="true" />
                  <span>{t(`${g.key}.${d}`)}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <section className="mt-24 border-t border-border-subtle pt-16">
        <h2 className="headline-caps text-3xl sm:text-4xl">{t("breach.title")}</h2>
        <p className="mt-5 max-w-2xl text-fg-secondary">{t("breach.lede")}</p>
        <div className="mt-10 grid gap-10 md:grid-cols-3">
          {BREACH.map((b) => (
            <div key={b}>
              <h3 className="text-lg font-semibold text-fg-primary">{t(`breach.${b}.title`)}</h3>
              <p className="mt-2 text-fg-secondary">{t(`breach.${b}.body`)}</p>
            </div>
          ))}
        </div>
        <div className="mt-14 flex flex-col gap-3 sm:flex-row">
          <a href={EXTERNAL.repo} className="btn-frame">
            {t("links.source")}
          </a>
          <Link href={ROUTES.platform} className="btn-frame">
            {t("links.platform")}
          </Link>
        </div>
      </section>
    </PageLayout>
  );
}
