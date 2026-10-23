import { srNumber } from "./acts";
import { readFederalArticle, type LawLanguage, type ReadArticle } from "./fedlex";
import { readCantonalProvision } from "./lexfind";
import { liActId, liLr, readLiechtensteinProvision } from "./lilex";
import { readFromSolon } from "./solon";

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
  /** A Swiss canton ("ZH") for cantonal law: the matter's, or one named. */
  canton?: string | null;
  fetchImpl?: typeof fetch;
}

/** A reader returns null when the act is not one of its own. */
type Read = (q: LawQuery) => Promise<{ result: ReadArticle; cite: string; collection?: string } | null>;
const READERS: Record<string, { label: string; read: Read }> = {
  CH: {
    label: "Fedlex / LexFind",
    async read(q) {
      const sr = srNumber(q.act);
      if (sr) {
        // Solon's copy first: the publisher's text with its page and hash. Fedlex itself when Solon does not hold it.
        const held = await readFromSolon({ authority: "ch", number: sr, provision: q.provision, lang: q.lang, day: q.day, fetchImpl: q.fetchImpl });
        if (held) return { result: held, cite: `${q.act} (SR ${sr})`, collection: SOLON_LABEL };
        const result = await readFederalArticle({ sr, article: q.provision, lang: q.lang, day: q.day, fetchImpl: q.fetchImpl });
        return { result, cite: `${q.act} (SR ${sr})` };
      }
      // Not a federal act: the canton's own, through LexFind.
      if (!q.canton) return null;
      const found = await readCantonalProvision({ canton: q.canton, act: q.act, provision: q.provision, lang: q.lang, fetchImpl: q.fetchImpl });
      if (!found) return null;
      const { act, ...result } = found;
      return { result, cite: act ? `${act.abbreviation} ${q.canton} ${act.number} (${act.title})` : `${q.act} ${q.canton}` };
    },
  },
  LI: {
    label: "gesetze.li",
    async read(q) {
      if (!liActId(q.act)) return null;
      const lr = liLr(q.act);
      const held = lr
        ? await readFromSolon({ authority: "li", number: lr, provision: q.provision, lang: q.lang, day: q.day, fetchImpl: q.fetchImpl })
        : null;
      if (held) return { result: held, cite: `${q.act} (LI)`, collection: SOLON_LABEL };
      const result = await readLiechtensteinProvision({ act: q.act, provision: q.provision, fetchImpl: q.fetchImpl });
      return { result, cite: `${q.act} (LI)` };
    },
  },
};

const SOLON_LABEL = "Solon (the publisher's text, kept with its page and hash)";

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
    if (found) return { ...found, collection: found.collection ?? READERS[code]!.label };
  }
  return { unknown: true };
}
