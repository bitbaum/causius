import { describe, expect, it } from "vitest";
import { readLaw } from ".";
import { humanUrl, readFromSolon, solonPaths } from "./solon";

const FILESTORE =
  "https://fedlex.data.admin.ch/filestore/fedlex.data.admin.ch/eli/cc/27/317_321_377/20260101/de/html/fedlex-data-admin-ch-eli-cc-27-317_321_377-20260101-de-html-3.html";

/** Solon with one act, OR, and one article of it. */
function solon(
  provision: Record<string, unknown> | null = {
    heading: "Art. 270b Anfechtung des Anfangsmietzinses",
    text: "1 Der Mieter kann den Anfangsmietzins anfechten.",
    inForceFrom: "2020-01-01",
    dateBasis: "publisher",
    sourceUrl: FILESTORE,
    contentSha256: "a".repeat(64),
  },
) {
  const seen: string[] = [];
  const doFetch = (async (input: string | URL | Request) => {
    const url = String(input);
    seen.push(url);
    if (url.includes("/api/v1/law/acts?authority=ch&number=220")) {
      return Response.json({ acts: [{ id: "act-1", inForce: true }] });
    }
    if (
      url.includes("/api/v1/law/provisions?act=act-1&path=art_270_b") &&
      provision
    )
      return Response.json(provision);
    return new Response("{}", { status: 404 });
  }) as typeof fetch;
  return { doFetch, seen };
}

describe("solonPaths", () => {
  it("names a provision the way Solon does", () => {
    expect(solonPaths("ch", "270b")).toEqual(["art_270_b"]);
    expect(solonPaths("ch", "Art. 41")).toEqual(["art_41"]);
    expect(solonPaths("li", "§ 1096")).toEqual(["par_1096"]);
    expect(solonPaths("li", "Art. 12a")).toEqual(["art_12a"]);
    expect(solonPaths("ch", "not an article")).toEqual([]);
  });
});

describe("humanUrl", () => {
  it("turns a Fedlex file-store address into the act's page, scrolled to the article", () => {
    expect(humanUrl(FILESTORE, "de", "art_270_b")).toBe(
      "https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#art_270_b",
    );
  });
  it("leaves another publisher's address as it is", () => {
    expect(
      humanUrl("https://www.gesetze.li/konso/html/2008311000", "de", "art_1"),
    ).toBe("https://www.gesetze.li/konso/html/2008311000");
  });
});

describe("readFromSolon", () => {
  it("returns the provision with its hash and the page a person opens", async () => {
    const { doFetch } = solon();
    const found = await readFromSolon({
      authority: "ch",
      number: "220",
      provision: "270b",
      lang: "de",
      day: "2026-10-23",
      fetchImpl: doFetch,
    });
    expect(found).toMatchObject({
      ok: true,
      article: {
        sha256: "a".repeat(64),
        heading: "Art. 270b Anfechtung des Anfangsmietzinses",
        inForceSince: "2020-01-01",
        url: "https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#art_270_b",
      },
    });
  });
  it("states no in-force date when Solon dated the version only by the day it read it", async () => {
    const { doFetch } = solon({
      heading: "Art. 1",
      text: "x",
      inForceFrom: "2026-10-23",
      dateBasis: "retrieved",
      sourceUrl: "https://www.gesetze.li/konso/html/1",
      contentSha256: "b".repeat(64),
    });
    const found = await readFromSolon({
      authority: "ch",
      number: "220",
      provision: "270b",
      lang: "de",
      day: "2026-10-23",
      fetchImpl: doFetch,
    });
    expect(found).toMatchObject({ article: { inForceSince: "" } });
  });
  it("is null when Solon does not hold the act, the provision, or cannot be reached", async () => {
    const { doFetch } = solon(null);
    expect(
      await readFromSolon({
        authority: "ch",
        number: "220",
        provision: "270b",
        lang: "de",
        day: "2026-10-23",
        fetchImpl: doFetch,
      }),
    ).toBeNull();
    expect(
      await readFromSolon({
        authority: "ch",
        number: "999",
        provision: "1",
        lang: "de",
        day: "2026-10-23",
        fetchImpl: doFetch,
      }),
    ).toBeNull();
    const down = (async () => {
      throw new Error("down");
    }) as typeof fetch;
    expect(
      await readFromSolon({
        authority: "ch",
        number: "220",
        provision: "270b",
        lang: "de",
        day: "2026-10-23",
        fetchImpl: down,
      }),
    ).toBeNull();
  });
});

describe("read_law prefers Solon's copy", () => {
  it("reads a federal provision from Solon and names it as the collection, without asking Fedlex", async () => {
    const { doFetch, seen } = solon();
    const read = await readLaw({
      act: "OR",
      provision: "270b",
      lang: "de",
      day: "2026-10-23",
      country: "CH",
      fetchImpl: doFetch,
    });
    expect(read).toMatchObject({
      collection: expect.stringContaining("Solon"),
      result: { ok: true },
    });
    expect(seen.some((u) => u.includes("sparqlendpoint"))).toBe(false);
  });
  it("falls back to Fedlex when Solon does not hold the provision", async () => {
    const { doFetch, seen } = solon(null);
    await readLaw({
      act: "OR",
      provision: "270b",
      lang: "de",
      day: "2026-10-23",
      country: "CH",
      fetchImpl: doFetch,
    });
    expect(seen.some((u) => u.includes("sparqlendpoint"))).toBe(true);
  });
});
