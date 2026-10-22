/**
 * Reading Swiss federal law from Fedlex, the official publication platform:
 * the text of one article as it is in force on a given day, and the link a
 * person can open to check it.
 *
 * Two public, keyless services, both run by the Federal Chancellery:
 * - the SPARQL endpoint, which says which consolidated version of an act
 *   applies on a date and where its HTML is;
 * - the file store, which serves that HTML.
 * No search engine sits in between, so this works when web search does not,
 * and what comes back is the law itself, not a page about it.
 */

const SPARQL = "https://fedlex.data.admin.ch/sparqlendpoint";
const LANGS = { de: "DEU", fr: "FRA", it: "ITA", en: "ENG" } as const;
export type LawLanguage = keyof typeof LANGS;

export interface ArticleText {
  /** "Art. 270b" as the act itself heads it. */
  heading: string;
  /** Paragraphs, each with its number: "1 Der Mieter kann …". */
  text: string;
  /** The page a person opens, scrolled to the article. */
  url: string;
  /** The day this consolidated version took effect, YYYY-MM-DD. */
  inForceSince: string;
}

export type ReadArticle =
  | { ok: true; article: ArticleText }
  | { ok: false; reason: "no_such_act" | "no_such_article" | "unreachable" };

interface Version {
  /** https://fedlex.data.admin.ch/eli/cc/27/317_321_377 */
  eli: string;
  html: string;
  date: string;
}

const versions = new Map<string, Version | null>();
const pages = new Map<string, string>();
const PAGES_KEPT = 6;

/** "270b" → "art_270_b", "6a" → "art_6_a", "4bis" → "art_4_bis", "41" → "art_41". */
export function articleId(article: string): string | null {
  const m = /^\s*(?:art(?:\.|icle|ikel|icolo)?\s*)?(\d+)\s*([a-z]+)?\s*$/i.exec(article);
  if (!m) return null;
  return m[2] ? `art_${m[1]}_${m[2].toLowerCase()}` : `art_${m[1]}`;
}

/** The text of one article out of a Fedlex HTML page, or null when the page has no such article. */
export function extractArticle(html: string, id: string): { heading: string; text: string } | null {
  const start = html.indexOf(`<article id="${id}"`);
  if (start < 0) return null;
  const end = html.indexOf("</article>", start);
  const block = html.slice(start, end < 0 ? undefined : end);
  const heading = /<h6[^>]*>([\s\S]*?)<\/h6>/.exec(block)?.[1] ?? "";
  const body = block.slice(block.indexOf("</h6>") + 5);
  return { heading: plain(heading), text: plain(body, true) };
}

function plain(fragment: string, keepBreaks = false): string {
  let s = fragment
    // Footnote markers are links inside <sup>; a paragraph number is a bare <sup>.
    .replace(/<sup>\s*<a[\s\S]*?<\/a>\s*<\/sup>/g, "")
    .replace(/<sup>(\d+)<\/sup>/g, "$1 ")
    .replace(/<\/(p|dd|li|div|tr)>|<br\s*\/?>/g, keepBreaks ? "\n" : " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));
  s = s.replace(/[ \t]+/g, " ");
  return keepBreaks
    ? s.split("\n").map((l) => l.trim()).filter(Boolean).join("\n")
    : s.replace(/\s+/g, " ").trim();
}

async function versionFor(sr: string, lang: LawLanguage, day: string, fetchImpl: typeof fetch): Promise<Version | null> {
  const key = `${sr}|${lang}|${day}`;
  if (versions.has(key)) return versions.get(key)!;
  const query = `PREFIX jolux: <http://data.legilux.public.lu/resource/ontology/jolux#>
PREFIX skos: <http://www.w3.org/2004/02/skos/core#>
SELECT ?cc ?url ?date WHERE {
  ?cc jolux:classifiedByTaxonomyEntry/skos:notation ?n .
  FILTER(str(?n) = "${sr}")
  ?cons jolux:isMemberOf ?cc ; jolux:dateApplicability ?date ; jolux:isRealizedBy ?expr .
  FILTER(?date <= "${day}"^^<http://www.w3.org/2001/XMLSchema#date>)
  ?expr jolux:language <http://publications.europa.eu/resource/authority/language/${LANGS[lang]}> ;
        jolux:isEmbodiedBy ?m .
  ?m jolux:userFormat <https://fedlex.data.admin.ch/vocabulary/user-format/html> ; jolux:isExemplifiedBy ?url .
} ORDER BY DESC(?date) LIMIT 1`;
  const res = await fetchImpl(SPARQL, {
    method: "POST",
    headers: { Accept: "application/sparql-results+json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ query }).toString(),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new Error(`fedlex sparql ${res.status}`);
  const row = ((await res.json()) as { results?: { bindings?: Record<string, { value: string }>[] } }).results
    ?.bindings?.[0];
  const version = row ? { eli: row.cc!.value, html: row.url!.value, date: row.date!.value } : null;
  versions.set(key, version);
  return version;
}

async function page(url: string, fetchImpl: typeof fetch): Promise<string> {
  const kept = pages.get(url);
  if (kept) return kept;
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`fedlex page ${res.status}`);
  const html = await res.text();
  // A consolidated act can be megabytes (OR: 2.7 MB); keep the last few.
  if (pages.size >= PAGES_KEPT) pages.delete(pages.keys().next().value!);
  pages.set(url, html);
  return html;
}

/** One article of the act numbered `sr`, as in force on `day` (YYYY-MM-DD), in `lang`. */
export async function readFederalArticle(input: {
  sr: string;
  article: string;
  lang: LawLanguage;
  day: string;
  fetchImpl?: typeof fetch;
}): Promise<ReadArticle> {
  const id = articleId(input.article);
  if (!id) return { ok: false, reason: "no_such_article" };
  const doFetch = input.fetchImpl ?? fetch;
  try {
    const version = await versionFor(input.sr, input.lang, input.day, doFetch);
    if (!version) return { ok: false, reason: "no_such_act" };
    const found = extractArticle(await page(version.html, doFetch), id);
    if (!found) return { ok: false, reason: "no_such_article" };
    const path = version.eli.replace("https://fedlex.data.admin.ch/", "https://www.fedlex.admin.ch/");
    return {
      ok: true,
      article: { ...found, url: `${path}/${input.lang}#${id}`, inForceSince: version.date },
    };
  } catch {
    return { ok: false, reason: "unreachable" };
  }
}
