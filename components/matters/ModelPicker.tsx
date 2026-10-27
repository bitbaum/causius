"use client";

import { byokLabel } from "@bitbaum/ai-kit/byok";
import { useTranslations } from "next-intl";
import { useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { API, ROUTES } from "@/lib/routes";
import { saveModelPick, useModelPick, useOwnModel } from "@/lib/store";
import type { ModelChoice } from "./staging";

interface Row {
  id: string;
  provider: string;
  sees: "yes" | "no" | "unknown";
}

/**
 * Which model answers: Automatic (the default), a free model by name, or the
 * reader's own. A choice is where the chain STARTS; if that model is busy the
 * answer still comes from the next one. Models are fetched when the list is
 * first opened, not on every page.
 */
export function useModelChoice(): ModelChoice {
  const own = useOwnModel();
  const pick = useModelPick();
  // With no explicit pick, an own key keeps being used: that is what it was saved for.
  return useMemo(() => {
    if ((pick === "" || pick === "own") && own) return { byok: own };
    return pick && pick !== "own" ? { model: pick } : {};
  }, [own, pick]);
}

export function ModelPicker() {
  const t = useTranslations("Chat");
  const own = useOwnModel();
  const pick = useModelPick();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);
  const value = pick || (own ? "own" : "");

  async function load() {
    if (rows || failed) return;
    try {
      const r = await fetch(API.models);
      const body = (await r.json().catch(() => ({}))) as { models?: Row[] };
      if (r.ok && body.models) setRows(body.models);
      else setFailed(true);
    } catch {
      setFailed(true);
    }
  }

  return (
    <span className="flex min-w-0 flex-col gap-1">
      <label className="sr-only" htmlFor="model-pick">
        {t("modelPicker")}
      </label>
      <select
        id="model-pick"
        value={value}
        onFocus={load}
        onMouseDown={load}
        onChange={(e) => saveModelPick(e.target.value)}
        className="field min-h-11 w-full max-w-xs truncate py-1 text-sm"
      >
        <option value="">{t("modelAuto")}</option>
        {own && <option value="own">{`${t("modelYours")} · ${byokLabel(own)}`}</option>}
        {value && value !== "own" && !rows?.some((r) => r.id === value) && <option value={value}>{value}</option>}
        {rows?.map((r) => (
          <option key={r.id} value={r.id}>
            {`${r.id} · ${r.sees === "no" ? t("modelCannotSee") : t("modelCanSee")}`}
          </option>
        ))}
      </select>
      <span className="sr-only">{failed ? t("modelLoadFailed") : t("modelNote")}</span>
      {!own && (
        <Link href={ROUTES.ownModel} className="text-link text-xs">
          {t("modelUseOwn")}
        </Link>
      )}
    </span>
  );
}
