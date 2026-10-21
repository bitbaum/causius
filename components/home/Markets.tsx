import { getLocale, getTranslations } from "next-intl/server";
import { localeNames } from "@/i18n/routing";
import { CANTONS, jurisdictionLabel, US_STATES } from "@/lib/jurisdictions";
import { TRANSLATION_LANGUAGES } from "@/lib/languages";

/**
 * Where Causius works first. Every number is counted from the lists the
 * product runs on, never typed: add a state and the page says so.
 */
export async function Markets() {
  const t = await getTranslations("Home.where");
  const locale = await getLocale();
  const markets = [
    { code: "CH", law: t("ch"), regions: t("cantons", { count: Object.keys(CANTONS).length }), languages: ["de", "fr", "it"] },
    { code: "LI", law: t("li"), regions: "", languages: ["de"] },
    {
      code: "US",
      law: t("us"),
      regions: t("states", { count: Object.keys(US_STATES).filter((c) => c !== "US-DC").length }),
      languages: ["en", "es"],
    },
  ] as const;
  return (
    <div className="grid gap-6">
      <ul className="grid gap-3 sm:grid-cols-3">
        {markets.map((m) => (
          <li key={m.code} className="rounded-surface border border-border-subtle p-5">
            <p className="headline text-2xl">{jurisdictionLabel(m.code, locale)}</p>
            <p className="mt-2 text-sm text-fg-secondary">
              {m.law}
              {m.regions && ` · ${m.regions}`}
            </p>
            <p className="mt-3 flex gap-1.5">
              {m.languages.map((l) => (
                <span key={l} title={localeNames[l]} className="rounded-control border border-border px-1.5 py-0.5 font-mono text-xs uppercase text-fg-secondary">
                  {l}
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>
      <p className="text-sm text-fg-secondary">
        {t("languages", { count: TRANSLATION_LANGUAGES.length })}
      </p>
    </div>
  );
}
