"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { btnPrimary, btnQuiet, card, field, link } from "@/components/ui";
import { formatDate } from "@/lib/case";
import type { ReviewItem } from "@/lib/helpers/store";
import { jurisdictionLabel } from "@/lib/jurisdictions";
import { API } from "@/lib/routes";
import { call } from "./desk/api";

const KNOWN = ["own_credential", "already_decided"];

/** Admissions waiting for a person to compare them with the public register. */
export function ReviewQueue() {
  const t = useTranslations("Review");
  const p = useTranslations("Professions");
  const locale = useLocale();
  const [queue, setQueue] = useState<ReviewItem[] | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    let stale = false;
    call<{ queue: ReviewItem[] }>(API.review).then((r) => !stale && setQueue(r.ok ? r.data.queue : []));
    return () => {
      stale = true;
    };
  }, []);

  async function decide(id: string, action: "verify" | "reject") {
    const r = await call(API.reviewDecision(id), { method: "POST", body: { action, note: notes[id] } });
    if (r.ok) setQueue((q) => q?.filter((i) => i.id !== id) ?? q);
    else setErrors((e) => ({ ...e, [id]: KNOWN.includes(r.error) ? r.error : "unknown" }));
  }

  if (queue === null) return null;
  if (queue.length === 0) return <p className="text-fg-secondary">{t("none")}</p>;
  return (
    <ul className="grid gap-4">
      {queue.map((i) => (
        <li key={i.id} className={`${card} grid gap-3`}>
          <p className="kicker">
            {p(`kinds.${i.helper.kind}.name`)} · {t("submitted", { date: formatDate(i.submittedAt.slice(0, 10), locale) })}
          </p>
          <h2 className="text-xl font-semibold tracking-tight">
            {i.helper.name} — {jurisdictionLabel(i.jurisdiction, locale)}
          </h2>
          <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-6">
            <dt className="text-fg-secondary">{t("evidence.legalName")}</dt>
            <dd>{i.evidence.legalName}</dd>
            <dt className="text-fg-secondary">{t("evidence.registerNumber")}</dt>
            <dd className="font-mono">{i.evidence.registerNumber}</dd>
            <dt className="text-fg-secondary">{t("evidence.registerUrl")}</dt>
            <dd className="break-all">
              <a href={i.evidence.registerUrl} target="_blank" rel="noopener noreferrer" className={link}>
                {i.evidence.registerUrl}
              </a>
            </dd>
            {i.evidence.note && (
              <>
                <dt className="text-fg-secondary">{t("evidence.note")}</dt>
                <dd className="whitespace-pre-line">{i.evidence.note}</dd>
              </>
            )}
          </dl>
          <label className="grid gap-1 text-sm">
            <span>{t("noteLabel")}</span>
            <input value={notes[i.id] ?? ""} onChange={(e) => setNotes((n) => ({ ...n, [i.id]: e.target.value }))} className={field} maxLength={1000} />
          </label>
          {errors[i.id] && (
            <p role="alert" className="text-sm text-accent">
              {t(`errors.${errors[i.id]}`)}
            </p>
          )}
          <div className="flex flex-wrap gap-3">
            <button type="button" className={btnPrimary} onClick={() => decide(i.id, "verify")}>
              {t("verify")}
            </button>
            <button type="button" className={btnQuiet} disabled={!notes[i.id]?.trim()} onClick={() => decide(i.id, "reject")}>
              {t("reject")}
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
