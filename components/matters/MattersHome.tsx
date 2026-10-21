"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { card, field, link } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDate } from "@/lib/case";
import { CANTONS, COUNTRIES, jurisdictionLabel } from "@/lib/jurisdictions";
import type { MatterSummary } from "@/lib/matters/store";
import { API, ROUTES } from "@/lib/routes";
import { useOwnWords } from "@/lib/store";
import { IntakeComposer, uploadErrorKey } from "./IntakeComposer";
import { useModelChoice } from "./ModelPicker";
import { uploadStaged, type Staged } from "./staging";

/** A first message carried from this page to the new matter's page. */
export const FIRST_MESSAGE_KEY = (id: string) => `causius.first.${id}`;

export function MattersHome() {
  const t = useTranslations("Matters");
  const locale = useLocale();
  const router = useRouter();
  const ownWords = useOwnWords();
  const [list, setList] = useState<MatterSummary[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const chat = useTranslations("Chat");
  const choice = useModelChoice();
  const [jurisdiction, setJurisdiction] = useState("");

  useEffect(() => {
    let stale = false;
    fetch(API.matters)
      .then(async (r) => {
        const body = (await r.json().catch(() => ({}))) as { matters?: MatterSummary[]; error?: string };
        if (stale) return;
        if (r.ok && body.matters) setList(body.matters);
        else setFailed(body.error ?? "unknown");
      })
      .catch(() => !stale && setFailed("offline"));
    return () => {
      stale = true;
    };
  }, []);

  const [startError, setStartError] = useState<string | null>(null);
  // A matter is created once; if attaching fails the person retries into the same one.
  const created = useRef<string | null>(null);

  async function start(text: string, staged: Staged[]): Promise<boolean> {
    setFailed(null);
    setStartError(null);
    try {
      if (!created.current) {
        const r = await fetch(API.matters, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ jurisdiction: jurisdiction || undefined, hide: ownWords }),
        });
        const body = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
        if (!r.ok || !body.id) {
          setFailed(body.error ?? "unknown");
          return false;
        }
        created.current = body.id;
      }
      const id = created.current;
      if (staged.length) {
        const failure = await uploadStaged(id, staged, choice);
        if (failure) {
          setStartError(failure);
          return false;
        }
      }
      try {
        sessionStorage.setItem(FIRST_MESSAGE_KEY(id), text.trim() || chat("attachedOnly"));
      } catch {
        // Without session storage the person types it again; nothing is lost.
      }
      router.push(ROUTES.matterById(id));
      return true;
    } catch {
      setFailed("offline");
      return false;
    }
  }

  return (
    <div className="grid gap-12">
      <section aria-labelledby="start" className={`${card} grid gap-5 sm:p-8`}>
        <div>
          <h2 id="start" className="text-2xl font-semibold tracking-tight">
            {t("newTitle")}
          </h2>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-fg-secondary">{t("newLead")}</p>
        </div>
        <IntakeComposer
          onSend={start}
          sending={false}
          placeholder={t("situationPlaceholder")}
          above={
            <label className="mb-3 grid max-w-md gap-2">
              <span className="text-sm font-medium">{t("where")}</span>
              <select value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)} className={field}>
                <option value="">{t("whereUnknown")}</option>
                <optgroup label={jurisdictionLabel("CH", locale)}>
                  <option value="CH">{t("federal")}</option>
                  {Object.keys(CANTONS).map((code) => (
                    <option key={code} value={code}>
                      {jurisdictionLabel(code, locale)}
                    </option>
                  ))}
                </optgroup>
                <optgroup label={t("elsewhere")}>
                  {COUNTRIES.filter((c) => c !== "CH").map((c) => (
                    <option key={c} value={c}>
                      {jurisdictionLabel(c, locale)}
                    </option>
                  ))}
                </optgroup>
              </select>
            </label>
          }
        />
        {(failed || startError) && (
          <p role="alert" className="text-sm text-accent">
            {startError ? chat(uploadErrorKey(startError)) : t(`errors.${failed! in ERRORS ? failed : "unknown"}`)}
          </p>
        )}
        <Link href={ROUTES.newCase} className={`${link} inline-flex min-h-11 items-center text-sm`}>
          {t("quickCheck")}
        </Link>
      </section>

      <section aria-labelledby="mine">
        <h2 id="mine" className="text-2xl font-semibold tracking-tight">
          {t("mine")}
        </h2>
        {list === null && !failed && <p className="mt-4 text-sm text-fg-secondary">{t("loading")}</p>}
        {list?.length === 0 && <p className="mt-4 text-sm text-fg-secondary">{t("none")}</p>}
        <ul className="mt-5 grid gap-3">
          {list?.map((m) => (
            <li key={m.id}>
              <Link
                href={ROUTES.matterById(m.id)}
                className={`${card} grid gap-2 transition-colors hover:border-fg-muted sm:grid-cols-[1fr_auto] sm:items-center`}
              >
                <span>
                  <span className="block text-xl font-semibold tracking-tight">{m.title}</span>
                  <span className="mt-1 block text-sm text-fg-secondary">
                    {[m.role === "helper" ? t("helping") : "", m.area, jurisdictionLabel(m.jurisdiction, locale)].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="grid gap-0.5 text-sm sm:text-right">
                  {m.nextDue && (
                    <span className="text-accent">
                      {t("nextDue", { date: formatDate(m.nextDue.date, locale), label: m.nextDue.label })}
                    </span>
                  )}
                  {m.pendingApprovals > 0 && (
                    <span className="font-medium">{t("waiting", { count: m.pendingApprovals })}</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

const ERRORS = { not_configured: 1, sign_in: 1, rate_limited: 1, offline: 1, unknown: 1 };
