import { describe, expect, it } from "vitest";
import { readLaw } from ".";
import { extractProvision, liActId, provisionAnchors, readLiechtensteinProvision } from "./lilex";

// The shape of a Lilex page (ABGB), cut down: a §, then the tenancy articles nested under it.
const PAGE = `<div class="art"><a name="par:1090"></a>&sect; 1090<a href="#fn552" name="fr552" ><sup>552</sup ></a><div class="abs">F&uuml;r Bestandvertr&auml;ge gelten folgende Bestimmungen:</div></div>
<div class="tit3m">1. Abschnitt</div><div class="tit3"><a name="vorart:1;tit3:1"></a>Mietvertrag</div>
<div class="sacht" style="margin-top:23pt"><a name="vorart:1;sacht:1"></a>A. Begriff</div>
<div class="art"><a name="art:12"></a>Art. 12<div class="sacht">3. Zahlungstermine</div><div class="abs">1) Der Mieter muss den Mietzins am Ende jedes Monats bezahlen.</div><div class="abs">2) Abweichende Vereinbarungen bleiben vorbehalten.</div></div>
<div class="art"><a name="art:12a"></a>Art. 12a<div class="abs">x</div></div>`;

describe("reading Liechtenstein law from gesetze.li", () => {
  it("names provisions the way Lilex anchors them", () => {
    expect(provisionAnchors("§ 1090")).toEqual(["par:1090"]);
    expect(provisionAnchors("Art. 12a")).toEqual(["art:12a"]);
    expect(provisionAnchors("12")).toEqual(["art:12", "par:12"]);
    expect(provisionAnchors("twelve")).toEqual([]);
    expect(liActId("abgb")).toBe("1003001000");
    expect(liActId("OR")).toBeNull();
  });

  it("cuts one provision out, ending at the next provision or heading", () => {
    expect(extractProvision(PAGE, "par:1090")).toEqual({ heading: "§ 1090", text: "Für Bestandverträge gelten folgende Bestimmungen:" });
    expect(extractProvision(PAGE, "art:12")).toEqual({
      heading: "Art. 12",
      text: "3. Zahlungstermine\n1) Der Mieter muss den Mietzins am Ende jedes Monats bezahlen.\n2) Abweichende Vereinbarungen bleiben vorbehalten.",
    });
    expect(extractProvision(PAGE, "art:13")).toBeNull();
  });

  it("never reads the proof-of-work page as law", async () => {
    let calls = 0;
    const challenge = (async () => {
      calls++;
      return new Response("<html><script>function SHA256_init(){}</script></html>");
    }) as typeof fetch;
    expect(await readLiechtensteinProvision({ act: "PGR", provision: "1", fetchImpl: challenge, retryMs: 1 })).toEqual({
      ok: false,
      reason: "unreachable",
    });
    expect(calls).toBe(2);
  });

  it("links to the provision itself", async () => {
    const page = (async () => new Response(PAGE)) as typeof fetch;
    const r = await readLiechtensteinProvision({ act: "ABGB", provision: "Art. 12", fetchImpl: page });
    expect(r).toMatchObject({ ok: true, article: { url: "https://www.gesetze.li/konso/html/1003001000#art:12" } });
  });
});

describe("one read_law for both countries", () => {
  it("reads an act both countries have from the matter's own, and knows which acts are whose", async () => {
    const seen: string[] = [];
    const tap = (async (url: string | URL | Request) => {
      seen.push(String(url));
      return new Response(String(url).includes("gesetze.li") ? '<div class="art"><a name="par:1"></a>&sect; 1<div class="abs">Keine Strafe ohne Gesetz.</div></div>' : "{}");
    }) as typeof fetch;
    const li = await readLaw({ act: "StGB", provision: "§ 1", lang: "de", day: "2026-10-22", country: "LI", fetchImpl: tap });
    expect(li).toMatchObject({ collection: "gesetze.li", result: { ok: true } });
    // Solon is asked first and, holding nothing here, the publisher answers.
    expect(seen.filter((u) => !u.includes("solon.orangecat.ch")).every((u) => u.includes("gesetze.li"))).toBe(true);
    expect(await readLaw({ act: "Mietrecht", provision: "1", lang: "de", day: "2026-10-22", fetchImpl: tap })).toEqual({ unknown: true });
  });
});
