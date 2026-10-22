"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { btnPrimary, card, chip, field } from "@/components/ui";
import type { MatterView } from "@/lib/matters/store";
import { MAX_QUESTIONS, type ReviewTable } from "@/lib/matters/review-shape";
import { API } from "@/lib/routes";
import { useModelChoice } from "./ModelPicker";

const SUGGESTIONS = ["asks", "deadline", "amount", "sender"] as const;
const ERRORS = new Set(["no_documents", "busy", "not_configured", "rate_limited"]);

/**
 * The same questions of every document in the matter, answered as a table in
 * which every cell shows the words it was read from (lib/matters/review.ts).
 * The table is also kept in the matter as a document, so the agent can cite it.
 */
export function DocumentReview({ matter, onDone }: { matter: MatterView; onDone: () => Promise<void> }) {
  const t = useTranslations("DocReview");
  const locale = useLocale();
  const choice = useModelChoice();
  const [questions, setQuestions] = useState<string[]>(["", "", ""].slice(0, MAX_QUESTIONS));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [table, setTable] = useState<ReviewTable | null>(null);
  const uploads = matter.documents.filter((d) => d.origin === "upload");
  if (uploads.length === 0 || matter.role === "observer") return null;

  const asked = questions.map((q) => q.trim()).filter((q) => q.length >= 3);
  const suggest = (text: string) => {
    if (questions.some((q) => q.trim() === text)) return;
    const i = questions.findIndex((q) => !q.trim());
    if (i >= 0) setQuestions((qs) => qs.map((q, j) => (j === i ? text : q)));
  };

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(API.matterReview(matter.id), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ questions: asked, byok: choice.byok, locale }),
      });
      const body = (await r.json().catch(() => ({}))) as { table?: ReviewTable; error?: string };
      if (r.ok && body.table) {
        setTable(body.table);
        await onDone();
      } else setError(body.error ?? "unknown");
    } catch {
      setError("unknown");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className={`${card} grid gap-5 lg:col-span-2`} aria-labelledby="doc-review">
      <div>
        <h2 id="doc-review" className="text-lg font-semibold tracking-tight">{t("title")}</h2>
        <p className="mt-1 max-w-prose text-sm text-fg-secondary">{t("lead")}</p>
      </div>
      <form onSubmit={ask} className="grid gap-3">
        <div className="flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className={chip} onClick={() => suggest(t(`suggestions.${s}`))}>
              {t(`suggestions.${s}`)}
            </button>
          ))}
        </div>
        <div className="grid gap-2 md:grid-cols-3">
          {questions.map((q, i) => (
            <input
              key={i}
              value={q}
              maxLength={300}
              aria-label={t("question", { n: i + 1 })}
              placeholder={t("question", { n: i + 1 })}
              onChange={(e) => setQuestions((qs) => qs.map((x, j) => (j === i ? e.target.value : x)))}
              className={field}
            />
          ))}
        </div>
        <p className="flex flex-wrap items-center gap-4">
          <button type="submit" className={btnPrimary} disabled={busy || asked.length === 0}>
            {busy ? t("asking", { count: uploads.length }) : t("ask")}
          </button>
          {error && (
            <span role="alert" className="text-sm text-accent">
              {t(`errors.${ERRORS.has(error) ? error : "unknown"}`)}
            </span>
          )}
        </p>
      </form>

      {table && (
        <div className="grid gap-3">
          {/* Phone: one card per document. Wider: a table. */}
          <ul className="grid gap-3 md:hidden">
            {table.rows.map((r) => (
              <li key={r.documentId} className="rounded-control border border-border-subtle p-3 text-sm">
                <p className="font-medium">{r.name}</p>
                <dl className="mt-2 grid gap-2">
                  {table.questions.map((q, i) => (
                    <div key={i}>
                      <dt className="text-xs text-fg-tertiary">{q}</dt>
                      <Cell cell={r.cells[i]} notFound={t("notFound")} />
                    </div>
                  ))}
                </dl>
              </li>
            ))}
          </ul>
          <table className="hidden w-full table-fixed border-collapse text-left text-sm md:table">
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="w-1/5 py-2 pr-3 font-semibold">{t("document")}</th>
                {table.questions.map((q, i) => (
                  <th key={i} scope="col" className="px-3 py-2 font-semibold">{q}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((r) => (
                <tr key={r.documentId} className="border-b border-border-subtle align-top">
                  <th scope="row" className="break-words py-3 pr-3 font-medium">{r.name}</th>
                  {r.cells.map((c, i) => (
                    <td key={i} className="px-3 py-3">
                      <Cell cell={c} notFound={t("notFound")} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-fg-tertiary">{t("saved")}</p>
        </div>
      )}
    </section>
  );
}

function Cell({ cell, notFound }: { cell?: { answer: string; quote?: string }; notFound: string }) {
  if (!cell?.answer) return <span className="text-fg-tertiary">{notFound}</span>;
  return (
    <span className="block">
      {cell.answer}
      <span className="mt-1 block text-xs italic text-fg-secondary">«{cell.quote}»</span>
    </span>
  );
}
