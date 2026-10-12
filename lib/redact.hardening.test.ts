import { describe, expect, it } from "vitest";
import {
  applyRedactions,
  assignTokens,
  findPersonalData,
  restore,
} from "./redact";

/**
 * What the 2026-10-12 audit found leaking, one case each. Every input is
 * invented; the shapes are the ones real letters arrive in.
 */
const kinds = (text: string, own?: string[]) =>
  Object.fromEntries(findPersonalData(text, own).map((r) => [r.value, r.kind]));
const hidden = (text: string) =>
  applyRedactions(text, assignTokens(findPersonalData(text)));

describe("names in the shapes letters really use", () => {
  it("takes the whole name after an academic title, not the title", () => {
    const f = kinds("Sehr geehrter Herr Dr. Hans Muster");
    expect(f["Hans Muster"]).toBe("NAME");
    expect(f["Dr"]).toBeUndefined();
    expect(hidden("Sehr geehrter Herr Dr. Hans Muster")).not.toContain("Hans");
  });

  it("takes a name written with an initial", () => {
    const f = kinds("Frau E. Muster\nPostfach 123\n8000 Zürich");
    expect(f["E. Muster"]).toBe("NAME");
    expect(hidden("Frau E. Muster\nPostfach 123\n8000 Zürich")).not.toContain(
      "Muster",
    );
  });

  it("takes an all-capitals letterhead", () => {
    const letter = "HERR HANS MUSTER\nMUSTERSTRASSE 5\n8000 ZÜRICH";
    const f = kinds(letter);
    expect(f["HANS MUSTER"]).toBe("NAME");
    expect(f["MUSTERSTRASSE 5"]).toBe("ADDRESS");
    expect(hidden(letter)).not.toMatch(/MUSTER/);
  });

  it("takes a bare name written above the street, with no title", () => {
    const letter =
      "Erika Muster\nMusterstrasse 5\n8000 Zürich\n\nBetreff: Steuern";
    expect(kinds(letter)["Erika Muster"]).toBe("NAME");
  });

  it("takes the signer's name after the closing, but not the authority under it", () => {
    const letter =
      "Freundliche Grüsse\nHans Beispiel\nKantonales Steueramt Zürich";
    const f = kinds(letter);
    expect(f["Hans Beispiel"]).toBe("NAME");
    expect(Object.keys(f).join("|")).not.toContain("Steueramt");
  });

  it("hides the possessive of a name it knows", () => {
    const r = assignTokens([
      { value: "Erika Muster", kind: "NAME" },
      { value: "Muster", kind: "NAME" },
      { value: "Erika", kind: "NAME" },
    ]);
    expect(applyRedactions("Musters Sohn und Erikas Konto", r)).not.toMatch(
      /Muster|Erika/,
    );
  });

  it("matches a name typed with combining accents or a soft hyphen", () => {
    const decomposed = "Sehr geehrter Herr Müller";
    expect(kinds(decomposed)["Müller"]).toBe("NAME");
    expect(hidden(decomposed)).not.toMatch(/ller/);
    expect(hidden("Sehr geehrte Frau Mus­ter")).not.toMatch(/ter\b/);
  });
});

describe("addresses and numbers in more formats", () => {
  it("finds a French street written number first", () => {
    expect(
      kinds("Frau Dupont\n12 rue de la Gare\n1003 Lausanne")[
        "12 rue de la Gare"
      ],
    ).toBe("ADDRESS");
  });

  it("finds a post office box", () => {
    expect(kinds("Postfach 123")["Postfach 123"]).toBe("ADDRESS");
  });

  it("finds phone numbers without separators, French style, and with non-breaking spaces", () => {
    expect(kinds("Tel 0791234567")["0791234567"]).toBe("PHONE");
    expect(kinds("Tél. 01 23 45 67 89")["01 23 45 67 89"]).toBe("PHONE");
    expect(Object.values(kinds("+41 44 123 45 67"))).toContain("PHONE");
  });

  it("finds an IBAN with non-breaking spaces and in lower case", () => {
    expect(Object.values(kinds("CH93 0076 2011 6238 5295 7"))).toContain(
      "IBAN",
    );
    expect(Object.values(kinds("iban ch93 0076 2011 6238 5295 7"))).toContain(
      "IBAN",
    );
  });

  it("finds a date of birth written after the date", () => {
    expect(kinds("Frau Muster, am 01.02.1980 geboren")["01.02.1980"]).toBe(
      "BIRTHDATE",
    );
  });

  it("finds a case number with letters inside it", () => {
    expect(kinds("Aktenzeichen: B-2024/0815-X")["B-2024/0815-X"]).toBe("REF");
  });

  it("does not hide what the analysis needs: dates, amounts, the authority", () => {
    const letter =
      "Kantonales Steueramt Zürich\n30. Oktober 2026\nBetrag CHF 1'234.50\nEinsprache innert 30 Tagen";
    expect(Object.keys(kinds(letter))).toEqual([]);
  });
});

describe("placeholders cannot be corrupted", () => {
  it("never rewrites the inside of a placeholder", () => {
    const r = assignTokens([
      { value: "NAME", kind: "NAME" },
      { value: "12", kind: "REF" },
    ]);
    expect(applyRedactions("[NAME-2] sagt 12 und NAME", r)).toBe(
      "[NAME-2] sagt [REF-1] und [NAME-1]",
    );
  });

  it("still restores the letter it hid", () => {
    const letter =
      "Frau E. Muster\nMusterstrasse 5\n8000 Zürich\nTel 0791234567";
    const r = assignTokens(findPersonalData(letter));
    expect(restore(applyRedactions(letter, r), r)).toBe(letter);
  });
});

describe("cost stays linear", () => {
  // A hostile or merely odd paste must not stall the server: the matter agent
  // runs this on every turn, on the main thread.
  const SHAPES: Record<string, string> = {
    capitals: "A".repeat(100_000),
    "lower case": "a".repeat(100_000),
    digits: "1".repeat(100_000),
    spaces: " ".repeat(100_000),
    words: "wort ".repeat(20_000),
    Words: "Wort ".repeat(20_000),
    hyphens: "A-".repeat(50_000),
    "digit groups": "12 ".repeat(33_000),
    dots: ".1".repeat(50_000),
    newlines: "\n".repeat(100_000),
    "at signs": "a@".repeat(50_000),
    "email-like": "a@a.".repeat(25_000),
    titles: "Herr ".repeat(20_000),
    streets: "Rue ".repeat(25_000),
    "title and caps": "Herr " + "AB ".repeat(30_000),
    "iban-like": "CH93 ".repeat(20_000),
    "phone-like": "+41 ".repeat(25_000),
    labels: "Ref ".repeat(25_000),
  };
  for (const [name, input] of Object.entries(SHAPES)) {
    it(`handles 100 000 characters of ${name} quickly`, () => {
      const started = performance.now();
      findPersonalData(input);
      expect(performance.now() - started).toBeLessThan(400);
    });
  }
});
