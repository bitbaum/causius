import { describe, expect, it } from "vitest";
import { FEDERAL_ACTS } from "../lib/law/acts";
import { readFederalArticle } from "../lib/law/fedlex";
import { LI_ACTS, readLiechtensteinProvision } from "../lib/law/lilex";

/**
 * The real Fedlex, no keys needed: `pnpm run check:law`. The articles a
 * Causius matter leans on most, and every act the abbreviation map names
 * (its Art. 1, so a wrong SR number fails here, not in front of a person).
 */
const DAY = new Date().toISOString().slice(0, 10);

describe("Fedlex, live", () => {
  it.each([
    ["220", "270b", "de", /innert 30 Tagen/],
    ["220", "270b", "fr", /30 jours/],
    ["642.11", "132", "de", /innert 30 Tagen nach Zustellung/],
    ["281.1", "74", "de", /innert zehn Tagen/],
    ["210", "9", "it", /registri pubblici/],
  ] as const)("SR %s Art. %s (%s)", async (sr, article, lang, says) => {
    const r = await readFederalArticle({ sr, article, lang, day: DAY });
    expect(r.ok && r.article.text).toMatch(says);
    console.log(`[law] SR ${sr} ${r.ok ? `${r.article.heading} since ${r.article.inForceSince} ${r.article.url}` : r}`);
  }, 120_000);

  it("every act in the abbreviation map exists", async () => {
    for (const sr of new Set(Object.values(FEDERAL_ACTS))) {
      const r = await readFederalArticle({ sr, article: "1", lang: "de", day: DAY });
      expect(r.ok, `SR ${sr}`).toBe(true);
    }
  }, 600_000);

  it.each([
    ["ABGB", "Art. 12", /Mietzins/],
    ["LV", "Art. 1", /elf Gemeinden/],
    ["StGB", "§ 1", /Keine Strafe ohne Gesetz/],
  ] as const)("Liechtenstein %s %s", async (act, provision, says) => {
    const r = await readLiechtensteinProvision({ act, provision });
    expect(r.ok && r.article.text).toMatch(says);
    console.log(`[law] LI ${act} ${provision} ${r.ok ? r.article.url : r.reason}`);
  }, 120_000);

  it("every Liechtenstein act in the map has provisions", async () => {
    for (const act of Object.keys(LI_ACTS)) {
      // Lilex answers a burst with a proof-of-work page; be gentle with it.
      await new Promise((r) => setTimeout(r, 1500));
      const r = await readLiechtensteinProvision({ act, provision: "1", retryMs: 5000 });
      expect(r.ok || r.reason === "no_such_article", `${act}: ${r.ok ? "" : r.reason}`).toBe(true);
    }
  }, 600_000);
});
