import { evaluate, typoCases } from "@bitbaum/searchkit";
import { applyQuery, parseQuery } from "listkit";
import { describe, expect, it } from "vitest";
import { DIRECTORY, searchHelpers } from "./directory";
import type { PublicHelper } from "./store";

const helper = (id: string, name: string, over: Partial<PublicHelper> = {}): PublicHelper => ({
  id,
  kind: "assistant",
  name,
  headline: "",
  bio: "",
  jurisdictions: ["CH"],
  areas: [],
  languages: ["de"],
  serviceUrl: null,
  attestations: [],
  ...over,
});

// Invented names, as every name in this repository must be.
const HELPERS = [
  helper("1", "Advocata Nord", { kind: "lawyer", jurisdictions: ["CH-ZH"], areas: ["tenancy"], languages: ["de", "en"] }),
  helper("2", "Paperwork Pia", { areas: ["migration"], languages: ["de", "ti"] }),
  helper("3", "Mietrecht Hilfe Bern", { jurisdictions: ["CH-BE"], areas: ["tenancy"] }),
  helper("4", "Conseil Lémanique", { kind: "lawyer", jurisdictions: ["CH-GE", "FR"], languages: ["fr"] }),
  helper("5", "Formular Fuchs", { kind: "ai", areas: ["social"] }),
];

describe("directory", () => {
  it("finds a helper through one slipped finger in any word of their name", async () => {
    const report = await evaluate(typoCases(HELPERS), (q) => searchHelpers(HELPERS, q).map((h) => h.id));
    expect(report.misses).toEqual([]);
    expect(report.zeroResults).toBe(0);
  });

  it("finds Lémanique typed without the accent", () => {
    expect(searchHelpers(HELPERS, "lemanique")[0]!.id).toBe("4");
  });

  it("filters by kind, country, language and area from the URL", () => {
    const q = (s: string) => applyQuery(HELPERS, DIRECTORY, parseQuery(new URLSearchParams(s), DIRECTORY)).rows.map((h) => h.id);
    expect(q("kind=lawyer")).toEqual(["1", "4"]);
    // A canton counts as its country; a cross-border lawyer is found under both.
    expect(q("place=CH&area=tenancy").sort()).toEqual(["1", "3"]);
    expect(q("place=FR")).toEqual(["4"]);
    expect(q("lang=ti")).toEqual(["2"]);
    // A value the UI cannot produce filters nothing rather than everything.
    expect(q("kind=wizard").length).toBe(HELPERS.length);
  });
});
