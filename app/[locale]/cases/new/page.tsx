"use client";

import { byokLabel } from "@bitbaum/ai-kit/byok";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { PhotoRedactor } from "@/components/PhotoRedactor";
import { btnPrimary, btnQuiet, card, field, link, shell } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { toLocale } from "@/i18n/routing";
import { languageName, MAX_TRANSLATIONS, TRANSLATION_LANGUAGES, type TranslationLanguage } from "@/lib/languages";
import { MAX_PAGES } from "@/lib/analyze-limits";
import { newId, type CaseFile } from "@/lib/case";
import { API, ROUTES } from "@/lib/routes";
import { shrinkImage, type ShrunkImage } from "@/lib/shrink-image";
import {
  applyRedactions,
  assignTokens,
  findPersonalData,
  mapStrings,
  restore,
} from "@/lib/redact";
import { saveCase, saveOwnWords, useHydrated, useOwnModel, useOwnWords } from "@/lib/store";

/** Sent to the model by English name; shown to the reader in their language. */

/**
 * What each failure offers as a way past it. Fleet rule "no dead ends":
 * anything that stops someone shows the way forward on the same screen. The
 * words themselves are in the message catalogue under `NewCase.errors`.
 */
const WAYS_OUT: Record<string, { ownModel?: boolean; byHand?: boolean }> = {
  not_configured: { ownModel: true, byHand: true },
  busy: { ownModel: true, byHand: true },
  busy_own: { ownModel: true },
  no_vision: { ownModel: true },
  rate_limited: { ownModel: true, byHand: true },
  bad_own_model: { ownModel: true },
  unreadable_analysis: { ownModel: true },
  empty: {},
  bad_image: {},
  too_many_pages: {},
  offline: {},
  unknown: {},
};
type ErrorCode = keyof typeof WAYS_OUT;

interface Page extends ShrunkImage {
  id: string;
  name: string;
  /** How many areas the reader has blacked out on it. */
  covered: number;
}

interface Availability {
  text: boolean;
  photo: boolean;
}

export default function NewCasePage() {
  const t = useTranslations("NewCase");
  const r = useTranslations("Redact");
  const locale = toLocale(useLocale());
  const router = useRouter();
  const ownModel = useOwnModel();
  const hydrated = useHydrated();
  const [text, setText] = useState("");
  const [pages, setPages] = useState<Page[]>([]);
  // The reader's own language is always asked for; this is what else they want.
  const [languages, setLanguages] = useState<TranslationLanguage[]>([locale]);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ErrorCode | null>(null);
  const [manual, setManual] = useState(false);
  const [title, setTitle] = useState("");
  const [authority, setAuthority] = useState("");
  const [deadline, setDeadline] = useState("");
  const [free, setFree] = useState<Availability | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  // Anonymisation is on unless the reader turns it off for this letter.
  const [anonymise, setAnonymise] = useState(true);
  const savedWords = useOwnWords();
  const [wordsDraft, setWordsDraft] = useState<string | null>(null);
  const wordsText = wordsDraft ?? savedWords.join(", ");
  const ownWordList = useMemo(
    () => wordsText.split(/[,;\n]/).map((w) => w.trim()).filter((w) => w.length >= 2),
    [wordsText],
  );
  // Values the reader has chosen to send after all (a false find).
  const [keep, setKeep] = useState<Set<string>>(new Set());
  const found = useMemo(
    () => (anonymise ? findPersonalData(text, ownWordList) : []),
    [anonymise, text, ownWordList],
  );
  const redactions = useMemo(
    () => assignTokens(found.filter((f) => !keep.has(f.value))),
    [found, keep],
  );
  const sentText = useMemo(() => applyRedactions(text, redactions), [text, redactions]);

  // What the free models can do right now, asked once, so the page can say it
  // BEFORE someone types a letter in. Unknown (offline) says nothing.
  useEffect(() => {
    let stale = false;
    fetch(API.health)
      .then((r) => r.json())
      .then((body: { analysis?: Availability }) => {
        if (!stale && body.analysis) setFree(body.analysis);
      })
      .catch(() => {});
    return () => {
      stale = true;
    };
  }, []);

  function fail(code: string) {
    const known: ErrorCode = code in WAYS_OUT ? code : "unknown";
    setFailure(known);
    if (WAYS_OUT[known].byHand) setManual(true);
  }

  async function addPages(files: FileList | null) {
    if (!files?.length) return;
    setFailure(null);
    const room = MAX_PAGES - pages.length;
    if (files.length > room) fail("too_many_pages");
    const added: Page[] = [];
    for (const file of Array.from(files).slice(0, Math.max(0, room))) {
      try {
        added.push({ ...(await shrinkImage(file)), id: newId(), name: file.name, covered: 0 });
      } catch {
        fail("bad_image");
      }
    }
    setPages((current) => [...current, ...added].slice(0, MAX_PAGES));
  }

  async function analyse(e: React.FormEvent) {
    e.preventDefault();
    setFailure(null);
    if (!text.trim() && pages.length === 0) return fail("empty");
    setBusy(true);
    try {
      const res = await fetch(API.analyze, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          // Only the anonymised text leaves the browser.
          text: sentText,
          // The model is told languages by their English names.
          languages: languages.map((l) => languageName(l, "en")),
          locale,
          byok: ownModel ?? undefined,
          images: pages.map(({ mediaType, data }) => ({ mediaType, data })),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { case?: CaseFile; error?: string };
      if (!res.ok || !body.case) {
        return fail(body.error === "busy" && ownModel ? "busy_own" : (body.error ?? "unknown"));
      }
      // The real values go back in here, on the device, and the table of what
      // each placeholder stood for is kept with the case for later exports.
      const restored = { ...mapStrings(body.case, (s) => restore(s, redactions)), redactions };
      saveCase(restored);
      router.push(ROUTES.caseById(restored.id));
    } catch {
      fail("offline");
    } finally {
      setBusy(false);
    }
  }

  function fileByHand(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    const c: CaseFile = {
      version: 1,
      id: newId(),
      title: title.trim(),
      jurisdiction: undefined,
      area: undefined,
      authority: authority.trim() || undefined,
      received: undefined,
      reference: undefined,
      consequence: undefined,
      tierReason: undefined,
      draftReply: undefined,
      deadline: deadline || undefined,
      deadlineQuote: undefined,
      summary: "",
      asks: [],
      texts: text.trim()
        ? [{ lang: "und", label: t("byHand.original"), text: text.trim() }]
        : [],
      notes: [],
      redactions: [],
      recommendedTier: "assistant",
      createdAt: new Date().toISOString(),
    };
    saveCase(c);
    router.push(ROUTES.caseById(c.id));
  }

  const usingOwn = hydrated && ownModel;
  let modelLine: string;
  if (usingOwn) modelLine = t("modelOwn", { model: byokLabel(ownModel) });
  else if (free && !free.text) modelLine = t("modelOff");
  else if (free && !free.photo) modelLine = t("modelFreeNoPhoto");
  else modelLine = t("modelFree");

  const editingPage = pages.find((p) => p.id === editing);
  const editingIndex = pages.findIndex((p) => p.id === editing);

  return (
    <main className={`${shell} py-10 sm:py-14`}>
      {editingPage && (
        <PhotoRedactor
          image={editingPage}
          label={t("page", { n: editingIndex + 1 })}
          onCancel={() => setEditing(null)}
          onDone={(next, covered) => {
            setPages(
              pages.map((p) =>
                p.id === editingPage.id ? { ...p, ...next, covered: p.covered + covered } : p,
              ),
            );
            setEditing(null);
          }}
        />
      )}
      <h1 className="headline text-4xl sm:text-5xl">{t("title")}</h1>
      <p className="mt-3 max-w-prose leading-relaxed text-fg-secondary">{t("lead")}</p>

      <div className="mt-5 max-w-prose rounded-control border border-border-subtle px-4 pt-3 text-sm text-fg-secondary">
        <p>{modelLine}</p>
        <Link href={ROUTES.ownModel} className={`${link} inline-flex min-h-11 items-center`}>
          {usingOwn ? t("change") : t("useOwn")}
        </Link>
      </div>

      <form onSubmit={analyse} className="mt-8 grid max-w-3xl gap-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium">
            {t("textLabel")}
          </label>
          <textarea
            id="text"
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("textPlaceholder")}
            className={`${field} mt-2`}
          />
        </div>

        <div>
          <label htmlFor="image" className="block text-sm font-medium">
            {t("photoLabel")}
          </label>
          <input
            id="image"
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            disabled={pages.length >= MAX_PAGES}
            onChange={(e) => {
              void addPages(e.target.files);
              e.target.value = "";
            }}
            className="mt-2 block w-full text-sm text-fg-secondary file:mr-4 file:min-h-11 file:rounded-control file:border file:border-solid file:border-border-subtle file:bg-surface-raised file:px-4 file:text-sm file:font-medium file:text-fg-primary"
          />
          <p className="mt-1.5 text-xs text-fg-secondary">{t("photoHint", { max: MAX_PAGES })}</p>
          {pages.length > 0 && (
            <>
              <p aria-live="polite" className="mt-3 text-sm">
                {t("pages", { count: pages.length })}
              </p>
              <ol className="mt-2 flex flex-wrap gap-2">
                {pages.map((page, i) => (
                  <li
                    key={page.id}
                    className="flex items-center gap-2 rounded-control border border-border-subtle bg-surface-raised pl-3 text-sm"
                  >
                    <span>
                      {t("page", { n: i + 1 })}
                      <span className="ml-2 text-xs text-fg-secondary">
                        {page.covered ? r("coveredCount", { count: page.covered }) : r("notCovered")}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditing(page.id)}
                      className="inline-flex min-h-11 items-center px-2 text-sm font-medium underline decoration-border-subtle underline-offset-4 hover:decoration-fg-muted"
                    >
                      {r("cover")}
                    </button>
                    <button
                      type="button"
                      aria-label={t("removePage", { n: i + 1 })}
                      onClick={() => setPages(pages.filter((p) => p.id !== page.id))}
                      className="inline-flex min-h-11 min-w-11 items-center justify-center text-lg text-fg-secondary hover:text-fg-primary"
                    >
                      <span aria-hidden="true">&times;</span>
                    </button>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>

        <section aria-labelledby="privacy-title" className={`${card} grid gap-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="max-w-prose">
              <h2 id="privacy-title" className="text-lg font-semibold tracking-tight">
                {r("title")}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-fg-secondary">{r("lead")}</p>
            </div>
            <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={anonymise}
                onChange={(e) => setAnonymise(e.target.checked)}
                className="h-5 w-5 accent-[var(--color-accent)]"
              />
              {r("toggle")}
            </label>
          </div>

          {anonymise ? (
            <>
              <div>
                <label htmlFor="own-words" className="block text-sm font-medium">
                  {r("ownWords")}
                </label>
                <input
                  id="own-words"
                  value={wordsText}
                  onChange={(e) => setWordsDraft(e.target.value)}
                  onBlur={() => {
                    saveOwnWords(ownWordList);
                    setWordsDraft(null);
                  }}
                  placeholder={r("ownWordsPlaceholder")}
                  autoComplete="off"
                  className={`${field} mt-2`}
                />
                <p className="mt-1.5 text-xs text-fg-secondary">{r("ownWordsHint")}</p>
              </div>

              {text.trim() !== "" && (
                <div>
                  <p className="text-sm font-medium" aria-live="polite">
                    {found.length ? r("found", { count: redactions.length }) : r("foundNone")}
                  </p>
                  {found.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {found.map((f) => {
                        const hidden = !keep.has(f.value);
                        return (
                          <li key={f.value}>
                            <button
                              type="button"
                              aria-pressed={hidden}
                              title={hidden ? r("sendThis") : r("hideThis")}
                              onClick={() => {
                                const next = new Set(keep);
                                if (hidden) next.add(f.value);
                                else next.delete(f.value);
                                setKeep(next);
                              }}
                              className={`inline-flex min-h-11 items-center gap-2 rounded-control border px-3 text-sm ${
                                hidden
                                  ? "border-fg-primary bg-surface-page"
                                  : "border-border-subtle text-fg-secondary line-through"
                              }`}
                            >
                              <span className="font-mono text-[0.625rem] uppercase tracking-caps text-accent">
                                {r(`kind.${f.kind}`)}
                              </span>
                              {f.value}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <details className="mt-3 text-sm">
                    <summary className="inline-flex min-h-11 cursor-pointer items-center text-fg-secondary">
                      {r("preview")}
                    </summary>
                    <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-control border border-border-subtle bg-surface-page p-3 font-mono text-xs leading-relaxed">
                      {sentText}
                    </pre>
                  </details>
                </div>
              )}

              {pages.some((p) => p.covered === 0) && (
                <p className="rounded-control border border-accent px-3 py-2 text-sm">{r("photosWarning")}</p>
              )}
            </>
          ) : (
            <p className="rounded-control border border-accent px-3 py-2 text-sm">{r("offWarning")}</p>
          )}
        </section>

        <fieldset>
          <legend className="text-sm font-medium">{t("languagesLegend")}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {TRANSLATION_LANGUAGES.map((l) => {
              const on = languages.includes(l);
              const full = !on && languages.length >= MAX_TRANSLATIONS;
              return (
                <label
                  key={l}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-control border px-3.5 text-sm ${
                    on ? "border-fg-primary bg-surface-raised" : "border-border-subtle"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={full}
                    onChange={() =>
                      setLanguages(on ? languages.filter((x) => x !== l) : [...languages, l])
                    }
                    className="accent-[var(--color-accent)]"
                  />
                  {languageName(l, locale)}
                </label>
              );
            })}
          </div>
        </fieldset>

        {failure && (
          <div role="alert" className="rounded-control border border-accent px-4 py-3 text-sm">
            <p>{t(`errors.${failure}`, { max: MAX_PAGES })}</p>
            {WAYS_OUT[failure].ownModel && (
              <p className="mt-1">
                <Link href={ROUTES.ownModel} className={`${link} inline-flex min-h-11 items-center`}>
                  {t("openSettings")}
                </Link>
              </p>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-5">
          <button type="submit" disabled={busy} className={btnPrimary}>
            {busy ? t("busy") : t("submit")}
          </button>
          {!manual && (
            <button type="button" className={`${link} min-h-11`} onClick={() => setManual(true)}>
              {t("byHandLink")}
            </button>
          )}
        </div>
      </form>

      {manual && (
        <form onSubmit={fileByHand} className={`${card} mt-10 grid max-w-3xl gap-5`}>
          <h2 className="text-2xl font-semibold tracking-tight">{t("byHand.title")}</h2>
          <p className="text-sm text-fg-secondary">
            {t("byHand.body")}{" "}
            <Link href={ROUTES.cases} className={link}>
              {t("byHand.import")}
            </Link>
          </p>
          <div>
            <label htmlFor="title" className="block text-sm font-medium">
              {t("byHand.about")}
            </label>
            <input
              id="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${field} mt-2`}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="authority" className="block text-sm font-medium">
                {t("byHand.sender")}
              </label>
              <input
                id="authority"
                value={authority}
                onChange={(e) => setAuthority(e.target.value)}
                className={`${field} mt-2`}
              />
            </div>
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium">
                {t("byHand.deadline")}
              </label>
              <input
                id="deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className={`${field} mt-2`}
              />
            </div>
          </div>
          <div>
            <button type="submit" className={btnQuiet}>
              {t("byHand.save")}
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
