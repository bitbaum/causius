import { describe, expect, it } from "vitest";
import { srNumber } from "./acts";
import { articleId, extractArticle, readFederalArticle } from "./fedlex";

// The shape of Fedlex's consolidated HTML (OR, 2026-10-01), cut down, with a footnote added.
const PAGE = `<section><article id="art_270_a"><h6 class="heading"><a href="#art_270_a"><b>Art. 270</b><i>a</i></a></h6><div class="collapseable"><p class="absatz">x</p></div></article>
<article id="art_270_b"><a name="a270b"></a><h6 class="heading" role="heading"><span class="display-icon"></span><a href="#art_270_b"><b>Art. 270</b><i>b</i></a></h6><div class="collapseable"><p class="absatz man-space-before-4"><sup>1</sup>&nbsp;Der Mieter kann eine Mietzinserhöhung innert 30 Tagen<sup><a href="#fn-d6e1">12</a></sup> anfechten.</p><p class="absatz"><sup>2</sup>&nbsp;Absatz 1 gilt auch, wenn der Vermieter sonstwie den Mietvertrag &amp; die Nebenkosten ändert.</p></div></article></section>`;

describe("reading an article out of Fedlex's page", () => {
  it("names articles the way Fedlex's ids do", () => {
    expect(articleId("270b")).toBe("art_270_b");
    expect(articleId("Art. 6a")).toBe("art_6_a");
    expect(articleId("4bis")).toBe("art_4_bis");
    expect(articleId("41")).toBe("art_41");
    expect(articleId("two hundred")).toBeNull();
  });

  it("keeps paragraph numbers, drops footnote markers and markup", () => {
    expect(extractArticle(PAGE, "art_270_b")).toEqual({
      heading: "Art. 270b",
      text: "1 Der Mieter kann eine Mietzinserhöhung innert 30 Tagen anfechten.\n2 Absatz 1 gilt auch, wenn der Vermieter sonstwie den Mietvertrag & die Nebenkosten ändert.",
    });
    expect(extractArticle(PAGE, "art_270")).toBeNull();
  });

  it("resolves acts by any official abbreviation or by number", () => {
    expect(srNumber("OR")).toBe("220");
    expect(srNumber("co")).toBe("220");
    expect(srNumber("SchKG")).toBe("281.1");
    expect(srNumber("SR 642.11")).toBe("642.11");
    expect(srNumber("RS 220")).toBe("220");
    expect(srNumber("Mietrecht")).toBeNull();
  });
});

describe("readFederalArticle", () => {
  const fake = (sparql: unknown, page = PAGE, ok = true): typeof fetch =>
    (async (url: string | URL | Request) =>
      String(url).includes("sparqlendpoint")
        ? Response.json(sparql, { status: ok ? 200 : 503 })
        : new Response(page)) as typeof fetch;
  const one = {
    results: {
      bindings: [
        {
          cc: { value: "https://fedlex.data.admin.ch/eli/cc/27/317_321_377" },
          url: { value: "https://fedlex.data.admin.ch/filestore/x-test-1.html" },
          date: { value: "2026-10-01" },
        },
      ],
    },
  };

  it("returns the text in force, with the link a person opens", async () => {
    const r = await readFederalArticle({ sr: "220", article: "270b", lang: "de", day: "2026-10-22", fetchImpl: fake(one) });
    expect(r).toMatchObject({
      ok: true,
      article: {
        heading: "Art. 270b",
        url: "https://www.fedlex.admin.ch/eli/cc/27/317_321_377/de#art_270_b",
        inForceSince: "2026-10-01",
      },
    });
  });

  it("tells an unknown act, a missing article and an outage apart", async () => {
    const none = { results: { bindings: [] } };
    expect(await readFederalArticle({ sr: "999.9", article: "1", lang: "de", day: "2026-10-23", fetchImpl: fake(none) })).toEqual({ ok: false, reason: "no_such_act" });
    expect(await readFederalArticle({ sr: "220", article: "999z", lang: "de", day: "2026-10-22", fetchImpl: fake(one) })).toEqual({ ok: false, reason: "no_such_article" });
    expect(await readFederalArticle({ sr: "221", article: "1", lang: "fr", day: "2026-10-24", fetchImpl: fake(one, PAGE, false) })).toEqual({ ok: false, reason: "unreachable" });
  });
});
