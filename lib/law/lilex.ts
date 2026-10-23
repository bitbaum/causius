/**
 * Reading Liechtenstein law from gesetze.li (Lilex), the Government's official
 * consolidated collection. Laws and other official acts are not protected by
 * copyright in Liechtenstein (URG Art. 5).
 *
 * Lilex has no API. A consolidated act is one HTML page (/konso/html/<id>)
 * in which every provision is a `div.art` opened by an anchor: `art:<n>` for
 * articles, `par:<n>` for the § of acts taken from Austria (ABGB, ZPO,
 * StGB). Its listing pages sit behind a browser proof-of-work, so acts are
 * found here by a verified map rather than by search, and a page that comes
 * back as that challenge is reported as unreachable, never parsed as law.
 */
import type { ReadArticle } from "./fedlex";

/** Common acts, by abbreviation, to their Lilex id (LGBl year+number). Checked against the live pages, 2026-10-22. */
export const LI_ACTS: Record<string, string> = {
  LV: "1921015000", // Verfassung, LR 101
  // LR 210.0. Its tenancy law sits under § 1090 as articles of their own
  // (Art. 1 ff., anchors art:n), so a tenancy provision is cited "Art. n".
  ABGB: "1003001000",
  SR: "1923004000", // Sachenrecht, LR 214.0
  PGR: "1926004000", // Personen- und Gesellschaftsrecht, LR 216.0
  ZPO: "1912009001", // LR 271.0
  STGB: "1988037000", // LR 311.0
  STPO: "1988062000", // LR 312.0
  LVG: "1922024000", // Landesverwaltungspflegegesetz, LR 172.020
  AUG: "2008311000", // Ausländergesetz, LR 152.20
  STEG: "2010340000", // Steuergesetz, LR 640.0
  ARG: "1967006000", // Arbeitsgesetz, LR 822.10
};

/** The same acts by their LR number, which is how Solon keeps them. */
export const LI_LR: Record<string, string> = {
  LV: "101",
  ABGB: "210.0",
  SR: "214.0",
  PGR: "216.0",
  ZPO: "271.0",
  STGB: "311.0",
  STPO: "312.0",
  LVG: "172.020",
  AUG: "152.20",
  STEG: "640.0",
  ARG: "822.10",
};

/** "LV", "abgb" → "101", "210.0"; an unknown name → null. */
export function liLr(act: string): string | null {
  return LI_LR[act.trim().toUpperCase().replace(/[.\s-]/g, "")] ?? null;
}

/** "ABGB", "abgb", "LR 210.0"? Only abbreviations: Lilex ids are not LR numbers. */
export function liActId(act: string): string | null {
  return LI_ACTS[act.trim().toUpperCase().replace(/[.\s-]/g, "")] ?? null;
}

/** "1096" / "§ 1096" → "par:1096"; "Art. 12a" → "art:12a". */
export function provisionAnchors(provision: string): string[] {
  const m = /^\s*(§|art(?:\.|ikel)?)?\s*(\d+\s*[a-z]*)\s*$/i.exec(provision);
  if (!m) return [];
  const n = m[2]!.replace(/\s+/g, "").toLowerCase();
  if (m[1] === "§") return [`par:${n}`];
  if (m[1]) return [`art:${n}`];
  return [`art:${n}`, `par:${n}`];
}

const pages = new Map<string, string>();
const PAGES_KEPT = 6;

function text(fragment: string): string {
  return fragment
    .replace(/<a href="#fn[^"]*"[^>]*>[\s\S]*?<\/a>/g, "")
    .replace(/<div|<\/div>|<br\s*\/?>/g, (m) => (m === "<div" ? "\n<div" : "\n"))
    .replace(/<[^>]+>/g, "")
    .replace(/&sect;/g, "§")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&([aou])uml;/gi, (_, v: string) => ({ a: "ä", o: "ö", u: "ü", A: "Ä", O: "Ö", U: "Ü" })[v]!)
    .replace(/&szlig;/g, "ss")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

/** One provision out of a Lilex page: its heading line ("§ 1096") and its text. */
export function extractProvision(html: string, anchor: string): { heading: string; text: string } | null {
  const start = html.indexOf(`<a name="${anchor}"></a>`);
  if (start < 0) return null;
  // A provision ends where the next one, or the next heading, begins.
  const ends = [/<div class="art"/g, /<div class="tit/g, /<div class="sacht" style=/g].map((re) => {
    re.lastIndex = start + 1;
    return re.exec(html)?.index ?? html.length;
  });
  const lines = text(html.slice(start, Math.min(...ends))).split("\n");
  return { heading: lines[0] ?? "", text: lines.slice(1).join("\n") };
}

/**
 * The act's page, or null. Lilex answers a burst with its proof-of-work page
 * instead of the law; that page has no provisions, is never parsed as law,
 * and gets one polite retry. The check itself is not worked around.
 */
async function fetchAct(id: string, doFetch: typeof fetch, retryMs: number): Promise<string | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt) await new Promise((r) => setTimeout(r, retryMs));
    try {
      const res = await doFetch(`https://www.gesetze.li/konso/html/${id}`, { signal: AbortSignal.timeout(60_000) });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.includes('<div class="art"')) return html;
    } catch {
      // try once more
    }
  }
  return null;
}

/** One provision of a Liechtenstein act, as consolidated today. */
export async function readLiechtensteinProvision(input: {
  act: string;
  provision: string;
  fetchImpl?: typeof fetch;
  /** Wait before the one retry. */
  retryMs?: number;
}): Promise<ReadArticle> {
  const id = liActId(input.act);
  if (!id) return { ok: false, reason: "no_such_act" };
  const anchors = provisionAnchors(input.provision);
  if (!anchors.length) return { ok: false, reason: "no_such_article" };
  let html = pages.get(id);
  if (!html) {
    html = (await fetchAct(id, input.fetchImpl ?? fetch, input.retryMs ?? 2_000)) ?? undefined;
    if (!html) return { ok: false, reason: "unreachable" };
    if (pages.size >= PAGES_KEPT) pages.delete(pages.keys().next().value!);
    pages.set(id, html);
  }
  for (const anchor of anchors) {
    const found = extractProvision(html, anchor);
    if (found)
      return {
        ok: true,
        // The consolidated page itself, scrolled to the provision.
        article: { ...found, url: `https://www.gesetze.li/konso/html/${id}#${anchor}`, inForceSince: "" },
      };
  }
  return { ok: false, reason: "no_such_article" };
}
