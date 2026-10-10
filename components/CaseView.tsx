"use client";

import Link from "next/link";
import { useState } from "react";
import { daysUntil, formatDate, TIER_LABEL, type CaseFile } from "@/lib/case";
import { useToday } from "@/lib/store";
import { btnQuiet, card, eyebrow, link } from "./ui";

interface Props {
  data: CaseFile;
  /** Absent for the read-only sample. */
  onChange?: (next: CaseFile) => void;
  onDelete?: () => void;
  onSaveCopy?: () => void;
}

function Deadline({ deadline }: { deadline: string }) {
  const today = useToday();
  const days = today ? daysUntil(deadline, today) : null;
  let left = "";
  if (days !== null) {
    if (days > 1) left = `${days} days left`;
    else if (days === 1) left = "Due tomorrow";
    else if (days === 0) left = "Due today";
    else left = `Passed ${-days} day${days === -1 ? "" : "s"} ago`;
  }
  return (
    <div className="rounded-card border border-accent-fg px-5 py-4">
      <p className={eyebrow}>Reply by</p>
      <p className="mt-1.5 font-heading text-2xl font-semibold">{formatDate(deadline)}</p>
      {left && <p className="mt-1 text-sm text-fg-secondary">{left}</p>}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
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
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

function exportCase(data: CaseFile) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `causius-${data.id}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CaseView({ data, onChange, onDelete, onSaveCopy }: Props) {
  const [lang, setLang] = useState(0);
  const shown = data.texts[Math.min(lang, data.texts.length - 1)];
  const doneCount = data.asks.filter((a) => a.done).length;

  const facts: [string, string][] = [
    ["From", data.authority],
    ["Where", data.jurisdiction],
    ["Area", data.area],
  ];
  if (data.reference) facts.push(["Reference", data.reference]);
  if (data.received) facts.push(["Dated", formatDate(data.received)]);

  return (
    <article className="grid gap-10">
      <header className="grid gap-6 lg:grid-cols-[1fr_18rem] lg:items-start">
        <div>
          <h1 className="font-heading text-3xl font-semibold leading-tight tracking-display sm:text-4xl">
            {data.title}
          </h1>
          {data.summary && (
            <p className="mt-4 max-w-prose leading-relaxed text-fg-secondary">{data.summary}</p>
          )}
          <dl className="mt-6 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[7rem_1fr]">
            {facts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-fg-muted">{k}</dt>
                <dd className="mb-2 sm:mb-0">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="grid gap-4">
          {data.deadline && <Deadline deadline={data.deadline} />}
          {data.consequence && (
            <p className="text-sm leading-relaxed text-fg-secondary">
              <strong className="font-medium text-fg-primary">If you do nothing: </strong>
              {data.consequence}
            </p>
          )}
        </div>
      </header>

      {data.asks.length > 0 && (
        <section aria-labelledby="asks">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 id="asks" className="font-heading text-2xl font-semibold">
              What you are asked for
            </h2>
            {onChange && (
              <p className="font-mono text-xs text-fg-muted">
                {doneCount} of {data.asks.length} ready
              </p>
            )}
          </div>
          <ul className="mt-5 grid gap-3">
            {data.asks.map((ask) => (
              <li key={ask.id} className={card}>
                <label className="flex items-start gap-3.5">
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
                  <span className={ask.done ? "text-fg-muted line-through" : ""}>{ask.text}</span>
                </label>
                {ask.evidence.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2 pl-[2.125rem]">
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
            The letter
          </h2>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Language">
            {data.texts.map((t, i) => (
              <button
                key={`${t.lang}-${i}`}
                type="button"
                aria-pressed={shown === t}
                onClick={() => setLang(i)}
                className={
                  shown === t
                    ? "min-h-11 rounded-card bg-accent px-4 text-sm font-medium text-accent-contrast"
                    : btnQuiet
                }
              >
                {t.label}
              </button>
            ))}
          </div>
          <div lang={shown.lang} className={`${card} mt-4 whitespace-pre-wrap leading-relaxed`}>
            {shown.text}
          </div>
        </section>
      )}

      {data.draftReply && (
        <section aria-labelledby="reply">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="reply" className="font-heading text-2xl font-semibold">
              Draft reply
            </h2>
            <CopyButton text={data.draftReply.text} />
          </div>
          <p className="mt-2 max-w-prose text-sm text-fg-secondary">
            A starting point, not something to send as it is. Fill every [bracket] with your own true
            facts.
          </p>
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
            Worth knowing
          </h2>
          <ul className="mt-4 grid max-w-prose list-disc gap-2.5 pl-5 leading-relaxed text-fg-secondary">
            {data.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="help" className={`${card} sm:p-8`}>
        <p className={eyebrow}>Who should look at this</p>
        <h2 id="help" className="mt-2 font-heading text-2xl font-semibold">
          {TIER_LABEL[data.recommendedTier]}
        </h2>
        {data.tierReason && (
          <p className="mt-2 max-w-prose leading-relaxed text-fg-secondary">{data.tierReason}</p>
        )}
        <p className="mt-4">
          <Link href="/helpers" className={link}>
            Find a helper
          </Link>
        </p>
      </section>

      <footer className="flex flex-wrap gap-3 border-t border-border-subtle pt-6">
        <button type="button" className={btnQuiet} onClick={() => exportCase(data)}>
          Export case file
        </button>
        {onSaveCopy && (
          <button type="button" className={btnQuiet} onClick={onSaveCopy}>
            Save a copy to my cases
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className={btnQuiet}
            onClick={() => {
              if (window.confirm("Delete this case from this browser? This cannot be undone.")) {
                onDelete();
              }
            }}
          >
            Delete case
          </button>
        )}
      </footer>
    </article>
  );
}
