"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { btnQuiet, field } from "@/components/ui";
import { CANTONS, COUNTRIES, jurisdictionLabel } from "@/lib/jurisdictions";

/** Choose places, by canton or by country: the same codes a matter carries. */
export function PlacePicker({ value, onChange, single = false, label }: { value: string[]; onChange: (v: string[]) => void; single?: boolean; label: string }) {
  const t = useTranslations("HelperDesk");
  const locale = useLocale();
  const [pick, setPick] = useState("CH");
  const options = [...COUNTRIES, ...Object.keys(CANTONS)];

  return (
    <div className="grid gap-2 text-sm">
      <span className="font-medium">{label}</span>
      <div className="flex gap-2">
        <select value={single ? (value[0] ?? pick) : pick} onChange={(e) => (single ? onChange([e.target.value]) : setPick(e.target.value))} className={field} aria-label={label}>
          {options.map((c) => (
            <option key={c} value={c}>
              {jurisdictionLabel(c, locale)}
            </option>
          ))}
        </select>
        {!single && (
          <button type="button" className={btnQuiet} onClick={() => !value.includes(pick) && onChange([...value, pick])}>
            {t("addPlace")}
          </button>
        )}
      </div>
      {!single && value.length > 0 && (
        <ul className="flex flex-wrap gap-2">
          {value.map((c) => (
            <li key={c}>
              <button
                type="button"
                onClick={() => onChange(value.filter((x) => x !== c))}
                aria-label={t("remove", { item: jurisdictionLabel(c, locale) })}
                className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border px-3"
              >
                {jurisdictionLabel(c, locale)} <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
