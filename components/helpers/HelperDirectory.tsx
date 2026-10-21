"use client";

import { applyQuery, emptyQuery, isNarrowed, parseQuery, writeQuery } from "listkit";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { chip, field, link } from "@/components/ui";
import { usePathname, useRouter } from "@/i18n/navigation";
import { DIRECTORY, countriesOf, searchHelpers } from "@/lib/helpers/directory";
import type { PublicHelper } from "@/lib/helpers/store";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { HELPER_AREAS, HELPER_KINDS } from "@/lib/professions";
import { HelperCard } from "./HelperCard";
import { languageName } from "./labels";

/**
 * The directory: a search box, the filters, the people. The query lives in the
 * URL (listkit), so a filtered list can be bookmarked or sent; the order is
 * searchkit's when something was typed, and the list's own otherwise.
 */
export function HelperDirectory({ helpers }: { helpers: PublicHelper[] }) {
  const t = useTranslations("Helpers");
  const p = useTranslations("Professions");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const query = parseQuery(params, DIRECTORY);
  // Arrived from a matter's "Find a helper": each profile opens with that matter chosen.
  const from = params.get("from") ?? undefined;

  const result = useMemo(() => {
    const found = searchHelpers(helpers, query.q);
    const listed = applyQuery(found, { ...DIRECTORY, search: undefined }, { ...query, q: "" });
    if (!query.q) return listed;
    // Keep searchkit's ranking: listkit filtered, it does not re-sort a search.
    const rank = new Map(found.map((h, i) => [h.id, i]));
    return { ...listed, rows: [...listed.rows].sort((a, b) => rank.get(a.id)! - rank.get(b.id)!) };
  }, [helpers, query]);

  // What the place and language filters can offer: only what someone listed.
  const places = useMemo(() => [...new Set(helpers.flatMap(countriesOf))].sort(), [helpers]);
  const languages = useMemo(() => [...new Set(helpers.flatMap((h) => h.languages))].sort(), [helpers]);

  function go(next: typeof query) {
    const qs = writeQuery(params, next, DIRECTORY, query).toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }
  const setOne = (key: string, value: string) =>
    go({ ...query, facets: { ...query.facets, [key]: value ? [value] : [] } });
  const kindsOn = query.facets.kind ?? [];

  const select = (key: "place" | "lang" | "area", options: readonly string[], label: (v: string) => string) => (
    <label className="grid gap-1 text-sm">
      <span className="text-fg-secondary">{t(`filters.${key}`)}</span>
      <select value={query.facets[key]?.[0] ?? ""} onChange={(e) => setOne(key, e.target.value)} className={field}>
        <option value="">—</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {label(o)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="grid gap-5">
      <input
        type="search"
        aria-label={t("search")}
        placeholder={t("search")}
        defaultValue={query.q}
        onChange={(e) => go({ ...query, q: e.target.value })}
        className={field}
      />
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t("filters.kind")}>
        {HELPER_KINDS.map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kindsOn.includes(k)}
            onClick={() =>
              go({
                ...query,
                facets: { ...query.facets, kind: kindsOn.includes(k) ? kindsOn.filter((x) => x !== k) : [...kindsOn, k] },
              })
            }
            className={chip}
          >
            {p(`kinds.${k}.name`)}
            <span className="ml-1.5 font-mono text-xs text-fg-tertiary">{result.counts.kind?.[k] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {select("place", places, (c) => jurisdictionLabel(c, locale))}
        {select("lang", languages, (c) => languageName(c, locale))}
        {select("area", HELPER_AREAS, (a) => p(`areas.${a}`))}
      </div>

      <p className="flex flex-wrap items-center gap-x-4 text-sm text-fg-secondary" aria-live="polite">
        {helpers.length === 0 ? t("noneYet") : t("count", { count: result.matched })}
        {isNarrowed(query) && (
          <button type="button" onClick={() => go(emptyQuery(DIRECTORY))} className={`${link} min-h-11`}>
            {t("clear")}
          </button>
        )}
      </p>
      <ul className="grid gap-3 md:grid-cols-2">
        {result.rows.map((h) => (
          <li key={h.id} className="grid">
            <HelperCard helper={h} matter={from} />
          </li>
        ))}
      </ul>
    </div>
  );
}
