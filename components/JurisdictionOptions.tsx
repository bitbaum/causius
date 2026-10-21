"use client";

import { useLocale, useTranslations } from "next-intl";
import { JURISDICTION_GROUPS, jurisdictionLabel } from "@/lib/jurisdictions";

/**
 * The options of every place picker, in one order: Switzerland, Liechtenstein
 * and the United States with their cantons and states, then elsewhere. Render
 * inside a <select>; the select itself (and an "I don't know" option) stays
 * with the form that owns it.
 */
export function JurisdictionOptions() {
  const t = useTranslations("Places");
  const locale = useLocale();
  return JURISDICTION_GROUPS.map((g) =>
    g.key === "elsewhere" ? (
      <optgroup key={g.key} label={t("elsewhere")}>
        {g.codes.map((c) => (
          <option key={c} value={c}>
            {jurisdictionLabel(c, locale)}
          </option>
        ))}
      </optgroup>
    ) : (
      <optgroup key={g.key} label={jurisdictionLabel(g.key, locale)}>
        {g.codes.map((c) => (
          <option key={c} value={c}>
            {c === g.key ? t("whole", { country: jurisdictionLabel(c, locale) }) : jurisdictionLabel(c, locale)}
          </option>
        ))}
      </optgroup>
    ),
  );
}
