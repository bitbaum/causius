"use client";

import { byokLabel } from "@bitbaum/ai-kit/byok";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { btnPrimary, btnQuiet, card, field, link, shell } from "@/components/ui";
import { Link, useRouter } from "@/i18n/navigation";
import { localeEnglishNames, toLocale } from "@/i18n/routing";
import { MAX_PAGES } from "@/lib/analyze-limits";
import { newId, type CaseFile } from "@/lib/case";
import { API, ROUTES } from "@/lib/routes";
import { shrinkImage, type ShrunkImage } from "@/lib/shrink-image";
import { saveCase, useHydrated, useOwnModel } from "@/lib/store";

/** Sent to the model by English name; shown to the reader in their language. */
const LANGUAGES = ["English", "German", "French"] as const;
type Language = (typeof LANGUAGES)[number];

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
}

interface Availability {
  text: boolean;
  photo: boolean;
}

export default function NewCasePage() {
  const t = useTranslations("NewCase");
  const locale = toLocale(useLocale());
  const router = useRouter();
  const ownModel = useOwnModel();
  const hydrated = useHydrated();
  const [text, setText] = useState("");
  const [pages, setPages] = useState<Page[]>([]);
  // The reader's own language is always asked for; this is what else they want.
  const [languages, setLanguages] = useState<Language[]>([localeEnglishNames[locale]]);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ErrorCode | null>(null);
  const [manual, setManual] = useState(false);
  const [title, setTitle] = useState("");
  const [authority, setAuthority] = useState("");
  const [deadline, setDeadline] = useState("");
  const [free, setFree] = useState<Availability | null>(null);

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
        added.push({ ...(await shrinkImage(file)), id: newId(), name: file.name });
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
          text,
          languages,
          locale,
          byok: ownModel ?? undefined,
          images: pages.map(({ mediaType, data }) => ({ mediaType, data })),
        }),
      });
      const body = (await res.json().catch(() => ({}))) as { case?: CaseFile; error?: string };
      if (!res.ok || !body.case) {
        return fail(body.error === "busy" && ownModel ? "busy_own" : (body.error ?? "unknown"));
      }
      saveCase(body.case);
      router.push(ROUTES.caseById(body.case.id));
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

  return (
    <main className={`${shell} py-10 sm:py-14`}>
      <h1 className="font-heading text-4xl font-semibold tracking-display">{t("title")}</h1>
      <p className="mt-3 max-w-prose leading-relaxed text-fg-secondary">{t("lead")}</p>

      <div className="mt-5 max-w-prose rounded-card border border-border-subtle px-4 pt-3 text-sm text-fg-secondary">
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
            className="mt-2 block w-full text-sm text-fg-secondary file:mr-4 file:min-h-11 file:rounded-card file:border file:border-solid file:border-border-subtle file:bg-surface-raised file:px-4 file:text-sm file:font-medium file:text-fg-primary"
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
                    className="flex items-center gap-2 rounded-card border border-border-subtle bg-surface-raised pl-3 text-sm"
                  >
                    <span>
                      {t("page", { n: i + 1 })}
                      <span className="ml-2 text-xs text-fg-secondary">{page.name}</span>
                    </span>
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

        <fieldset>
          <legend className="text-sm font-medium">{t("languagesLegend")}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {LANGUAGES.map((l) => {
              const on = languages.includes(l);
              return (
                <label
                  key={l}
                  className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-card border px-3.5 text-sm ${
                    on ? "border-fg-primary bg-surface-raised" : "border-border-subtle"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setLanguages(on ? languages.filter((x) => x !== l) : [...languages, l])
                    }
                    className="accent-[var(--color-accent)]"
                  />
                  {t(`lang.${l}`)}
                </label>
              );
            })}
          </div>
        </fieldset>

        {failure && (
          <div role="alert" className="rounded-card border border-accent-fg px-4 py-3 text-sm">
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
          <h2 className="font-heading text-2xl font-semibold">{t("byHand.title")}</h2>
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
