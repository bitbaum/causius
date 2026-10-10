import { describe, expect, it } from "vitest";
import { presenceFromMap } from "./fleet";

const entry = (over: Record<string, unknown> = {}) => ({
  slug: "causius",
  name: "Causius",
  what: "Understand and answer legal letters",
  identity: { problem: "Letters nobody can read", solution: null, mission: " ", vision: 7 },
  urls: { live: "https://causius.orangecat.ch", repo: null, orangecat: null, solon: null },
  roadmap: [{ title: "Read a letter", status: "in progress", progress: 60, targetDate: null, milestones: [] }],
  changelog: [{ date: "2026-10-10", done: "Causius reads a letter." }],
  ...over,
});

describe("presenceFromMap", () => {
  it("is absent, not invented, when the map is unreadable or has no entry", () => {
    for (const map of [null, "down", {}, { projects: [] }, { projects: [entry({ slug: "solon" })] }]) {
      const p = presenceFromMap(map);
      expect(p.development).toBeNull();
      expect(p.orangecatUrl).toBeNull();
      expect(p.solonUrl).toBeNull();
      expect(p.identity.problem).toBeNull();
    }
  });

  it("reads identity, treating blank or mistyped fields as missing", () => {
    const p = presenceFromMap({ projects: [entry()] });
    expect(p.identity).toEqual({
      problem: "Letters nobody can read",
      solution: null,
      mission: null,
      vision: null,
    });
    expect(p.development?.roadmap).toHaveLength(1);
    expect(p.development?.changelog[0].date).toBe("2026-10-10");
  });

  it("links to OrangeCat and Solon only when the map reports an https profile", () => {
    const none = presenceFromMap({ projects: [entry()] });
    expect([none.orangecatUrl, none.solonUrl]).toEqual([null, null]);

    const both = presenceFromMap({
      projects: [
        entry({
          urls: {
            orangecat: "https://orangecat.ch/projects/causius",
            solon: "https://solon.orangecat.ch/orgs/causius",
          },
        }),
      ],
    });
    expect(both.orangecatUrl).toBe("https://orangecat.ch/projects/causius");
    expect(both.solonUrl).toBe("https://solon.orangecat.ch/orgs/causius");

    const hostile = presenceFromMap({
      projects: [entry({ urls: { orangecat: "javascript:alert(1)", solon: "http://plain.example" } })],
    });
    expect([hostile.orangecatUrl, hostile.solonUrl]).toEqual([null, null]);
  });
});
