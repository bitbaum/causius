import { describe, expect, it } from "vitest";
import de from "../messages/de.json";
import en from "../messages/en.json";
import fr from "../messages/fr.json";
import it_ from "../messages/it.json";
import { locales } from "../i18n/routing";
import { JURISDICTION_GROUPS, jurisdictionFromText, jurisdictionLabel, MARKETS, marketOf } from "./jurisdictions";

const MESSAGES = { en, de, fr, it: it_ } as const;

describe("markets", () => {
  it("are Switzerland and Liechtenstein, nothing more for now", () => {
    expect(MARKETS.map((m) => m.code)).toEqual(["CH", "LI"]);
  });

  it("each come with their words in every language, so adding one cannot ship half-done", () => {
    for (const m of MARKETS)
      for (const l of locales) {
        const where = MESSAGES[l].Home.where as Record<string, { law?: string; regions?: string }>;
        expect(where[m.code]?.law, `${l}: Home.where.${m.code}.law`).toBeTruthy();
        if (Object.keys(m.regions).length) expect(where[m.code]?.regions, `${l}: Home.where.${m.code}.regions`).toBeTruthy();
      }
  });

  it("each speak interface languages that exist, and carry a note for the agent", () => {
    for (const m of MARKETS) {
      for (const l of m.languages) expect(locales).toContain(l);
      expect(m.agentNote.length).toBeGreaterThan(40);
    }
  });

  it("lead every picker, each with its regions, and leave the rest pickable", () => {
    expect(JURISDICTION_GROUPS.map((g) => g.key)).toEqual(["CH", "LI", "elsewhere"]);
    expect(JURISDICTION_GROUPS[0]!.codes).toContain("CH-TI");
    expect(JURISDICTION_GROUPS.at(-1)!.codes).toContain("US");
  });

  it("find a region's market and name it", () => {
    expect(marketOf("CH-GE")?.code).toBe("CH");
    expect(marketOf("US")).toBeUndefined();
    expect(jurisdictionLabel("CH-GE", "fr")).toBe("Genève, Suisse");
  });
});

describe("a place read out of the quick check's words", () => {
  it("finds the canton by any of its names, else the country", () => {
    expect(jurisdictionFromText("Switzerland · Canton of Zürich")).toBe("CH-ZH");
    expect(jurisdictionFromText("Schweiz · Kanton Zurich")).toBe("CH-ZH");
    expect(jurisdictionFromText("Suisse · canton de Genève")).toBe("CH-GE");
    expect(jurisdictionFromText("Switzerland · Geneva")).toBe("CH-GE");
    expect(jurisdictionFromText("Basel-Landschaft")).toBe("CH-BL");
    expect(jurisdictionFromText("Switzerland (federal)")).toBe("CH");
    expect(jurisdictionFromText("Fürstentum Liechtenstein · Vaduz")).toBe("LI");
  });

  it("gives nothing for a place outside the markets, even with a cantonal name in it", () => {
    expect(jurisdictionFromText("Germany · Freiburg im Breisgau")).toBeNull();
    expect(jurisdictionFromText("France · Jura")).toBeNull();
    expect(jurisdictionFromText("")).toBeNull();
    expect(jurisdictionFromText(undefined)).toBeNull();
    // Not a word inside another word.
    expect(jurisdictionFromText("Curia")).toBeNull();
  });
});
