import { getLocale, getTranslations } from "next-intl/server";
import { localeNames } from "@/i18n/routing";
import { jurisdictionLabel, MARKETS } from "@/lib/jurisdictions";
import { TRANSLATION_LANGUAGES } from "@/lib/languages";

/**
 * Where Causius works, one tile per market in lib/jurisdictions.ts. Every
 * number is counted from the data, never typed, and a market's words live
 * under `Home.where.<code>`.
 */
export async function Markets() {
  const t = await getTranslations("Home.where");
  const locale = await getLocale();
  return (
    <div className="grid gap-6">
      <ul className="grid gap-3 sm:grid-cols-2">
        {MARKETS.map((m) => {
          const regions = Object.keys(m.regions).length;
          return (
            <li key={m.code} className="rounded-surface border border-border-subtle p-5">
              <p className="headline text-2xl">{jurisdictionLabel(m.code, locale)}</p>
              <p className="mt-2 text-sm text-fg-secondary">
                {t(`${m.code}.law`)}
                {regions > 0 && ` · ${t(`${m.code}.regions`, { count: regions })}`}
              </p>
              <p className="mt-3 flex gap-1.5">
                {m.languages.map((l) => (
                  <span key={l} title={localeNames[l]} className="rounded-control border border-border px-1.5 py-0.5 font-mono text-xs uppercase text-fg-secondary">
                    {l}
                  </span>
                ))}
              </p>
            </li>
          );
        })}
      </ul>
      <p className="text-sm text-fg-secondary">{t("languages", { count: TRANSLATION_LANGUAGES.length })}</p>
    </div>
  );
}
