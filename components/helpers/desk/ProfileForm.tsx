"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { btnPrimary, chip, field, label as labelClass, link } from "@/components/ui";
import { Link } from "@/i18n/navigation";
import type { HelperInput, OwnHelper } from "@/lib/helpers/store";
import { HELPER_AREAS, HELPER_KINDS, HELPER_LANGUAGES, type HelperKind } from "@/lib/professions";
import { API, ROUTES } from "@/lib/routes";
import { languageName } from "../labels";
import { call, errorKey } from "./api";
import { PlacePicker } from "./PlacePicker";

type Draft = Required<Omit<HelperInput, "serviceUrl">> & { serviceUrl: string };

const fromOwn = (h: OwnHelper | null): Draft => ({
  kind: h?.kind ?? "assistant",
  name: h?.name ?? "",
  headline: h?.headline ?? "",
  bio: h?.bio ?? "",
  jurisdictions: h?.declaredJurisdictions ?? [],
  areas: (h?.areas ?? []) as Draft["areas"],
  languages: (h?.languages ?? []) as Draft["languages"],
  serviceUrl: h?.serviceUrl ?? "",
  status: h?.status ?? "listed",
});

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** The public half of a helper: what they are and where they help. Everything here is shown to anyone. */
export function ProfileForm({ helper, onSaved }: { helper: OwnHelper | null; onSaved: (h: OwnHelper) => void }) {
  const t = useTranslations("HelperDesk");
  const p = useTranslations("Professions");
  const locale = useLocale();
  const [d, setD] = useState<Draft>(() => fromOwn(helper));
  const [state, setState] = useState<"idle" | "saving" | "saved" | { error: string }>("idle");
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => {
    setD((x) => ({ ...x, [k]: v }));
    setState("idle");
  };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setState("saving");
    const r = await call<{ helper: OwnHelper }>(API.helper, { method: "PUT", body: { ...d, serviceUrl: d.serviceUrl.trim() || null } });
    if (r.ok) {
      onSaved(r.data.helper);
      setState("saved");
    } else setState({ error: r.error });
  }

  return (
    <form onSubmit={save} className="grid gap-5">
      <p className="text-sm text-fg-secondary">{t("public")}</p>
      <fieldset className="grid gap-2">
        <legend className={`${labelClass} mb-1`}>{t("kind")}</legend>
        {HELPER_KINDS.map((k: HelperKind) => (
          <label key={k} className="flex min-h-11 items-start gap-3 py-1">
            <input type="radio" name="kind" className="mt-1.5" checked={d.kind === k} onChange={() => set("kind", k)} />
            <span>
              <span className="font-medium">{p(`kinds.${k}.name`)}</span>
              <span className="block text-sm text-fg-secondary">{p(`kinds.${k}.does`)}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <label className="grid gap-1">
        <span className={labelClass}>{t("name")}</span>
        <input value={d.name} onChange={(e) => set("name", e.target.value)} className={field} required minLength={2} maxLength={80} />
        <span className="text-xs text-fg-tertiary">{t("nameHint")}</span>
      </label>
      <label className="grid gap-1">
        <span className={labelClass}>{t("headline")}</span>
        <input value={d.headline} onChange={(e) => set("headline", e.target.value)} className={field} maxLength={160} />
      </label>
      <label className="grid gap-1">
        <span className={labelClass}>{t("bio")}</span>
        <textarea value={d.bio} onChange={(e) => set("bio", e.target.value)} className={field} rows={4} maxLength={2000} />
      </label>
      <div className="grid gap-1">
        <PlacePicker label={t("places")} value={d.jurisdictions} onChange={(v) => set("jurisdictions", v)} />
        {d.kind === "lawyer" && <span className="text-xs text-fg-tertiary">{t("placesHint")}</span>}
      </div>
      <fieldset>
        <legend className={`${labelClass} mb-2`}>{t("languages")}</legend>
        <div className="flex flex-wrap gap-2">
          {HELPER_LANGUAGES.map((l) => (
            <button key={l} type="button" aria-pressed={d.languages.includes(l)} onClick={() => set("languages", toggle(d.languages, l))} className={chip}>
              {languageName(l, locale)}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className={`${labelClass} mb-2`}>{t("areas")}</legend>
        <div className="flex flex-wrap gap-2">
          {HELPER_AREAS.map((a) => (
            <button key={a} type="button" aria-pressed={d.areas.includes(a)} onClick={() => set("areas", toggle(d.areas, a))} className={chip}>
              {p(`areas.${a}`)}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="grid gap-1">
        <span className={labelClass}>{t("serviceUrl")}</span>
        <input type="url" value={d.serviceUrl} onChange={(e) => set("serviceUrl", e.target.value)} className={field} placeholder="https://orangecat.ch/…" pattern="https://.*" />
        <span className="text-xs text-fg-tertiary">{t("serviceHint")}</span>
      </label>
      <fieldset className="flex flex-wrap gap-2">
        {(["listed", "paused", "draft"] as const).map((s) => (
          <button key={s} type="button" aria-pressed={d.status === s} onClick={() => set("status", s)} className={chip}>
            {t(`status.${s}`)}
          </button>
        ))}
      </fieldset>
      <div className="flex flex-wrap items-center gap-4">
        <button type="submit" className={btnPrimary} disabled={state === "saving"}>
          {state === "saving" ? t("saving") : t("save")}
        </button>
        {state === "saved" && <span role="status" className="text-sm">{t("saved")}</span>}
        {typeof state === "object" && (
          <span role="alert" className="text-sm text-accent">
            {t(errorKey(state.error))}
          </span>
        )}
      </div>
      {helper && (
        <p className="text-sm" role="status">
          {helper.visible ? (
            <>
              {t("visible")}{" "}
              <Link href={ROUTES.helperById(helper.id)} className={link}>
                {t("viewPublic")}
              </Link>
            </>
          ) : (
            helper.waitingFor && t(`waiting.${helper.waitingFor}`)
          )}
        </p>
      )}
    </form>
  );
}
