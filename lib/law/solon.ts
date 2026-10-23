/**
 * The law as Solon holds it (https://solon.orangecat.ch/api/v1/law): the
 * publisher's text, kept as data, with the page it came from and the sha256 of
 * the bytes. Causius asks Solon first and the publisher second, so a provision
 * is read from a copy that can be checked against its publisher, and anything
 * Solon does not hold yet is still read from the publisher itself.
 *
 * Only the acts Solon holds and numbers the way their authority does: federal
 * acts by SR number, Liechtenstein's by LR number. A cantonal act is not asked
 * for here, because Causius names those by abbreviation and Solon, for now, by
 * number only; it is read from LexFind as before.
 */
import { articleId } from "./fedlex";
import type { LawLanguage, ReadArticle } from "./fedlex";
import { provisionAnchors } from "./lilex";

export const SOLON_URL = process.env.SOLON_URL ?? "https://solon.orangecat.ch";
const TIMEOUT_MS = 8_000;

export type SolonAuthority = "ch" | "li";

interface SolonAct {
  id: string;
  inForce: boolean;
}

interface SolonProvision {
  heading: string;
  text: string;
  inForceFrom: string;
  dateBasis?: string;
  sourceUrl: string | null;
  contentSha256: string;
}

const getJson = async (
  url: string,
  doFetch: typeof fetch,
): Promise<unknown | null> => {
  try {
    const response = await doFetch(url, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
};

/** Solon's paths for a provision as a person names it ("270b", "Art. 12", "§ 1096"), most likely first. */
export function solonPaths(
  authority: SolonAuthority,
  provision: string,
): string[] {
  if (authority === "ch") {
    const id = articleId(provision);
    return id ? [id] : [];
  }
  return provisionAnchors(provision).map((anchor) => anchor.replace(":", "_"));
}

/**
 * The page a person opens for a Fedlex copy: the file store's address names the
 * act (`.../eli/cc/1988/1776/<date>/de/html/...`), the page is the act in that
 * language, scrolled to the article. Other publishers' addresses are their pages.
 */
export function humanUrl(
  sourceUrl: string,
  lang: string,
  path: string,
): string {
  const act =
    /\/filestore\/fedlex\.data\.admin\.ch\/(eli\/cc\/[^/]+\/[^/]+)\/\d{8}\//.exec(
      sourceUrl,
    )?.[1];
  return act ? `https://www.fedlex.admin.ch/${act}/${lang}#${path}` : sourceUrl;
}

/** One provision from Solon, or null when Solon does not hold it (unknown act, not loaded, unreachable). */
export async function readFromSolon(input: {
  authority: SolonAuthority;
  /** The authority's number for the act: SR for the Confederation, LR for Liechtenstein. */
  number: string;
  provision: string;
  lang: LawLanguage;
  /** YYYY-MM-DD */
  day: string;
  fetchImpl?: typeof fetch;
  baseUrl?: string;
}): Promise<ReadArticle | null> {
  const doFetch = input.fetchImpl ?? fetch;
  const base = input.baseUrl ?? SOLON_URL;
  const paths = solonPaths(input.authority, input.provision);
  if (paths.length === 0) return null;
  const acts = (await getJson(
    `${base}/api/v1/law/acts?authority=${input.authority}&number=${encodeURIComponent(input.number)}`,
    doFetch,
  )) as { acts?: SolonAct[] } | null;
  const act = acts?.acts?.find((a) => a.inForce) ?? acts?.acts?.[0];
  if (!act) return null;
  for (const path of paths) {
    const found = (await getJson(
      `${base}/api/v1/law/provisions?act=${act.id}&path=${path}&lang=${input.lang}&on=${input.day}`,
      doFetch,
    )) as SolonProvision | null;
    if (!found?.text) continue;
    return {
      ok: true,
      article: {
        sha256: found.contentSha256,
        heading: found.heading,
        text: found.text,
        url: found.sourceUrl
          ? humanUrl(found.sourceUrl, input.lang, path)
          : `${base}/api/v1/law/acts?number=${input.number}`,
        // Where the publisher states no date the version is dated by the day Solon read it; say nothing rather than mislead.
        inForceSince: found.dateBasis === "retrieved" ? "" : found.inForceFrom,
      },
    };
  }
  return null;
}
