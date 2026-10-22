import { describe, expect, it } from "vitest";
import { cleanPdfText, extractCantonalProvision, findCantonalAct } from "./lexfind";

// Zürich's StG as unpdf reads it: margin notes run into headings, a header and a page number per page.
const header = "Steuergesetz (StG) 631.1";
const ZH = [
  "Steuergesetz (StG)44",
  "I. Steuerarten§ 1. Der Kanton erhebt als Staatssteuern jährlich:",
  "a. Einkommens- und Vermögenssteuern von natürlichen Personen,",
  "II. Steuerfuss§ 2. 1 Die aufgrund der in diesem Gesetz festgelegten Steuersätze",
  ...Array.from({ length: 9 }, (_, i) => [header, String(60 + i)]).flat(),
  "III. Einsprache § 140. 1 Gegen den Einschätzungsentscheid können der Steuer-",
  "pflichtige und die Gemeinde innert 30 Tagen nach Zustellung beim",
  "kantonalen Steueramt schriftlich Einsprache erheben. Vorbehalten bleibt § 141 Abs. 2.",
  "2 Eine Einschätzung nach pflichtgemässem Ermessen kann der Steuerpflichtige anfechten.",
  "2. Einsprache-",
  "verfahren",
  "§ 141. 1 Im Einspracheverfahren hat das kantonale Steueramt die gleichen Befugnisse.",
  "Übergangsbestimmungen § 1. 1 Die bisherigen Mitglieder bleiben im Amt.",
].join("\n");

describe("cantonal text from a PDF", () => {
  const text = cleanPdfText(ZH);

  it("drops page headers and numbers, and rejoins hyphenated words", () => {
    expect(text).not.toContain(header);
    expect(text).not.toMatch(/^6\d$/m);
    expect(text).toContain("Steuerpflichtige und die Gemeinde");
    expect(text).toContain("Einkommens- und Vermögenssteuern");
  });

  it("cuts out one §, stopping at the next heading but not at a reference", () => {
    const p = extractCantonalProvision(text, "§ 140")!;
    expect(p).toMatch(/^§ 140\. 1 Gegen den Einschätzungsentscheid/);
    expect(p).toContain("Vorbehalten bleibt § 141 Abs. 2.");
    expect(p).toContain("2 Eine Einschätzung");
    expect(p).not.toContain("Im Einspracheverfahren");
  });

  it("finds a heading a margin note runs into, and the first § 1, not the transitional one", () => {
    expect(extractCantonalProvision(text, "1")).toMatch(/^§ 1\. Der Kanton erhebt/);
    expect(extractCantonalProvision(text, "§ 999")).toBeNull();
  });
});

describe("finding a cantonal act on LexFind", () => {
  const lexfind = (hits: unknown[]): typeof fetch =>
    (async (url: string | URL | Request, init?: RequestInit) => {
      const u = String(url);
      if (u.endsWith("/entities")) return Response.json([{ id: 26, abbreviation: "ZH" }]);
      if (init?.method === "POST") return Response.json({ id: 1, session_id: "s" });
      return Response.json({ texts_of_law_with_matches: hits });
    }) as typeof fetch;
  const hit = (id: number, title: string, keywords: string, number: string) => ({
    id,
    systematic_number: number,
    is_active: true,
    dta_urls: [{ language: "de", url: `/tol/${id}/de`, original_url: `https://www.zh.ch/${number}` }],
    matches: [{ title, keywords, is_active: true, version_active_since: "01.01.2026", category: { name: "Gesetz" } }],
  });

  it("prefers the act whose abbreviation is the one asked for", async () => {
    const act = await findCantonalAct("ZH", "StG", "de", lexfind([hit(2, "Strassengesetz", "StrG", "722.1"), hit(1, "Steuergesetz", "StG", "631.1")]));
    expect(act).toMatchObject({ title: "Steuergesetz", number: "631.1", official: "https://www.zh.ch/631.1", pdf: "https://www.lexfind.ch/tol/1/de" });
  });

  it("answers null for an act that is nobody's abbreviation, number or title", async () => {
    expect(await findCantonalAct("ZH", "Mietrecht", "de", lexfind([hit(3, "Gesetz über das Mietwesen", "MWG", "1.1")]))).toBeNull();
  });
});
