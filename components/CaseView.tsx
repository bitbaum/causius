"use client";

import { useLocale, useTranslations } from "next-intl";
import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { daysUntil, formatDate, type CaseFile } from "@/lib/case";
import { anonymisedCase } from "@/lib/case-export";
import { ROUTES } from "@/lib/routes";
import { useToday } from "@/lib/store";
import { btnQuiet, card, eyebrow, link } from "./ui";

interface Props {
  data: CaseFile;
  /** Absent for the read-only sample. */
  onChange?: (next: CaseFile) => void;
  onDelete?: () => void;
  onSaveCopy?: () => void;
}

/**
 * The deadline is the most consequential thing on the page and the one a model
 * is most able to get wrong. So it is never shown bare: the sentence it was
 * read from sits under it, in the letter's own words, with a plain request to
 * compare the two.
 */
function Deadline({ deadline, quote }: { deadline: string; quote?: string }) {
  const t = useTranslations("Case");
  const locale = useLocale();
  const today = useToday();
  const days = today ? daysUntil(deadline, today) : null;
  let left = "";
  if (days !== null) {
    if (days > 1) left = t("daysLeft", { days });
    else if (days === 1) left = t("dueTomorrow");
    else if (days === 0) left = t("dueToday");
    else left = t("passed", { days: -days });
  }
  return (
    <div className="rounded-card border border-accent-fg px-5 py-4">
      <p className={eyebrow}>{t("replyBy")}</p>
      <p className="mt-1.5 font-heading text-2xl font-semibold">{formatDate(deadline, locale)}</p>
      {left && <p className="mt-1 text-sm text-fg-secondary">{left}</p>}
      {quote && (
        <figure className="mt-3 border-t border-border-subtle pt-3 text-sm">
          <figcaption className="text-fg-secondary">{t("deadlineSource")}</figcaption>
          <blockquote className="mt-1 italic">&laquo;{quote}&raquo;</blockquote>
        </figure>
      )}
      <p className="mt-3 text-xs leading-relaxed text-fg-secondary">{t("checkDeadline")}</p>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const t = useTranslations("Case");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={btnQuiet}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // Clipboard blocked: the text is on screen and can be selected.
        }
      }}
    >
      <span aria-live="polite">{copied ? t("copied") : t("copy")}</span>
    </button>
  );
}

function download(data: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}



export function CaseView({ data, onChange, onDelete, onSaveCopy }: Props) {
  const t = useTranslations("Case");
  const locale = useLocale();
  const [lang, setLang] = useState(0);
  const shown = data.texts[Math.min(lang, data.texts.length - 1)];
  const doneCount = data.asks.filter((a) => a.done).length;
  // A case with no analysis at all (filed by hand) has nothing an AI wrote.
  const analysed = Boolean(data.summary || data.asks.length || data.draftReply);

  const facts = (
    [
      ["from", data.authority],
      ["where", data.jurisdiction],
      ["area", data.area],
      ["reference", data.reference],
      ["dated", data.received && formatDate(data.received, locale)],
    ] as const
  ).filter((fact): fact is readonly [(typeof fact)[0], string] => Boolean(fact[1]));

  return (
    <article className="grid gap-10">
      <header className="grid gap-6 lg:grid-cols-[1fr_19rem] lg:items-start">
        <div>
          <h1 className="font-heading text-3xl font-semibold leading-tight tracking-display sm:text-4xl">
            {data.title}
          </h1>
          {data.summary && (
            <p className="mt-4 max-w-prose leading-relaxed text-fg-secondary">{data.summary}</p>
          )}
          {facts.length > 0 && (
            <dl className="mt-6 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_1fr]">
              {facts.map(([key, value]) => (
                <div key={key} className="contents">
                  <dt className="text-fg-secondary">{t(`facts.${key}`)}</dt>
                  <dd className="mb-2 sm:mb-0">{value}</dd>
                </div>
              ))}
            </dl>
          )}
          {analysed && (
            <p className="mt-6 max-w-prose rounded-card border border-border-subtle px-4 py-3 text-sm text-fg-secondary">
              {t("aiNotice")}
            </p>
          )}
        </div>
        <div className="grid gap-4">
          {data.deadline ? (
            <Deadline deadline={data.deadline} quote={data.deadlineQuote} />
          ) : (
            analysed && (
              <p className="rounded-card border border-accent-fg px-5 py-4 text-sm leading-relaxed">
                {t("noDeadline")}
              </p>
            )
          )}
          {data.consequence && (
            <p className="text-sm leading-relaxed text-fg-secondary">
              <strong className="font-medium text-fg-primary">{t("ifNothing")} </strong>
              {data.consequence}
            </p>
          )}
        </div>
      </header>

      {data.asks.length > 0 && (
        <section aria-labelledby="asks">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="asks" className="font-heading text-2xl font-semibold">
              {t("asksTitle")}
            </h2>
            {onChange && (
              <p className="font-mono text-xs text-fg-secondary">
                {t("ready", { done: doneCount, total: data.asks.length })}
              </p>
            )}
          </div>
          <ul className="mt-5 grid gap-3">
            {data.asks.map((ask) => (
              <li key={ask.id} className={card}>
                <label className="flex min-h-11 items-start gap-3.5">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
                    checked={ask.done}
                    disabled={!onChange}
                    onChange={(e) =>
                      onChange?.({
                        ...data,
                        asks: data.asks.map((a) =>
                          a.id === ask.id ? { ...a, done: e.target.checked } : a,
                        ),
                      })
                    }
                  />
                  <span className={ask.done ? "text-fg-secondary line-through" : ""}>{ask.text}</span>
                </label>
                {ask.evidence.length > 0 && (
                  <ul className="mt-1 flex flex-wrap gap-2 pl-[2.125rem]">
                    {ask.evidence.map((e) => (
                      <li
                        key={e}
                        className="rounded-card border border-border-subtle bg-surface-page px-2.5 py-1 text-xs text-fg-secondary"
                      >
                        {e}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {shown && (
        <section aria-labelledby="doc">
          <h2 id="doc" className="font-heading text-2xl font-semibold">
            {t("letterTitle")}
          </h2>
          {data.texts.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label={t("language")}>
              {data.texts.map((text, i) => (
                <button
                  key={`${text.lang}-${i}`}
                  type="button"
                  aria-pressed={shown === text}
                  onClick={() => setLang(i)}
                  className={
                    shown === text
                      ? "min-h-11 rounded-card bg-accent px-4 text-sm font-medium text-accent-contrast"
                      : btnQuiet
                  }
                >
                  {text.label}
                </button>
              ))}
            </div>
          )}
          <div lang={shown.lang} className={`${card} mt-4 whitespace-pre-wrap leading-relaxed`}>
            {shown.text}
          </div>
        </section>
      )}

      {data.draftReply && (
        <section aria-labelledby="reply">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="reply" className="font-heading text-2xl font-semibold">
              {t("draftTitle")}
            </h2>
            <CopyButton text={data.draftReply.text} />
          </div>
          <p className="mt-2 max-w-prose text-sm text-fg-secondary">{t("draftHint")}</p>
          <div
            lang={data.draftReply.lang}
            className={`${card} mt-4 whitespace-pre-wrap font-mono text-sm leading-relaxed`}
          >
            {data.draftReply.text}
          </div>
        </section>
      )}

      {data.notes.length > 0 && (
        <section aria-labelledby="notes">
          <h2 id="notes" className="font-heading text-2xl font-semibold">
            {t("notesTitle")}
          </h2>
          <ul className="mt-4 grid max-w-prose list-disc gap-2.5 pl-5 leading-relaxed text-fg-secondary">
            {data.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      {analysed && (
        <section aria-labelledby="help" className={`${card} sm:p-8`}>
          <p className={eyebrow}>{t("whoEyebrow")}</p>
          <h2 id="help" className="mt-2 font-heading text-2xl font-semibold">
            {t(`tier.${data.recommendedTier}`)}
          </h2>
          {data.tierReason && (
            <p className="mt-2 max-w-prose leading-relaxed text-fg-secondary">{data.tierReason}</p>
          )}
          <p className="mt-2">
            <Link href={ROUTES.helpers} className={`${link} inline-flex min-h-11 items-center`}>
              {t("findHelper")}
            </Link>
          </p>
        </section>
      )}

      <footer className="flex flex-wrap gap-3 border-t border-border-subtle pt-6">
        <button
          type="button"
          className={btnQuiet}
          onClick={() => download(anonymisedCase(data), `causius-${data.id}-anonymised.json`)}
        >
          {t("exportAnon")}
        </button>
        <button
          type="button"
          className={btnQuiet}
          onClick={() => download(data, `causius-${data.id}.json`)}
        >
          {t("export")}
        </button>
        {onSaveCopy && (
          <button type="button" className={btnQuiet} onClick={onSaveCopy}>
            {t("saveCopy")}
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className={btnQuiet}
            onClick={() => {
              if (window.confirm(t("deleteConfirm"))) onDelete();
            }}
          >
            {t("delete")}
          </button>
        )}
      </footer>
    </article>
  );
}
