"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { btnPrimary, card, field, link } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { formatDate } from "@/lib/case";
import { CANTONS, COUNTRIES, jurisdictionLabel } from "@/lib/jurisdictions";
import type { MatterSummary } from "@/lib/matters/store";
import { API, ROUTES } from "@/lib/routes";
import { useOwnWords } from "@/lib/store";

/** A first message carried from this page to the new matter's page. */
export const FIRST_MESSAGE_KEY = (id: string) => `causius.first.${id}`;

export function MattersHome() {
  const t = useTranslations("Matters");
  const locale = useLocale();
  const router = useRouter();
  const ownWords = useOwnWords();
  const [list, setList] = useState<MatterSummary[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [jurisdiction, setJurisdiction] = useState("");
  const [busy, setBusy] = useState(false);

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

  async function start(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true);
    setFailed(null);
    try {
      const r = await fetch(API.matters, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jurisdiction: jurisdiction || undefined, hide: ownWords }),
      });
      const body = (await r.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!r.ok || !body.id) {
        setFailed(body.error ?? "unknown");
        return;
      }
      try {
        sessionStorage.setItem(FIRST_MESSAGE_KEY(body.id), text.trim());
      } catch {
        // Without session storage the person types it again; nothing is lost.
      }
      router.push(ROUTES.matterById(body.id));
    } catch {
      setFailed("offline");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-12">
      <form onSubmit={start} className={`${card} grid gap-5 sm:p-8`}>
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">{t("newTitle")}</h2>
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-fg-secondary">{t("newLead")}</p>
        </div>
        <label className="grid gap-2">
          <span className="text-sm font-medium">{t("situation")}</span>
          <textarea
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("situationPlaceholder")}
            className={field}
            required
          />
        </label>
        <label className="grid max-w-md gap-2">
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
        {failed && (
          <p role="alert" className="text-sm text-accent">
            {t(`errors.${failed in ERRORS ? failed : "unknown"}`)}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-5">
          <button type="submit" disabled={busy || !text.trim()} className={btnPrimary}>
            {busy ? t("opening") : t("open")}
          </button>
          <Link href={ROUTES.newCase} className={`${link} inline-flex min-h-11 items-center text-sm`}>
            {t("quickCheck")}
          </Link>
        </div>
      </form>

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
                    {[m.area, jurisdictionLabel(m.jurisdiction, locale)].filter(Boolean).join(" · ")}
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
