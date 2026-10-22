/**
 * Cantonal law, all 26 cantons, through LexFind (lexfind.ch): the register of
 * Swiss cantonal and federal legislation run by the Institute of Federalism of
 * the University of Fribourg. It indexes each canton's own collection and
 * serves the text as the canton published it.
 *
 * Its public JSON API (the one its own site uses) finds an act by
 * abbreviation, title or systematic number; the text comes as the official
 * PDF, read here with unpdf, which Causius already uses for documents. A PDF
 * mixes page headers and margin notes into the text: repeated header lines
 * are removed, margin headings may remain, and the agent is told so.
 */
import { extractText, getDocumentProxy } from "unpdf";
import type { LawLanguage, ReadArticle } from "./fedlex";

const BASE = "https://www.lexfind.ch";

export interface CantonalAct {
  tolId: number;
  title: string;
  abbreviation: string;
  /** The canton's systematic number, e.g. "631.1" (LS for Zürich). */
  number: string;
  pdf: string;
  /** The canton's own page for it, the link a person opens. */
  official: string;
  inForceSince: string;
}

type Fetch = typeof fetch;

let entities: Promise<Record<string, number>> | null = null;

/** LexFind's id for a canton by its code ("ZH" → 26). */
async function entityId(canton: string, doFetch: Fetch): Promise<number | null> {
  entities ??= doFetch(`${BASE}/api/fe/de/entities`, { signal: AbortSignal.timeout(30_000) })
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((list: { id: number; abbreviation: string }[]) => Object.fromEntries(list.map((e) => [e.abbreviation.toUpperCase(), e.id])))
    .catch((e) => {
      entities = null;
      throw e;
    });
  return (await entities)[canton.toUpperCase()] ?? null;
}

interface Match {
  title: string;
  keywords: string | null;
  is_active: boolean;
  version_active_since: string | null;
  category?: { name: string };
}
interface Hit {
  id: number;
  systematic_number: string;
  is_active: boolean;
  dta_urls: { language: string; url: string; original_url?: string }[];
  matches: Match[];
}

const acts = new Map<string, CantonalAct | null>();

/** The act in force in `canton` that `act` names: its abbreviation (StG), systematic number (631.1) or title. */
export async function findCantonalAct(canton: string, act: string, lang: LawLanguage, doFetch: Fetch = fetch): Promise<CantonalAct | null> {
  const key = `${canton}|${act}|${lang}`.toLowerCase();
  if (acts.has(key)) return acts.get(key)!;
  const entity = await entityId(canton, doFetch);
  if (entity === null) return null;
  const byNumber = /^\d+(\.\d+)*$/.test(act.trim());
  const created = await doFetch(`${BASE}/api/fe/${lang}/fulltext-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      search_text: act.trim(),
      entity_filter: [entity],
      active_only: true,
      search_in_systematic_number: byNumber,
      search_in_title: !byNumber,
      search_in_keywords: !byNumber,
      search_in_content: false,
      systematic_filter: [],
      category_filter: [],
      use_global_systematics: false,
      direct_search: false,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!created.ok) throw new Error(`lexfind search ${created.status}`);
  const { id, session_id } = (await created.json()) as { id: number; session_id: string };
  const res = await doFetch(
    `${BASE}/api/fe/${lang}/fulltext-search/${id}?session_id=${session_id}&page_no=1&results_per_page=20`,
    { signal: AbortSignal.timeout(30_000) },
  );
  if (!res.ok) throw new Error(`lexfind results ${res.status}`);
  const hits = ((await res.json()) as { texts_of_law_with_matches?: Hit[] }).texts_of_law_with_matches ?? [];
  const wanted = act.trim().toLowerCase();
  const scored = hits
    .filter((h) => h.is_active)
    .map((h) => {
      const m = h.matches.find((x) => x.is_active) ?? h.matches[0];
      const keywords = (m?.keywords ?? "").toLowerCase().split(/[,;]\s*/);
      const named =
        (byNumber && h.systematic_number === act.trim() ? 4 : 0) +
        (keywords.includes(wanted) ? 4 : 0) +
        ((m?.title ?? "").toLowerCase() === wanted ? 3 : 0);
      // The category only breaks a tie between acts that ARE named so.
      const score = named ? named + (m?.category?.name === "Gesetz" || m?.category?.name === "Loi" ? 1 : 0) : 0;
      return { h, m, score };
    })
    .filter((x) => x.m && x.score > 0)
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  const file = best?.h.dta_urls.find((u) => u.language === lang) ?? best?.h.dta_urls[0];
  const found =
    best && file
      ? {
          tolId: best.h.id,
          title: best.m!.title,
          abbreviation: best.m!.keywords ?? act.trim(),
          number: best.h.systematic_number,
          pdf: `${BASE}${file.url}`,
          official: file.original_url ?? `${BASE}${file.url}`,
          inForceSince: best.m!.version_active_since ?? "",
        }
      : null;
  acts.set(key, found);
  return found;
}

const texts = new Map<string, string>();
const TEXTS_KEPT = 6;

/** The act's text as lines, without the header and footer lines repeated on every page. */
export function cleanPdfText(raw: string): string {
  const lines = raw.split("\n").map((l) => l.replace(/\s+/g, " ").trim());
  const counts = new Map<string, number>();
  for (const l of lines) if (l) counts.set(l, (counts.get(l) ?? 0) + 1);
  return (
    lines
      .filter((l) => l && (counts.get(l) ?? 0) < 8 && !/^\d{1,4}$/.test(l) && !/^\d{1,2}\. ?\d{1,2}\. ?\d{2,4} - \d+$/.test(l))
      .join("\n")
      // A word hyphenated across a line break is one word ("Steuer-\npflichtige"),
      // unless the next is a conjunction ("Einkommens-\nund Vermögenssteuern").
      .replace(/(\p{L})-\n(?!(?:und|oder|bzw|et|ou|e|o)\b)(\p{Ll})/gu, "$1$2")
  );
}

/** "§ 140", "140", "Art. 12a" → a pattern for the provision's own heading and one for the next heading. */
function headings(provision: string): { start: RegExp; next: RegExp } | null {
  const m = /^\s*(§|art(?:\.|ikel|icle|icolo)?)?\s*(\d+)\s*([a-z]*)\s*$/i.exec(provision);
  if (!m) return null;
  const n = `${m[2]}${m[3] ? `\\s*${m[3]}` : ""}`;
  const sign = m[1] === "§" ? "§" : m[1] ? "Art\\." : "(?:§|Art\\.)";
  return {
    // A heading is the sign and number followed by a period or by the text,
    // never by "Abs." / "al." / "lit." / "cpv." as a reference to it is.
    // A margin note can run into a heading ("Steuerarten§ 1."), so anything
    // but a digit may come before it.
    start: new RegExp(`(?<![0-9])${sign}\\s*${n}(?![0-9a-z])\\.?\\s+(?!Abs\\.|al\\.|lit\\.|let\\.|cpv\\.|und\\b|et\\b|bis\\s+\\d|ff?\\.)`, "m"),
    next: new RegExp(
      `(?<![0-9])(?:§|Art\\.)\\s*\\d+\\s*[a-z]*\\.?\\s+(?!Abs\\.|al\\.|lit\\.|let\\.|cpv\\.|Ziff\\.|ch\\.)(?=\\d\\s+[A-ZÄÖÜÉÈ]|[A-ZÄÖÜÉÈ])`,
      "m",
    ),
  };
}

/** One provision cut out of a cleaned act text, or null. */
export function extractCantonalProvision(text: string, provision: string): string | null {
  const h = headings(provision);
  if (!h) return null;
  const start = h.start.exec(text);
  if (!start) return null;
  const rest = text.slice(start.index + start[0].length);
  const end = h.next.exec(rest);
  const body = rest.slice(0, end ? end.index : 4000).slice(0, 4000);
  return `${start[0].trim()} ${body.trim()}`.trim();
}

async function actText(act: CantonalAct, doFetch: Fetch): Promise<string> {
  const kept = texts.get(act.pdf);
  if (kept) return kept;
  const res = await doFetch(act.pdf, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`lexfind pdf ${res.status}`);
  const pdf = await getDocumentProxy(new Uint8Array(await res.arrayBuffer()));
  const text = cleanPdfText(String((await extractText(pdf, { mergePages: true })).text));
  if (texts.size >= TEXTS_KEPT) texts.delete(texts.keys().next().value!);
  texts.set(act.pdf, text);
  return text;
}

/** One provision of a cantonal act in force today. */
export async function readCantonalProvision(input: {
  canton: string;
  act: string;
  provision: string;
  lang: LawLanguage;
  fetchImpl?: Fetch;
}): Promise<(ReadArticle & { act?: CantonalAct }) | null> {
  const doFetch = input.fetchImpl ?? fetch;
  let act: CantonalAct | null;
  try {
    act = await findCantonalAct(input.canton, input.act, input.lang, doFetch);
  } catch {
    return { ok: false, reason: "unreachable" };
  }
  if (!act) return null;
  try {
    const text = extractCantonalProvision(await actText(act, doFetch), input.provision);
    if (!text) return { ok: false, reason: "no_such_article" };
    const heading = text.split(/\s+/).slice(0, 2).join(" ").replace(/\.$/, "");
    return {
      ok: true,
      act,
      article: { heading, text: text.slice(heading.length).replace(/^\.?\s*/, ""), url: act.official, inForceSince: act.inForceSince },
    };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}
