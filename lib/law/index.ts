import { srNumber } from "./acts";
import { readFederalArticle, type LawLanguage, type ReadArticle } from "./fedlex";
import { liActId, readLiechtensteinProvision } from "./lilex";

/**
 * The law of each market, read from its own official collection. A country
 * is added by giving it a reader here: the agent's read_law tool, its
 * sources and its tests follow.
 *
 * Which collection answers is the matter's country first, then the other:
 * "StGB" names an act in both, and a Liechtenstein matter means LI's.
 */
export interface LawQuery {
  act: string;
  /** "270b", "Art. 12", "§ 1096". */
  provision: string;
  lang: LawLanguage;
  /** YYYY-MM-DD: the version in force that day, where the collection keeps versions. */
  day: string;
  fetchImpl?: typeof fetch;
}

/** A reader returns null when the act is not one of its own. */
const READERS: Record<string, { label: string; read: (q: LawQuery) => Promise<{ result: ReadArticle; cite: string } | null> }> = {
  CH: {
    label: "Fedlex",
    async read(q) {
      const sr = srNumber(q.act);
      if (!sr) return null;
      const result = await readFederalArticle({ sr, article: q.provision, lang: q.lang, day: q.day, fetchImpl: q.fetchImpl });
      return { result, cite: `${q.act} (SR ${sr})` };
    },
  },
  LI: {
    label: "gesetze.li",
    async read(q) {
      if (!liActId(q.act)) return null;
      const result = await readLiechtensteinProvision({ act: q.act, provision: q.provision, fetchImpl: q.fetchImpl });
      return { result, cite: `${q.act} (LI)` };
    },
  },
};

export const LAW_COUNTRIES = Object.keys(READERS);

/**
 * One provision from the first collection that knows the act, the matter's
 * country first. `unknown` when no collection does.
 */
export async function readLaw(
  q: LawQuery & { country?: string | null },
): Promise<{ result: ReadArticle; cite: string; collection: string } | { unknown: true }> {
  const first = q.country && READERS[q.country] ? [q.country] : [];
  for (const code of [...first, ...LAW_COUNTRIES.filter((c) => c !== q.country)]) {
    const found = await READERS[code]!.read(q);
    if (found) return { ...found, collection: READERS[code]!.label };
  }
  return { unknown: true };
}
